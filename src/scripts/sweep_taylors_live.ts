import { getAdminDb } from "../firebase/admin";
import { searchTaylorsDbSchools } from "../lib/search/taylors";
import { runIngestionPipeline } from "../lib/pipelines/pipeline1-ingestion";

async function main() {
  console.log("🛸 Starting Taylor's Education sweep and standard ingestion pipeline...");
  const db = getAdminDb();
  if (!db) {
    console.error("Firestore DB connection failed");
    process.exit(1);
  }

  const matches = await searchTaylorsDbSchools();
  console.log(`\n✅ Scraped & matched ${matches.length} K-12 academic positions from Taylor's portal.`);

  const schoolGroups = new Map<string, any[]>();
  for (const m of matches) {
    if (!m.schoolId) continue;
    const sId = m.schoolId.toUpperCase().trim();
    if (!schoolGroups.has(sId)) {
      schoolGroups.set(sId, []);
    }
    schoolGroups.get(sId)!.push({
      rawTitle: m.title,
      source: "Taylor's Group",
      applyUrl: m.applyUrl,
      schoolId: m.schoolId,
      schoolName: m.schoolName,
      city: m.city,
      country: m.country,
      datePosted: null,
      closingDate: null
    });
  }

  for (const [sId, records] of schoolGroups.entries()) {
    console.log(`\n📦 Running standard ingestion pipeline for ${sId} (${records.length} records)...`);
    const res = await runIngestionPipeline(sId, records);
    console.log(`Pipeline result for ${sId}: accepted=${res.accepted}, rejected=${res.rejected}`);
    if (res.reasons.length > 0) {
      console.log("Reasons / notes:", res.reasons);
    }
  }

  // Check and fix the existing job fp_flis0403_ealteacher_7c4b7867cd313748
  const existingDocRef = db.collection("featured_jobs_cache").doc("fp_flis0403_ealteacher_7c4b7867cd313748");
  const existingSnap = await existingDocRef.get();
  if (existingSnap.exists) {
    const data = existingSnap.data()!;
    const curSource = String(data.source || "");
    const curSources = Array.isArray(data.sources) ? data.sources : [curSource];
    if (curSource !== "Taylor's Group" || !curSources.includes("Taylor's Group")) {
      const newSources = Array.from(new Set([...curSources, "Taylor's Group"]));
      await existingDocRef.update({
        source: "Taylor's Group",
        sources: newSources,
        updatedAtMillis: Date.now()
      });
      console.log(`\n🔧 Updated existing job fp_flis0403_ealteacher_7c4b7867cd313748 to source="Taylor's Group" and sources=${JSON.stringify(newSources)}`);
    } else {
      console.log(`\nExisting job fp_flis0403_ealteacher_7c4b7867cd313748 already carries Taylor's Group source.`);
    }
  }

  // Audit all Taylor's jobs currently in featured_jobs_cache
  const cacheSnap = await db.collection("featured_jobs_cache").get();
  const taylorsJobs: any[] = [];

  cacheSnap.docs.forEach((d: any) => {
    const j = d.data();
    const srcUpper = String(j.source || "").toUpperCase();
    const sourcesUpper = (j.sources || []).map((s: any) => String(s || "").toUpperCase());
    const applyUrlLower = String(j.applyUrl || j.source_url || "").toLowerCase();

    const isTaylors =
      srcUpper.includes("TAYLOR") ||
      sourcesUpper.some((s: string) => s.includes("TAYLOR")) ||
      applyUrlLower.includes("taylors.edu.my") ||
      applyUrlLower.includes("careers.taylors");

    if (isTaylors) {
      taylorsJobs.push({
        id: d.id,
        title: j.title,
        schoolId: j.schoolId,
        schoolName: j.schoolName,
        status: j.status,
        source: j.source,
        sources: j.sources,
        applyUrl: j.applyUrl
      });
    }
  });

  console.log(`\n=================================================`);
  console.log(`📊 TOTAL TAYLOR'S JOBS IN FEATURED_JOBS_CACHE: ${taylorsJobs.length}`);
  console.log(`=================================================`);
  taylorsJobs.forEach((j, i) => {
    console.log(`${i + 1}. [${j.status}] "${j.title}" (${j.schoolName} - ${j.schoolId})`);
    console.log(`   id: ${j.id}`);
    console.log(`   source: "${j.source}" | sources: ${JSON.stringify(j.sources)}`);
    console.log(`   applyUrl: ${j.applyUrl}`);
  });
}

main().catch((err) => {
  console.error("❌ Sweep error:", err);
  process.exit(1);
});
