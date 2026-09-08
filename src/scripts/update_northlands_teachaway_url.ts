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
  console.log("Setting official TeachAway employer URL for Northlands School Argentina (FLIS0199)...");

  const taUrl = "https://www.teachaway.com/schools/northlands-school";

  // 1. Update FLIS0199 document in schools collection
  const schoolRef = db.collection("schools").doc("FLIS0199");
  await schoolRef.set({
    teachAwayUrl: taUrl
  }, { merge: true });
  console.log("Updated FLIS0199 teachAwayUrl field in Firestore.");

  // 2. Update cached featured jobs for FLIS0199
  const snap = await db.collection("featured_jobs_cache").where("schoolId", "==", "FLIS0199").get();
  for (const doc of snap.docs) {
    const data = doc.data();
    const existingSourceUrls = data.sourceUrls || {};
    if (!existingSourceUrls["Teach Away"]) {
      existingSourceUrls["Teach Away"] = taUrl;
    }
    await doc.ref.set({
      sourceUrls: existingSourceUrls
    }, { merge: true });
    console.log(`Updated sourceUrls for job ${doc.id}`);
  }

  console.log("SUCCESS! Official TeachAway profile URL is now saved and linked to FLIS0199.");
}

main().catch(err => {
  console.error("Script failed:", err);
  process.exit(1);
});
