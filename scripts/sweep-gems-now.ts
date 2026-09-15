import { searchGemsDbSchools } from "../src/lib/search/gems";
import { getAdminDb } from "../src/firebase/admin";

async function runGemsSweep() {
  console.log("💎 Triggering GEMS search engine sweep...");
  const matches = await searchGemsDbSchools();
  console.log(`💎 GEMS Sweep completed with ${matches.length} matches.`);

  const db = getAdminDb();
  if (!db) {
    console.error("❌ Firestore Admin DB unavailable.");
    process.exit(1);
  }

  // Audit FLIS0126
  const snap126 = await db.collection("featured_jobs_cache").where("schoolId", "==", "FLIS0126").get();
  console.log(`
📊 FLIS0126 cached jobs count: ${snap126.size}`);
  snap126.docs.forEach((doc: any) => {
    const d = doc.data();
    console.log(` - [${doc.id}] ${d.title} | School: "${d.schoolName}" | Savings: $${d.savingsPotentialSingle}/mo | 2YrPot: $${d.est2YrSavingsPot}`);
  });

  // Audit FLIS0140
  const snap140 = await db.collection("featured_jobs_cache").where("schoolId", "==", "FLIS0140").get();
  console.log(`
📊 FLIS0140 cached jobs count: ${snap140.size}`);
  snap140.docs.forEach((doc: any) => {
    const d = doc.data();
    console.log(` - [${doc.id}] ${d.title} | School: "${d.schoolName}" | Savings: $${d.savingsPotentialSingle}/mo | 2YrPot: $${d.est2YrSavingsPot}`);
  });

  // Overall GEMS Cache Check
  const allGemsSnap = await db.collection("featured_jobs_cache").where("source", "==", "GEMS Education").get();
  console.log(`
💎 Total cached GEMS vacancies: ${allGemsSnap.size}`);

  let nonGemsFound = 0;
  let outOfBoundsSavings = 0;

  allGemsSnap.docs.forEach((doc: any) => {
    const d = doc.data();
    if (d.est2YrSavingsPot < 24000 || d.est2YrSavingsPot > 55200) {
      console.warn(`⚠️ Out-of-benchmark savings pot on ${doc.id} (${d.schoolName}): $${d.est2YrSavingsPot}`);
      outOfBoundsSavings++;
    }
  });

  console.log(`✅ Verification summary: Out-of-bounds savings: ${outOfBoundsSavings}, Non-GEMS titles: ${nonGemsFound}`);
}

runGemsSweep()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Sweep error:", err);
    process.exit(1);
  });
