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
  console.log("Linking TeacherHorizons school URL to Northlands School Argentina (FLIS0199)...");

  const thUrl = "https://www.teacherhorizons.com/schools/south-america-argentina-buenos-aires-northlands/vacancies";

  // 1. Update FLIS0199 in schools collection
  const schoolRef = db.collection("schools").doc("FLIS0199");
  await schoolRef.set({
    teacherHorizonsUrl: thUrl,
    agency: "Search Associates, LinkedIn, Teach Away, Teacher Horizons"
  }, { merge: true });
  console.log("Updated FLIS0199 teacherHorizonsUrl and agency fields in Firestore.");

  // 2. Update all cached featured jobs for FLIS0199 to append Teacher Horizons as a source option
  const snap = await db.collection("featured_jobs_cache").where("schoolId", "==", "FLIS0199").get();
  console.log(`Found ${snap.docs.length} cached jobs for FLIS0199.`);

  for (const doc of snap.docs) {
    const data = doc.data();
    const existingSources: string[] = data.sources || [data.source || "Official Source"];
    if (!existingSources.includes("Teacher Horizons")) {
      existingSources.push("Teacher Horizons");
    }

    const existingSourceUrls = data.sourceUrls || {};
    existingSourceUrls["Teacher Horizons"] = thUrl;

    await doc.ref.set({
      sources: existingSources,
      sourceUrls: existingSourceUrls
    }, { merge: true });

    console.log(`Updated sources for cached job ${doc.id}`);
  }

  console.log("SUCCESS! TeacherHorizons school vacancies URL is now linked to Northlands School Argentina.");
}

main().catch(err => {
  console.error("Linking failed:", err);
  process.exit(1);
});
