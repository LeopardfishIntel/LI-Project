/**
 * 🌐 SEARCH ASSOCIATES (LEADERSHIP) SEARCH ENGINE (Roger, 2026-10-06)
 *
 * Reads searchassociates.com/Leadership-Vacancies (tab 1 "Head of School" and tab 2 "Other Leadership"), opens each job page, and returns
 * one record per job for the NORMAL pipeline (runIngestionPipeline + job gate), exactly like the other engines. It writes nothing itself.
 *
 * What it keeps: a job whose school is in our registry (whole-word name match, country must fit), whose page still accepts applications,
 * whose real deadline has not passed, and whose title is a leadership / academic role (business posts are left out).
 * What it leaves out is counted and listed in the log. A school that is not in the registry is never put in a "hub": the job is simply left out.
 * Apply link = the candidate-pack PDF when the page has one, otherwise the job page.
 */
import { getAdminDb } from "@/firebase/admin";
import { isRetiredSchool } from "@/lib/schools/retiredSchools";
import { isSupportOrNonTeachingRole } from "@/lib/crawler/roleClassifier";
import {
  SA_SOURCE, SA_LEADERSHIP_URL, saSchoolText, matchSaSchool, saDecide, saIsBusinessRole, saJobId, parseSaListing, parseSaDetail, type SaSchool,
} from "@/lib/search/saRules";

export interface SaJobMatch {
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

export interface SaLeftOut { title: string; school: string; country: string; why: string }
export interface SaReadResult { pageJobs: number; matches: SaJobMatch[]; leftOut: SaLeftOut[]; pageReadOk: boolean }

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Why the last read gave nothing (shown in the engine's answer so a silent failure can be seen). */
let saLastNote = "";
export function getSaLastNote(): string { return saLastNote; }

async function getHtml(url: string): Promise<{ ok: boolean; status: number; html: string }> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, cache: "no-store", signal: AbortSignal.timeout(25000) });
    return { ok: r.ok, status: r.status, html: r.ok ? await r.text() : "" };
  } catch (e: any) {
    saLastNote = `request failed: ${String(e?.cause?.code || e?.name || "error")} ${String(e?.message || "").slice(0, 120)}`;
    return { ok: false, status: 0, html: "" };
  }
}

/** Reads the page and decides every job. Used by the engine and by the trial script, so both always agree. */
export async function readSearchAssociates(): Promise<SaReadResult> {
  const out: SaReadResult = { pageJobs: 0, matches: [], leftOut: [], pageReadOk: false };
  saLastNote = "";
  const list = await getHtml(SA_LEADERSHIP_URL);
  if (!list.ok) { saLastNote = saLastNote || `leadership page not readable (HTTP ${list.status})`; console.warn(`⚠️ [SEARCH ASSOCIATES] Leadership page not readable (HTTP ${list.status}).`); return out; }
  const rows = parseSaListing(list.html);
  out.pageJobs = rows.length;
  out.pageReadOk = rows.length > 0;
  if (!rows.length) { saLastNote = `page read (HTTP ${list.status}, ${list.html.length} characters) but no jobs found on it (layout changed or blocked page?)`; console.warn("⚠️ [SEARCH ASSOCIATES] No jobs found on the page (layout changed?)."); return out; }

  const db: any = getAdminDb();
  const snap = await db.collection("schools").get();
  const registry: Array<SaSchool & { city: string }> = snap.docs
    .filter((d: any) => !isRetiredSchool(d.id))
    .map((d: any) => { const x = d.data() || {}; return { id: d.id, name: String(x.schoolname || x.name || ""), country: String(x.country || ""), city: String(x.city || ""), aliases: Array.isArray(x.aliases) ? x.aliases : [] }; });
  const byId = new Map(registry.map((s) => [s.id, s]));

  const seenUrls = new Set<string>();
  const worker = async (row: { href: string; title: string }) => {
    const det = await getHtml(row.href);
    if (!det.ok) { out.leftOut.push({ title: row.title, school: "?", country: "", why: `job page not readable (HTTP ${det.status})` }); return; }
    const d = parseSaDetail(det.html);
    const t = saSchoolText(d.heading || row.title, row.title);
    if (saIsBusinessRole(row.title) || isSupportOrNonTeachingRole(row.title)) { out.leftOut.push({ title: row.title, school: t.school, country: t.country, why: "not a teaching or leadership role" }); return; }
    const dec = saDecide({ deadline: d.deadline, posted: d.posted, closedLabel: d.closedLabel });
    if (!dec.keep) { out.leftOut.push({ title: row.title, school: t.school, country: t.country, why: dec.why }); return; }
    const m = matchSaSchool(t.school, t.country, registry);
    if (!m.schoolId) { out.leftOut.push({ title: row.title, school: t.school, country: t.country, why: m.why }); return; }
    const school = byId.get(m.schoolId)!;
    const applyUrl = d.pdf || row.href;
    const key = applyUrl.toLowerCase();
    if (seenUrls.has(key)) return;
    seenUrls.add(key);
    out.matches.push({
      jobId: saJobId(row.href) || `sa_${Math.random().toString(36).slice(2, 9)}`,
      title: row.title,
      applyUrl,
      schoolId: school.id,
      schoolName: school.name,
      city: school.city,
      country: school.country || t.country,
      source: SA_SOURCE,
      datePosted: dec.datePosted,
      closingDate: dec.closingDate,
      matchConfidence: "high",
      sourceUrls: { [SA_SOURCE]: applyUrl },
      verificationReasons: [`School matched by ${m.why}`, `Deadline: ${d.deadline || "none"}`],
    });
  };

  // 4 pages at a time (about 50 pages, so well under a minute)
  const queue = [...rows];
  await Promise.all(Array.from({ length: 4 }, async () => { for (let r = queue.shift(); r; r = queue.shift()) await worker(r); }));
  return out;
}

export async function searchSearchAssociatesDbSchools(query: string = ""): Promise<SaJobMatch[]> {
  try {
    console.log("🌐 [SEARCH ASSOCIATES] Reading the leadership vacancies page...");
    const r = await readSearchAssociates();
    const reg = r.leftOut.filter((x) => x.why === "school not in the registry").length;
    console.log(`🌐 [SEARCH ASSOCIATES] ${r.pageJobs} on the page: ${r.matches.length} kept, ${r.leftOut.length} left out (${reg} because the school is not in the registry).`);
    r.leftOut.forEach((x) => console.log(`   left out | ${x.title} | ${x.school} (${x.country}) | ${x.why}`));
    const q = query.toLowerCase();
    return q ? r.matches.filter((m) => m.title.toLowerCase().includes(q) || m.schoolName.toLowerCase().includes(q)) : r.matches;
  } catch (err) {
    console.error("❌ [SEARCH ASSOCIATES] Failed to read the page:", err);
    return [];
  }
}
