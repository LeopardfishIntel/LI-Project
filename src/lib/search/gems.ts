/**
 * GEMS EDUCATION SEARCH ENGINE (rebuilt Roger, 2026-10-06)
 *
 * Reads the whole GEMS careers list (careers.gemseducation.com) and returns one record per job for the NORMAL pipeline
 * (runIngestionPipeline + job gate), exactly like the other engines. It writes NOTHING itself: no board writes, no purge.
 * Jobs that disappear from the GEMS list are retired by the orchestrator's retire step (see RETIRE_RULES), not here.
 *
 * What it keeps: a job whose GEMS company name is exactly one of our mapped campuses (gemsRules.ts), that is a teaching / leadership role,
 * is not an old intake, has not passed its GEMS expiry date, and has its own job page link.
 * Everything else is left out and counted in the log. A company we do not know is reported, never guessed.
 */
import { getAdminDb } from "@/firebase/admin";
import { isRetiredSchool } from "@/lib/schools/retiredSchools";
import { sweepAllGemsNetwork, cleanGemsJobTitle } from "@/lib/crawler/adaptors/gems-adaptor";
import { GEMS_SOURCE, GEMS_SCHOOL_COMPANY_MAP, GEMS_UNREGISTERED_CAMPUSES, gemsCampusFor, gemsApplyUrl, gemsJobId, gemsDecide } from "@/lib/search/gemsRules";

// Kept here so older scripts that import them from this file keep working.
export { GEMS_SCHOOL_COMPANY_MAP, GEMS_UNREGISTERED_CAMPUSES };

export interface GemsJobMatch {
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
  matchConfidence: "high";
  sourceUrls: Record<string, string>;
  verificationReasons: string[];
}

export interface GemsLeftOut { title: string; company: string; why: string; url: string; expDate: string }
export interface GemsReadResult {
  rawCount: number;
  matches: GemsJobMatch[];
  leftOut: GemsLeftOut[];
  /** Jobs whose company name is neither mapped nor on the known-unregistered list. */
  unknownCampuses: GemsLeftOut[];
  unreadableExpiry: number;
  readOk: boolean;
}

export function isGemsSchool(schoolId?: string | null, schoolName?: string | null, group?: string | null): boolean {
  const sId = (schoolId || "").toUpperCase().trim();
  const sName = (schoolName || "").toLowerCase();
  const gName = (group || "").toLowerCase();
  if (["taaleem", "nord anglia", "cognita", "inspired"].some((x) => gName.includes(x) || sName.includes(x)) || sName.includes("sunmarke")) return false;
  if (sId && sId in GEMS_SCHOOL_COMPANY_MAP) return true;
  if (gName.includes("gems")) return true;
  return sName.startsWith("gems ") || ["gems world", "gems wellington", "gems founders", "gems royal", "gems firstpoint", "gems metropole", "gems winchester", "jumeirah college"].some((x) => sName.includes(x));
}

/** Reads the GEMS list and decides every job. Used by the engine and by the trial script, so both always agree. */
export async function readGems(): Promise<GemsReadResult> {
  const out: GemsReadResult = { rawCount: 0, matches: [], leftOut: [], unknownCampuses: [], unreadableExpiry: 0, readOk: false };
  const raw = await sweepAllGemsNetwork();
  out.rawCount = raw.length;
  out.readOk = raw.length > 0;
  if (!raw.length) { console.warn("⚠️ [GEMS] The GEMS list gave no jobs (page or token problem). Nothing will be changed."); return out; }

  const db: any = getAdminDb();
  const snap = await db.collection("schools").get();
  const registry = new Map<string, { name: string; city: string; country: string }>();
  snap.docs.forEach((d: any) => { if (!isRetiredSchool(d.id)) { const x = d.data() || {}; registry.set(d.id, { name: String(x.schoolname || x.name || ""), city: String(x.city || ""), country: String(x.country || "") }); } });

  const seen = new Set<string>();
  for (const j of raw) {
    const company = String(j.companyName || j.company_name || "").trim();
    const title = String(j.title || "").trim();
    const url = String(j.url || j.apply_url || j.applyUrl || "");
    const left = (why: string) => ({ title, company, why, url, expDate: String(j.expDate || "") });

    const campus = gemsCampusFor(company);
    if (campus.kind === "none") { out.leftOut.push(left("no company name")); continue; }
    if (campus.kind === "known_unregistered") { out.leftOut.push(left("GEMS campus that is not in our registry")); continue; }
    if (campus.kind === "unknown") { const l = left("company name not recognised"); out.leftOut.push(l); out.unknownCampuses.push(l); continue; }

    const school = registry.get(campus.schoolId);
    if (!school) { out.leftOut.push(left(`${campus.schoolId} is not in the registry (or retired)`)); continue; }

    const dec = gemsDecide({ title, description: j.description, expDate: j.expDate, crtDate: j.crtDate });
    if (dec.expUnreadable) out.unreadableExpiry++;
    if (!dec.keep) { out.leftOut.push(left(dec.why)); continue; }

    const applyUrl = gemsApplyUrl(j);
    if (!applyUrl) { out.leftOut.push(left("no job page link")); continue; }
    const key = applyUrl.toLowerCase().replace(/\/+$/, "");
    if (seen.has(key)) continue;
    seen.add(key);

    out.matches.push({
      jobId: gemsJobId(applyUrl) || `gems_${Math.random().toString(36).slice(2, 9)}`,
      title: cleanGemsJobTitle(title) || title,
      applyUrl,
      schoolId: campus.schoolId,
      schoolName: school.name,
      city: school.city,
      country: school.country,
      source: GEMS_SOURCE,
      datePosted: dec.datePosted,
      closingDate: dec.closingDate,
      matchConfidence: "high",
      sourceUrls: { [GEMS_SOURCE]: applyUrl },
      verificationReasons: [`GEMS company name "${company}" is exactly ${campus.schoolId}`, `GEMS expiry: ${dec.closingDate || "none"}`],
    });
  }
  return out;
}

export async function searchGemsDbSchools(query: string = ""): Promise<GemsJobMatch[]> {
  try {
    console.log("💎 [GEMS] Reading the GEMS careers list...");
    const r = await readGems();
    console.log(`💎 [GEMS] ${r.rawCount} on the list: ${r.matches.length} kept, ${r.leftOut.length} left out (${r.unknownCampuses.length} from company names we do not know).`);
    const names = Array.from(new Set(r.unknownCampuses.map((x) => x.company)));
    if (names.length) console.log(`💎 [GEMS] Unknown company names (left out, not guessed): ${names.join(" | ")}`);
    const q = query.toLowerCase();
    return q ? r.matches.filter((m) => m.title.toLowerCase().includes(q) || m.schoolName.toLowerCase().includes(q)) : r.matches;
  } catch (err) {
    console.error("❌ [GEMS] Failed to read the GEMS list:", err);
    return [];
  }
}
