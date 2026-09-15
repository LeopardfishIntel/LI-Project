import { getAdminDb } from "../src/firebase/admin";
import { isValidJobTitle } from "../src/lib/crawler/titleSanitizer";

async function syncAllSchoolCounters() {
  console.log("🔄 Starting database-wide school counter synchronization...");
  const db = getAdminDb();
  if (!db) {
    console.error("❌ Firestore Admin DB unavailable.");
    process.exit(1);
  }

  const cacheSnap = await db.collection("featured_jobs_cache").get();
  console.log(`📊 Scanned ${cacheSnap.size} cache documents.`);

  const countsBySchool: Record<string, number> = {};
  const seenJobKeys = new Set<string>();
  const seenUrls = new Set<string>();

  cacheSnap.docs.forEach((doc: any) => {
    const d = doc.data();
    const sId = String(d.schoolId || "").toUpperCase().trim();
    if (!sId || sId.startsWith("AGNT")) return;

    const title = String(d.title || d.jobTitle || "");
    if (!isValidJobTitle(title)) return;

    const applyUrl = String(d.applyUrl || d.source_url || "").toLowerCase().replace(/\/+$/, "").trim();
    if (applyUrl && seenUrls.has(applyUrl)) return;
    if (applyUrl) seenUrls.add(applyUrl);

    const jobKey = `${sId.toLowerCase()}_${title.toLowerCase().trim()}`;
    if (seenJobKeys.has(jobKey)) return;
    seenJobKeys.add(jobKey);

    countsBySchool[sId] = (countsBySchool[sId] || 0) + 1;
  });

  const schoolSnap = await db.collection("schools").get();
  console.log(`🏫 Processing ${schoolSnap.size} school documents...`);

  let updatedCount = 0;
  const now = new Date().toISOString();
  const BATCH_SIZE = 400;
  const batches = [];
  let currentBatch = db.batch();
  let batchOps = 0;

  schoolSnap.docs.forEach((doc: any) => {
    const sData = doc.data();
    const sId = (sData.schoolId || doc.id).toUpperCase().trim();
    const actualCount = countsBySchool[sId] || 0;

    if (sData.openJobsCount !== actualCount) {
      currentBatch.set(doc.ref, { openJobsCount: actualCount, lastCountersSyncedAt: now }, { merge: true });
      updatedCount++;
      batchOps++;

      if (batchOps >= BATCH_SIZE) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        batchOps = 0;
      }
    }
  });

  if (batchOps > 0) {
    batches.push(currentBatch);
  }

  for (const b of batches) {
    await b.commit();
  }

  console.log(`✅ Synchronized ${updatedCount} school documents. Total active featured vacancies indexed: ${Object.values(countsBySchool).reduce((a, b) => a + b, 0)}`);
}

syncAllSchoolCounters()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Sync error:", err);
    process.exit(1);
  });
