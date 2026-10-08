import { getAdminDb } from "@/firebase/admin";
import { sweepAllTaaleemNetwork, cleanTaaleemJobTitle } from "@/lib/crawler/adaptors/taaleem-adaptor";
import { isSupportOrNonTeachingRole } from "@/lib/crawler/roleClassifier";
import { TAALEEM_CAMPUS_MAP, isTaaleemSchool, TaaleemJobMatch } from "@/lib/search/taaleem";

/** Company names that are the group itself or its head office - the job names no campus, so it is left out. */
export function isTaaleemNoCampusCompany(company: string): boolean {
  const c = String(company || "").trim().toLowerCase().replace(/\s+/g, " ");
  return c === "taaleem" || c === "taaleem education" || c === "taaleem education network" || c === "central office" || c === "";
}

interface CampusCandidate {
  key: string;
  schoolId: string;
  canonicalName: string;
  city: string;
  country: string;
}

/**
 * Sweeps all active vacancies across the Taaleem Education Network using the authenticated
 * token session from careers.taaleem.ae, grounding each role strictly to its specific campus.
 * Server-only engine invoked by sweep-orchestrator.
 */
export async function searchTaaleemDbSchools(): Promise<TaaleemJobMatch[]> {
  console.log("🏫 [TAALEEM ENGINE] Starting automated network sweep and campus grounding...");

  try {
    // 1. Fetch raw jobs once via authenticated tokenized session
    const rawJobs = await sweepAllTaaleemNetwork();
    if (!rawJobs || rawJobs.length === 0) {
      console.log("ℹ️ [TAALEEM ENGINE] No jobs returned from network sweep.");
      return [];
    }

    const db = getAdminDb();
    if (!db) {
      console.warn("⚠️ [TAALEEM ENGINE] Firestore DB unavailable.");
      return [];
    }

    // 2. Load schools from DB to discover all Taaleem-network schools and aliases
    const snap = await db.collection("schools").get();
    const candidateMap = new Map<string, CampusCandidate>();

    // Seed from canonical TAALEEM_CAMPUS_MAP
    for (const [key, meta] of Object.entries(TAALEEM_CAMPUS_MAP)) {
      const normKey = key.trim().toLowerCase();
      candidateMap.set(normKey, {
        key: normKey,
        schoolId: meta.schoolId,
        canonicalName: meta.canonicalName,
        city: meta.city,
        country: meta.country,
      });
    }

    // Augment with active DB schools where isTaaleemSchool is true
    snap.docs.forEach((doc: any) => {
      const data = doc.data();
      const schoolName = data.schoolname || data.name || "";
      const groupName = data.group || data.ownership || "";
      if (isTaaleemSchool(doc.id, schoolName, groupName)) {
        const normName = schoolName.trim().toLowerCase();
        if (normName && !candidateMap.has(normName)) {
          candidateMap.set(normName, {
            key: normName,
            schoolId: doc.id,
            canonicalName: schoolName,
            city: data.city || "Dubai",
            country: data.country || "United Arab Emirates",
          });
        }
      }
    });

    // 3. Build candidate list SORTED BY KEY LENGTH DESCENDING (longest/most specific first)
    const sortedCandidates = Array.from(candidateMap.values()).sort(
      (a, b) => b.key.length - a.key.length
    );

    const matches: TaaleemJobMatch[] = [];
    let unmatchedCount = 0;
    let noCampusCount = 0;
    const now = Date.now();

    for (const job of rawJobs) {
      const rawTitle = String(job.title || "").trim();
      if (!rawTitle || isSupportOrNonTeachingRole(rawTitle)) {
        continue;
      }

      // Check expired dates
      if (job.expDate) {
        const expMillis = new Date(job.expDate).getTime();
        if (!isNaN(expMillis) && expMillis < now) {
          continue;
        }
      }

      const rawCompany = String(job.companyName || "").trim().toLowerCase();
      // Jobs posted under the group's own name (no campus named) are never guessed onto a school (Roger, 2026-10-08).
      if (isTaaleemNoCampusCompany(rawCompany)) {
        noCampusCount++;
        continue;
      }
      let matchedCandidate: CampusCandidate | null = null;
      let matchConfidence: "high" | "medium" = "high";
      let reasons: string[] = [];

      // Try EXACT match first
      const exact = sortedCandidates.find((c) => c.key === rawCompany);
      if (exact) {
        matchedCandidate = exact;
        matchConfidence = "high";
        reasons = [];
      } else {
        // Try SUBSTRING match in sorted (longest-first) order
        const partial = sortedCandidates.find(
          (c) => c.key.includes(rawCompany) || rawCompany.includes(c.key)
        );
        if (partial) {
          matchedCandidate = partial;
          matchConfidence = "medium";
          reasons = [
            `Matched via partial company name "${rawCompany}" against campus key "${partial.key}" — verify this vacancy belongs to the correct campus before approving.`,
          ];
        }
      }

      // If still no match: do NOT guess or default. Skip job and track count.
      if (!matchedCandidate) {
        unmatchedCount++;
        console.warn(`⚠️ [TAALEEM ENGINE] Could not ground job "${rawTitle}" (company: "${rawCompany}") to any known campus. Skipping.`);
        continue;
      }

      const cleanTitle = cleanTaaleemJobTitle(rawTitle) || rawTitle;
      const jobId = job.id
        ? `taaleem_${job.id}`
        : `taaleem_${Buffer.from(job.applyUrl).toString("base64url").slice(0, 20)}`;

      const datePosted = job.crtDate ? String(job.crtDate).split(" ")[0].replace(/\//g, "-") : null;
      const closingDate = job.expDate ? String(job.expDate).split(" ")[0].replace(/\//g, "-") : null;

      matches.push({
        jobId,
        title: cleanTitle,
        applyUrl: job.applyUrl,
        schoolId: matchedCandidate.schoolId,
        schoolName: matchedCandidate.canonicalName,
        city: matchedCandidate.city,
        country: matchedCandidate.country,
        source: "Taaleem Official ATS",
        datePosted,
        closingDate,
        matchConfidence,
        reasons,
      });
    }

    console.log(`✅ [TAALEEM ENGINE] Sweep completed: ${rawJobs.length} total vacancies scanned, ${matches.length} grounded to campuses, ${unmatchedCount} ungrounded (skipped), ${noCampusCount} posted by the group with no campus named (left out).`);
    return matches;
  } catch (err: any) {
    console.error("❌ [TAALEEM ENGINE] Fatal sweep error:", err?.message || err);
    return [];
  }
}
