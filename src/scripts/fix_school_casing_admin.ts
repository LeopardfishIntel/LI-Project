import admin from "firebase-admin";
import path from "path";

const saPath = path.resolve(process.cwd(), "service-account.json");
const serviceAccount = require(saPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function main() {
  console.log("Fixing schoolId linking in featured_jobs_cache...");
  const snap = await db.collection("featured_jobs_cache").get();
  let updatedCount = 0;
  let batch = db.batch();

  for (const doc of snap.docs) {
    const data = doc.data();
    let schoolId = data.schoolId || "";
    let targetId = schoolId.toUpperCase();

    if (targetId.startsWith("FLIS0115_")) targetId = "FLIS0115";
    if (targetId.startsWith("FLIS0118_")) targetId = "FLIS0118";

    if (schoolId !== targetId) {
      batch.update(doc.ref, { schoolId: targetId });
      updatedCount++;
      console.log(`[${updatedCount}] Corrected ${doc.id}: '${schoolId}' -> '${targetId}'`);
    }
  }

  if (updatedCount > 0) {
    await batch.commit();
    console.log(`\nSUCCESS! Corrected and linked ${updatedCount} jobs to parent schools.`);
  } else {
    console.log("\n0 linking adjustments needed.");
  }
}

main().catch(err => {
  console.error("Admin script failed:", err);
  process.exit(1);
});
