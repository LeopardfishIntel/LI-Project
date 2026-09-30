import { getAdminDb } from "../firebase/admin";
import * as fs from "fs";
import * as path from "path";

interface AuditResult {
  docPath: string;
  docId: string;
  pathSchoolId: string;
  pathSchoolName?: string | null;
  storedSchoolId?: string | null;
  storedSchoolName?: string | null;
  type: string;
  reason: string;
  title?: string;
  url?: string | null;
  status?: string;
  matchedOtherSchoolId?: string;
  matchedOtherSchoolName?: string;
}

function getTokens(str: string): string[] {
  return str.toLowerCase().replace(/[^a-z0-9]/g, " ").split(/\s+/).filter((w) => w.length >= 3);
}

function slugMatchesSchoolTokens(slug: string, schoolName: string): boolean {
  const nameTokens = getTokens(schoolName);
  if (nameTokens.length === 0) return false;
  const sSet = new Set(getTokens(slug));
  return nameTokens.every((t) => sSet.has(t));
}

async function auditSubcollectionProvenances() {
  const db = getAdminDb();
  console.log("Loading schools...");
  const schoolsSnap = await db.collection("schools").get();
  const schoolMap = new Map<string, any>();

  schoolsSnap.docs.forEach((d: any) => {
    const s = d.data();
    schoolMap.set(d.id.toUpperCase(), {
      id: d.id,
      name: s.name || s.schoolname || s.schoolName || "",
      tesEmployerSlug: s.tesEmployerSlug || null,
      tesOrganizationId: s.tesOrganizationId || null,
      website: s.website || "",
      careersUrl: s.careersPageUrl || s.careersUrl || "",
    });
  });
  console.log(`Loaded ${schoolMap.size} schools.`);

  console.log("Loading subcollection jobs from collectionGroup(jobs)...");
  const snap = await db.collectionGroup("jobs").get();
  const schoolJobs = snap.docs.filter((d: any) => d.ref.path.startsWith("schools/"));
  console.log(`Loaded ${schoolJobs.length} school subcollection jobs.`);

  console.log("Loading cache docs from featured_jobs_cache for full multi-source URL resolution...");
  const cacheSnap = await db.collection("featured_jobs_cache").get();
  const cacheMap = new Map<string, any>();
  cacheSnap.docs.forEach((d: any) => cacheMap.set(d.id, d.data()));
  console.log(`Loaded ${cacheMap.size} cache docs.`);

  const provenanceMismatches: AuditResult[] = [];

  for (const doc of schoolJobs) {
    const pathParts = doc.ref.path.split("/");
    const pathSchoolId = pathParts[1];
    const jobData = doc.data();
    const targetSchool = schoolMap.get(pathSchoolId.toUpperCase());

    // 1. Missing parent school in canonical registry
    if (!targetSchool) {
      provenanceMismatches.push({
        type: "PARENT_SCHOOL_MISSING_FROM_REGISTRY",
        reason: `School ${pathSchoolId} does not exist in canonical schools collection`,
        docPath: doc.ref.path,
        docId: doc.id,
        pathSchoolId,
        title: jobData.title,
        url: jobData.applyUrl || jobData.directUrl || null,
        status: jobData.status,
      });
      continue;
    }

    // 2. Explicit stored schoolId mismatch
    if (jobData.schoolId && jobData.schoolId.toUpperCase() !== pathSchoolId.toUpperCase()) {
      provenanceMismatches.push({
        type: "STORED_SCHOOL_ID_MISMATCH",
        reason: `Job record explicitly contains schoolId '${jobData.schoolId}' but is filed under '${pathSchoolId}'`,
        docPath: doc.ref.path,
        docId: doc.id,
        pathSchoolId,
        pathSchoolName: targetSchool.name,
        storedSchoolId: jobData.schoolId,
        storedSchoolName: jobData.schoolName || null,
        title: jobData.title,
        url: jobData.applyUrl || jobData.directUrl || null,
        status: jobData.status,
      });
      continue;
    }

    // 3. Stored tesNumber mismatch (if doc has tesNumber)
    if (jobData.tesNumber) {
      const docTesNum = String(jobData.tesNumber);
      const schoolTesOrg = targetSchool.tesOrganizationId ? String(targetSchool.tesOrganizationId) : null;
      if (schoolTesOrg && docTesNum !== schoolTesOrg) {
        provenanceMismatches.push({
          type: "TES_ORG_ID_MISMATCH",
          reason: `Job has tesNumber '${docTesNum}' but parent school has tesOrganizationId '${schoolTesOrg}'`,
          docPath: doc.ref.path,
          docId: doc.id,
          pathSchoolId,
          pathSchoolName: targetSchool.name,
          title: jobData.title,
          url: jobData.applyUrl || jobData.directUrl || null,
          status: jobData.status,
        });
        continue;
      }
    }

    // 4. Stored scraping URL provenance check across all stored URL fields & sourceUrls
    const urlCandidates: Array<{ label: string; url: string }> = [];
    const addUrl = (label: string, u: any) => {
      if (typeof u === "string" && u.trim().length > 0) {
        urlCandidates.push({ label, url: u.trim() });
      }
    };

    addUrl("applyUrl", jobData.applyUrl);
    addUrl("directUrl", jobData.directUrl);
    addUrl("url", jobData.url);
    addUrl("link", jobData.link);
    addUrl("source_url", jobData.source_url);

    if (jobData.sourceUrls && typeof jobData.sourceUrls === "object") {
      for (const [k, v] of Object.entries(jobData.sourceUrls)) {
        addUrl(`sourceUrls.${k}`, v);
      }
    }

    const cacheDoc = cacheMap.get(doc.id);
    if (cacheDoc) {
      addUrl("cache.applyUrl", cacheDoc.applyUrl);
      addUrl("cache.directUrl", cacheDoc.directUrl);
      if (cacheDoc.sourceUrls && typeof cacheDoc.sourceUrls === "object") {
        for (const [k, v] of Object.entries(cacheDoc.sourceUrls)) {
          addUrl(`cache.sourceUrls.${k}`, v);
        }
      }
    }

    let docFlagged = false;

    for (const { label, url: uStr } of urlCandidates) {
      if (docFlagged) break;

      // Check A: Synthetic domain URLs (e.g. https://www.amman-academy.com under FLIS0007 Shanghai High)
      const synthMatch = uStr.match(/https?:\/\/(?:www\.)?([a-z0-9-]+)\.com\/?$/);
      if (
        synthMatch &&
        !uStr.includes("tes.com") &&
        !uStr.includes("teachaway.com") &&
        !uStr.includes("theguardian.com") &&
        !uStr.includes("grcfair.org")
      ) {
        const slug = synthMatch[1];
        const rawSchoolName = targetSchool.name || "";
        const pName = rawSchoolName.toLowerCase().replace(/[^a-z0-9]/g, "");
        const cleanSlug = slug.replace(/[^a-z0-9]/g, "");
        const isParentContiguous = pName && (pName.includes(cleanSlug) || cleanSlug.includes(pName));
        const isParentTokenMatch = slugMatchesSchoolTokens(slug, rawSchoolName);
        if (!isParentContiguous && !isParentTokenMatch) {
          let actualSchool: any = null;
          for (const s of schoolMap.values()) {
            const sName = (s.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            if (sName && (sName.includes(cleanSlug) || cleanSlug.includes(sName))) {
              actualSchool = s;
              break;
            }
          }
          if (actualSchool && actualSchool.id.toUpperCase() !== pathSchoolId.toUpperCase()) {
            provenanceMismatches.push({
              type: "SYNTHETIC_DOMAIN_MISMATCH",
              reason: `URL domain slug '${slug}' (from ${label}) points to ${actualSchool.id} (${actualSchool.name}), not parent school ${targetSchool.name}`,
              docPath: doc.ref.path,
              docId: doc.id,
              pathSchoolId,
              pathSchoolName: targetSchool.name,
              matchedOtherSchoolId: actualSchool.id,
              matchedOtherSchoolName: actualSchool.name,
              title: jobData.title,
              url: uStr,
              status: jobData.status,
            });
            docFlagged = true;
            break;
          }
        }
      }

      // Check B: TES Vacancy URL containing another school's employer slug
      if (uStr.includes("tes.com/jobs/vacancy/")) {
        const parentSlug = targetSchool.tesEmployerSlug ? targetSchool.tesEmployerSlug.toLowerCase() : null;
        const parentSlugPrefix = parentSlug ? parentSlug.replace(/-\d+$/, "") : null;
        const matchesParent = parentSlugPrefix && parentSlugPrefix.length > 6 && uStr.toLowerCase().includes(parentSlugPrefix);

        if (!matchesParent) {
          let matchesOtherSlug: any = null;
          for (const s of schoolMap.values()) {
            if (s.id.toUpperCase() === pathSchoolId.toUpperCase()) continue;
            if (parentSlugPrefix && s.tesEmployerSlug && s.tesEmployerSlug.toLowerCase().replace(/-\d+$/, "") === parentSlugPrefix) continue;
            if (s.tesEmployerSlug && s.tesEmployerSlug.length > 5) {
              const slugPrefix = s.tesEmployerSlug.replace(/-\d+$/, "").toLowerCase();
              if (slugPrefix.length > 6 && uStr.toLowerCase().includes(slugPrefix)) {
                matchesOtherSlug = s;
                break;
              }
            }
          }
          if (matchesOtherSlug) {
            provenanceMismatches.push({
              type: "TES_URL_SLUG_MATCHES_DIFFERENT_SCHOOL",
              reason: `TES URL (from ${label}) contains employer slug for ${matchesOtherSlug.id} (${matchesOtherSlug.name}), not parent school ${targetSchool.name}`,
              docPath: doc.ref.path,
              docId: doc.id,
              pathSchoolId,
              pathSchoolName: targetSchool.name,
              matchedOtherSchoolId: matchesOtherSlug.id,
              matchedOtherSchoolName: matchesOtherSlug.name,
              title: jobData.title,
              url: uStr,
              status: jobData.status,
            });
            docFlagged = true;
            break;
          }
        }

        // Check C: Stored job has TES URL, but parent school has NO TES profile
        if (!targetSchool.tesEmployerSlug) {
          provenanceMismatches.push({
            type: "TES_JOB_UNDER_SCHOOL_WITH_NO_TES_PROFILE",
            reason: `Job was scraped from TES (from ${label}), but parent school ${targetSchool.id} (${targetSchool.name}) has no TES presence (tesEmployerSlug is null)`,
            docPath: doc.ref.path,
            docId: doc.id,
            pathSchoolId,
            pathSchoolName: targetSchool.name,
            title: jobData.title,
            url: uStr,
            status: jobData.status,
          });
          docFlagged = true;
          break;
        }
      }
    }
  }

  console.log(`\n======================================================`);
  console.log(`TOTAL SUBCOLLECTION PROVENANCE MISMATCHES FOUND: ${provenanceMismatches.length}`);
  console.log(`======================================================\n`);

  const breakdown: Record<string, number> = {};
  provenanceMismatches.forEach((m) => {
    breakdown[m.type] = (breakdown[m.type] || 0) + 1;
  });
  console.log("Breakdown by mismatch type:", breakdown);

  const outDir = path.resolve(process.cwd(), "src/scripts/output");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.resolve(outDir, "subcollection_provenance_mismatches.json");
  fs.writeFileSync(outPath, JSON.stringify(provenanceMismatches, null, 2), "utf-8");
  console.log(`Saved full report to ${outPath}`);
}

auditSubcollectionProvenances();
