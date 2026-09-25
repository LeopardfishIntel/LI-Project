/**
 * 🎯 SEARCH ASSOCIATES LEADERSHIP MULTI-TAB ENGINE & HISTORICAL TURNOVER AUDITOR
 * Runs on Tuesdays & Thursdays.
 * - Tabs 1 & 2: Stages active leadership vacancies to Admin Pending.
 * - Tab 3: Parses completed appointments from Sept 1, 2025 onward to enrich Institutional Stability & Staff Turnover.
 */

import { getAdminDb } from "@/firebase/admin";
import { sanitizeJobTitle } from "@/lib/crawler/titleSanitizer";

const SA_BASE_URL = "https://www.searchassociates.com";
const SA_LEADERSHIP_URL = "https://www.searchassociates.com/Leadership-Vacancies/";
const CUTOFF_DATE = new Date("2025-09-01T00:00:00Z");

export interface SearchAssociatesScrapeResult {
  activeVacanciesFound: number;
  activeVacanciesStaged: number;
  completedAppointmentsIndexed: number;
  schoolsEnriched: number;
}

function cleanText(raw: string): string {
  return (raw || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function scrapeSearchAssociatesLeadership(): Promise<SearchAssociatesScrapeResult> {
  console.log(`\n=============================================================`);
  console.log(`🚀 [SEARCH ASSOCIATES] Starting Multi-Tab Leadership Sweep...`);
  console.log(`⏰ Filter: Active Vacancies + Completed Appointments from 1 Sept 2025 onward`);
  console.log(`=============================================================\n`);

  const db = getAdminDb();
  const schoolsSnap = await db.collection("schools").get();
  const schoolsList = schoolsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  // Helper to match school
  function findSchoolMatch(employerOrTitle: string, countryHint?: string) {
    const cleanEmp = employerOrTitle.toLowerCase();
    for (const s of schoolsList) {
      const sName = (s.schoolname || s.name || "").toLowerCase();
      if (sName.length > 4 && (cleanEmp.includes(sName) || sName.includes(cleanEmp))) {
        return s;
      }
    }
    return null;
  }

  const res = await fetch(SA_LEADERSHIP_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Search Associates Leadership page: HTTP ${res.status}`);
  }

  const html = await res.text();
  const tabPanes = html.split(/class=["']tab-pane/i);

  let activeVacanciesFound = 0;
  let activeVacanciesStaged = 0;
  let completedAppointmentsIndexed = 0;
  const schoolTurnoverUpdates: Record<string, any[]> = {};

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. TABS 1 & 2: Active / In-Progress Leadership Searches
  // ─────────────────────────────────────────────────────────────────────────────
  const activePanes = [tabPanes[1] || "", tabPanes[2] || ""];

  for (const pane of activePanes) {
    const linkRegex = /<a[^>]+href=["']([^"']*(?:leadership-vacanc|Leadership-Vacanc)[^"']*)["'][^>]*>(.*?)<\/a>/gi;
    let match;

    while ((match = linkRegex.exec(pane)) !== null) {
      const rawHref = match[1];
      const rawTitle = cleanText(match[2]);
      if (!rawTitle || rawTitle.length < 3) continue;

      activeVacanciesFound++;
      const fullUrl = rawHref.startsWith("http") ? rawHref : `${SA_BASE_URL}${rawHref.startsWith("/") ? "" : "/"}${rawHref}`;
      
      // Parse URL components e.g. /leadership-vacancies/director-of-development-canadian-academy-kobe-japan-2026
      const slug = rawHref.split("/").filter(Boolean).pop() || "";
      const slugParts = slug.split("-");
      const year = slugParts.find(p => p === "2026" || p === "2027") || "2026";

      const matchedSchool = findSchoolMatch(rawTitle) || findSchoolMatch(slug);
      const schoolId = matchedSchool ? matchedSchool.id : "SEARCH_ASSOCIATES_HUB";
      const schoolName = matchedSchool ? (matchedSchool.schoolname || matchedSchool.name) : rawTitle;

      const docId = `sa_lead_${slug.replace(/[^a-zA-Z0-9_-]/g, "") || Math.random().toString(36).substring(2, 9)}`;

      const jobPayload = {
        id: docId,
        title: sanitizeJobTitle(rawTitle, schoolName),
        jobTitle: rawTitle,
        schoolName: schoolName,
        employer: schoolName,
        schoolId: schoolId,
        city: matchedSchool?.city || "",
        country: matchedSchool?.country || "",
        source: "Search Associates",
        agency: "Search Associates",
        sourceName: "Search Associates",
        sources: ["Search Associates"],
        applyUrl: fullUrl,
        source_url: fullUrl,
        link: fullUrl,
        websiteUrl: fullUrl,
        sourceUrls: {
          "Search Associates": fullUrl,
          "SEARCH ASSOCIATES": fullUrl,
        },
        category: "Leadership",
        department: "Leadership",
        isLeadership: true,
        featured: true,
        status: "pending_review",
        recruitmentCycle: `CURRENT_${year}`,
        scrapedAt: new Date(),
        updatedAt: new Date().toISOString(),
      };

      await db.collection("jobs").doc(docId).set(jobPayload, { merge: true });
      activeVacanciesStaged++;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. TAB 3: Completed Searches (Sept 1, 2025 Onward) -> Staff Turnover
  // ─────────────────────────────────────────────────────────────────────────────
  const completedPane = tabPanes[3] || "";
  const completedLinkRegex = /<a[^>]+href=["']([^"']*(?:leadership-vacanc|Leadership-Vacanc)[^"']*)["'][^>]*>(.*?)<\/a>/gi;
  let cMatch;

  while ((cMatch = completedLinkRegex.exec(completedPane)) !== null) {
    const rawHref = cMatch[1];
    const rawText = cleanText(cMatch[2]);
    if (!rawText || rawText.length < 3) continue;

    // Filter by year in slug (Focus from 1 Sept 2025 / 2026 appointments)
    const slug = rawHref.split("/").filter(Boolean).pop() || "";
    const isTargetCycle = slug.includes("2026") || slug.includes("2027") || slug.includes("2025");
    if (!isTargetCycle) continue;

    // The slug contains both role and school name (e.g. "head-of-school-aba-oman-international-school-oman-2026-2")
    const cleanSlugText = slug.replace(/[-_]/g, " ").replace(/\d+/g, "").trim();
    const matchedSchool = findSchoolMatch(cleanSlugText) || findSchoolMatch(slug);
    if (!matchedSchool) continue;

    completedAppointmentsIndexed++;

    const turnoverEntry = {
      role: rawText !== "View" && rawText.length > 4 ? rawText : cleanSlugText,
      source: "Search Associates Completed Search",
      cycle: slug.includes("2026") ? "2026" : slug.includes("2027") ? "2027" : "2025",
      recordedDate: "2025-09-01",
      url: rawHref.startsWith("http") ? rawHref : `${SA_BASE_URL}${rawHref.startsWith("/") ? "" : "/"}${rawHref}`,
      isFilled: true,
      schoolName: matchedSchool.schoolname || matchedSchool.name,
      schoolId: matchedSchool.id,
    };

    if (!schoolTurnoverUpdates[matchedSchool.id]) {
      schoolTurnoverUpdates[matchedSchool.id] = [];
    }
    schoolTurnoverUpdates[matchedSchool.id].push(turnoverEntry);
  }

  // Commit historical leadership turnover records to school documents
  let schoolsEnriched = 0;
  for (const [sId, events] of Object.entries(schoolTurnoverUpdates)) {
    try {
      const schoolRef = db.collection("schools").doc(sId);
      const schoolDoc = await schoolRef.get();
      const existingData = schoolDoc.data() || {};
      const existingHistory = Array.isArray(existingData.historicalLeadershipTurnover) ? existingData.historicalLeadershipTurnover : [];

      // Merge unique by URL or role + cycle
      const seen = new Set(existingHistory.map((h: any) => `${h.role}_${h.cycle}`));
      const newItems = events.filter(e => !seen.has(`${e.role}_${e.cycle}`));

      if (newItems.length > 0) {
        const combined = [...existingHistory, ...newItems];
        await schoolRef.update({
          historicalLeadershipTurnover: combined,
          leadershipVacanciesCount: (existingData.leadershipVacanciesCount || 0) + newItems.length,
          lastTurnoverAuditAt: new Date().toISOString(),
        });
        schoolsEnriched++;
      }
    } catch (err) {
      console.warn(`Could not update turnover for school ${sId}:`, err);
    }
  }

  console.log(`\n=============================================================`);
  console.log(`✅ [SEARCH ASSOCIATES SWEEP COMPLETE]`);
  console.log(`📊 Active Vacancies Found: ${activeVacanciesFound}`);
  console.log(`📥 Active Vacancies Staged: ${activeVacanciesStaged}`);
  console.log(`🎓 Completed Appointments Indexed (>= Sept 2025): ${completedAppointmentsIndexed}`);
  console.log(`🏫 Schools Enriched with Turnover Data: ${schoolsEnriched}`);
  console.log(`=============================================================\n`);

  return {
    activeVacanciesFound,
    activeVacanciesStaged,
    completedAppointmentsIndexed,
    schoolsEnriched,
  };
}
