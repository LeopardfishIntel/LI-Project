/**
 * 🎯 SEARCH ASSOCIATES LEADERSHIP MULTI-TAB ENGINE & DEEP DOM AUDITOR
 * Runs on Tuesdays & Thursdays.
 * - Deep-fetches each individual leadership page to extract:
 *    1. Exact H1 Title, School Name, and Location
 *    2. Exact "Position Posted" & "Deadline" dates
 *    3. Direct Candidate Pack PDF links (e.g. cdn.searchassociates.com/...pdf)
 * - Automatically routes past-deadline vacancies into school staff turnover (historicalLeadershipTurnover).
 * - Stages/approves active future-deadline vacancies with direct PDF apply links.
 */

import { getAdminDb } from "@/firebase/admin";
import { sanitizeJobTitle } from "@/lib/crawler/titleSanitizer";

const SA_BASE_URL = "https://www.searchassociates.com";
const SA_LEADERSHIP_URL = "https://www.searchassociates.com/Leadership-Vacancies/";

function cleanText(raw: string): string {
  return (raw || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function norm(str: string) {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

export interface SearchAssociatesScrapeResult {
  activeVacanciesFound: number;
  activeVacanciesLive: number;
  expiredTurnoverAppended: number;
}

export async function scrapeSearchAssociatesLeadership(): Promise<SearchAssociatesScrapeResult> {
  console.log(`\n=============================================================`);
  console.log(`🚀 [SEARCH ASSOCIATES] Starting Deep DOM Multi-Tab Leadership Sweep...`);
  console.log(`⏰ Extraction: Deep Page Traversal + Deadline Verification + PDF Packs`);
  console.log(`=============================================================\n`);

  const db = getAdminDb();
  const schoolsSnap = await db.collection("schools").get();
  const schoolsList = schoolsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  function findSchoolMatch(text: string): any {
    const nText = norm(text);
    if (!nText) return null;

    // Specific aliases
    if (nText.includes("unis") || nText.includes("united nations international school of hanoi")) {
      return schoolsList.find((s: any) => s.id === "FLIS0129");
    }
    if (nText.includes("international school of prague") || nText.includes("is prague")) {
      return schoolsList.find((s: any) => s.id === "FLIS0049");
    }
    if (nText.includes("graded")) {
      return schoolsList.find((s: any) => s.id === "FLIS0184");
    }
    if (nText.includes("american international school of zagreb") || nText.includes("aisz")) {
      return schoolsList.find((s: any) => s.id === "FLIS0281");
    }

    for (const s of schoolsList) {
      const sName = norm(s.schoolname || s.name || "");
      if (sName.length > 3 && (nText.includes(sName) || sName.includes(nText))) {
        return s;
      }
      if (s.aliases && Array.isArray(s.aliases)) {
        if (s.aliases.some((a: string) => norm(a).length > 3 && nText.includes(norm(a)))) {
          return s;
        }
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
  let activeVacanciesLive = 0;
  let expiredTurnoverAppended = 0;
  const schoolTurnoverUpdates: Record<string, any[]> = {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  // Tabs 1 & 2: Active & In-Progress Leadership Searches
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
      const slug = rawHref.split("/").filter(Boolean).pop() || "";
      const docId = `sa_lead_${slug.replace(/[^a-zA-Z0-9_-]/g, "") || Math.random().toString(36).substring(2, 9)}`;

      try {
        // Deep DOM Page Inspection
        const pageRes = await fetch(fullUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });

        if (!pageRes.ok) continue;

        const pageHtml = await pageRes.text();
        const h1Match = pageHtml.match(/<h1>([\s\S]*?)<\/h1>/i);
        const h1Raw = h1Match ? h1Match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : rawTitle;

        const postedMatch = pageHtml.match(/Position Posted<\/label>\s*<b>([^<]+)<\/b>/i);
        const deadlineMatch = pageHtml.match(/Deadline<\/label>\s*<b>([^<]+)<\/b>/i);

        const postedDateStr = postedMatch ? cleanText(postedMatch[1]) : "";
        const deadlineStr = deadlineMatch ? cleanText(deadlineMatch[1]) : "Rolling";

        let deadlineMs: number | null = null;
        if (deadlineStr && deadlineStr !== "Rolling" && deadlineStr !== "Open") {
          const parsed = Date.parse(deadlineStr);
          if (!isNaN(parsed)) {
            deadlineMs = parsed;
          }
        }

        const pdfMatch = pageHtml.match(/href=["']([^"']*\.pdf[^"']*)["']/i);
        let pdfUrl: string | null = null;
        if (pdfMatch) {
          let rawPdf = pdfMatch[1];
          if (rawPdf.startsWith("//")) rawPdf = `https:${rawPdf}`;
          else if (rawPdf.startsWith("/")) rawPdf = `${SA_BASE_URL}${rawPdf}`;
          pdfUrl = rawPdf;
        }

        const matchedSchool = findSchoolMatch(h1Raw) || findSchoolMatch(slug);
        const isFlisSchool = Boolean(matchedSchool);
        const schoolId = matchedSchool ? matchedSchool.id : "SEARCH_ASSOCIATES_HUB";
        const schoolName = matchedSchool ? (matchedSchool.schoolname || matchedSchool.name) : (h1Raw.split("(")[0] || rawTitle);

        const isExpired = deadlineMs !== null && deadlineMs < todayMs;
        const cleanRoleTitle = sanitizeJobTitle(rawTitle);

        const jobRecord = {
          id: docId,
          title: cleanRoleTitle,
          schoolId,
          schoolName,
          city: matchedSchool ? matchedSchool.city : "",
          country: matchedSchool ? matchedSchool.country : "",
          closingDate: deadlineStr,
          closingDateMillis: deadlineMs,
          datePosted: postedDateStr,
          applyUrl: pdfUrl || fullUrl,
          pdfUrl,
          source: "Search Associates",
          sourceType: "search_associates",
          status: isExpired ? "EXPIRED" : (isFlisSchool ? "APPROVED" : "pending_review"),
          updatedAt: new Date().toISOString(),
        };

        const jobDocRef = db.collection("jobs").doc(docId);
        const cacheDocRef = db.collection("featured_jobs_cache").doc(docId);

        if (isExpired) {
          expiredTurnoverAppended++;
          await jobDocRef.set({ ...jobRecord, status: "expired" }, { merge: true });
          await cacheDocRef.set({ ...jobRecord, status: "EXPIRED" }, { merge: true });

          if (matchedSchool) {
            if (!schoolTurnoverUpdates[matchedSchool.id]) {
              schoolTurnoverUpdates[matchedSchool.id] = [];
            }
            schoolTurnoverUpdates[matchedSchool.id].push({
              role: cleanRoleTitle,
              appointedYear: "2026",
              cycle: "2025-2026",
              source: "Search Associates Leadership",
              recordedAt: new Date().toISOString(),
              status: "closed_search",
            });
          }
        } else if (isFlisSchool) {
          activeVacanciesLive++;
          await jobDocRef.set({ ...jobRecord, status: "approved" }, { merge: true });
          await cacheDocRef.set({ ...jobRecord, status: "APPROVED" }, { merge: true });
        } else {
          // Unindexed school kept in staging
          await jobDocRef.set({ ...jobRecord, status: "pending_review" }, { merge: true });
        }
      } catch (e) {
        console.warn(`⚠️ Failed to parse details for ${slug}:`, e);
      }
    }
  }

  // Update School Turnover counts
  for (const [schoolId, newTurnovers] of Object.entries(schoolTurnoverUpdates)) {
    const schoolRef = db.collection("schools").doc(schoolId);
    const sDoc = schoolsList.find((s: any) => s.id === schoolId);
    const existing = sDoc?.historicalLeadershipTurnover || [];

    const combined = [...existing];
    for (const item of newTurnovers) {
      const exists = combined.some(
        (e: any) => e.role?.toLowerCase() === item.role?.toLowerCase() && e.appointedYear === item.appointedYear
      );
      if (!exists) {
        combined.push(item);
      }
    }

    await schoolRef.set({
      historicalLeadershipTurnover: combined,
      leadershipVacanciesCount: combined.length,
    }, { merge: true });
  }

  console.log(`\n=============================================================`);
  console.log(`✅ [SEARCH ASSOCIATES] Deep Sweep Completed:`);
  console.log(`   • Active Live Vacancies: ${activeVacanciesLive}`);
  console.log(`   • Closed/Expired Posts Appended to Turnover: ${expiredTurnoverAppended}`);
  console.log(`=============================================================\n`);

  return {
    activeVacanciesFound,
    activeVacanciesLive,
    expiredTurnoverAppended,
  };
}
