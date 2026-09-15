import { getAdminDb } from "../src/firebase/admin";
import { isValidJobTitle } from "../src/lib/crawler/titleSanitizer";

async function purgeDuplicates() {
  console.log("🧹 Initializing cross-engine duplicate purge in featured_jobs_cache...");
  const db = getAdminDb();
  if (!db) {
    console.error("❌ Firestore Admin DB unavailable.");
    process.exit(1);
  }

  const snap = await db.collection("featured_jobs_cache").get();
  console.log(`📊 Scanned ${snap.size} total cache documents.`);

  const docsBySchool = new Map<string, any[]>();
  snap.docs.forEach((doc: any) => {
    const d = { id: doc.id, ref: doc.ref, ...doc.data() };
    const sId = String(d.schoolId || "").toUpperCase().trim();
    if (!docsBySchool.has(sId)) {
      docsBySchool.set(sId, []);
    }
    docsBySchool.get(sId)!.push(d);
  });

  const docsToDelete: any[] = [];
  let duplicateCount = 0;

  for (const [schoolId, jobs] of docsBySchool.entries()) {
    const seenUrls = new Set<string>();
    const seenTitles = new Map<string, any>();

    for (const job of jobs) {
      const rawTitle = String(job.title || job.jobTitle || "").trim();
      const normTitle = rawTitle.toLowerCase();
      const applyUrl = String(job.applyUrl || job.source_url || "").toLowerCase().replace(/\/+$/, "").trim();

      // Check duplicate URL
      if (applyUrl && seenUrls.has(applyUrl)) {
        console.log(` 🗑️ [Duplicate URL] School: ${schoolId} | Doc: ${job.id} | Title: "${rawTitle}"`);
        docsToDelete.push(job);
        duplicateCount++;
        continue;
      }
      if (applyUrl) seenUrls.add(applyUrl);

      // Check duplicate exact title within same school (e.g. cross-platform duplicate between TES and GRC)
      if (seenTitles.has(normTitle)) {
        const existing = seenTitles.get(normTitle);
        // Keep the GRC or Direct portal listing over secondary aggregator if applicable, or keep existing
        console.log(` 🗑️ [Duplicate Title Cross-Engine] School: ${schoolId} | Doc: ${job.id} ("${rawTitle}") duplicating Doc: ${existing.id}`);
        docsToDelete.push(job);
        duplicateCount++;
        continue;
      }
      seenTitles.set(normTitle, job);
    }
  }

  console.log(`\n🔍 Found ${docsToDelete.length} duplicate documents to purge.`);

  if (docsToDelete.length > 0) {
    const BATCH_SIZE = 400;
    for (let i = 0; i < docsToDelete.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = docsToDelete.slice(i, i + BATCH_SIZE);
      chunk.forEach((doc: any) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }
    console.log(`✅ Successfully purged ${docsToDelete.length} duplicate cache documents.`);
  } else {
    console.log("✅ No duplicates found.");
  }
}

purgeDuplicates()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Purge error:", err);
    process.exit(1);
  });
