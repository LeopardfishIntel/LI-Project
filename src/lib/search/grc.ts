/**
 * 🌐 GRC FAIR DB SEARCH ENGINE & SWEEP RUNNER
 *
 * Coordinates network-wide sweeps across the Global Recruitment Collaborative (GRC Fair),
 * enforces strict canonical entity matching against the 459-school database,
 * and commits newly discovered teaching vacancies to the staging review queue (`status: "pending_review"`).
 */

import { runGrcAdaptor } from "@/lib/crawler/adaptors/grc-adaptor";
import { isSupportOrNonTeachingRole } from "@/lib/crawler/roleClassifier";

export interface GrcJobMatch {
  jobId: string;
  title: string;
  applyUrl: string;
  schoolId: string;
  schoolName: string;
  city: string;
  country: string;
  source: string;
  datePosted?: string | null;
  closingDate?: string | null;
  matchConfidence?: "high" | "medium" | "low";
  verificationReasons?: string[];
}

export async function searchGrcDbSchools(query: string = ""): Promise<GrcJobMatch[]> {
  try {
    console.log("🌐 [GRC SEARCH ENGINE] Running GRC Fair live sweep...");
    const rawRecords = await runGrcAdaptor();

    const matches: GrcJobMatch[] = [];
    for (const r of rawRecords) {
      if (!r.schoolId || !r.applyUrl) continue;
      if (query && !r.rawTitle.toLowerCase().includes(query.toLowerCase()) && !r.schoolName.toLowerCase().includes(query.toLowerCase())) {
        continue;
      }

      // Support staff are dropped here. A title that is not clearly teaching/leadership is kept: the job gate sends it to pending.
      if (isSupportOrNonTeachingRole(r.rawTitle)) {
        continue;
      }

      const jobId = r.applyUrl.split("/").pop() || Math.random().toString(36).substring(2, 8);
      matches.push({
        jobId: `grc_${jobId}`,
        title: r.rawTitle,
        applyUrl: r.applyUrl,
        schoolId: r.schoolId,
        schoolName: r.schoolName,
        city: r.city || "",
        country: r.country || "",
        source: "GRC",
        datePosted: r.datePosted || null,
        closingDate: r.closingDate || null,
        // Carry the school-match confidence through to the job gate (without it every job would go to pending).
        matchConfidence: r.matchConfidence,
        verificationReasons: r.verificationReasons,
      });
    }

    console.log(`🌐 [GRC SEARCH ENGINE] Formatted ${matches.length} grounded teaching vacancies from GRC.`);
    return matches;
  } catch (err) {
    console.error("❌ [GRC SEARCH ENGINE] Failed to sweep GRC:", err);
    return [];
  }
}
