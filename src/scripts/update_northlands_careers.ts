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
  console.log("Updating Northlands School Argentina (FLIS0199) careers URL & ingesting Business Management Teacher vacancy...");

  const careersUrl = "https://www.northlands.edu.ar/en/job-opportunities/";

  // 1. Update FLIS0199 document URLs
  const schoolRef = db.collection("schools").doc("FLIS0199");
  await schoolRef.set({
    website: careersUrl,
    careersPageUrl: careersUrl,
    schooljp: careersUrl
  }, { merge: true });
  console.log("Updated FLIS0199 website, careersPageUrl, and schooljp fields in Firestore.");

  // 2. Add Business Management Teacher to schools/FLIS0199/jobs
  const jobDocId = "official_northlands_bm_teacher";
  const jobData = {
    id: jobDocId,
    title: "Business Management Teacher (Economics Desirable)",
    department: "Secondary",
    source: "Official Website",
    sourceName: "Official Website",
    applyUrl: careersUrl,
    source_url: careersUrl,
    schoolId: "FLIS0199",
    schoolName: "Northlands School Argentina",
    city: "Buenos Aires",
    country: "Argentina",
    status: "approved",
    closingDate: "2027-02-28T23:59:59.000Z",
    closingDateMillis: new Date("2027-02-28T23:59:59.000Z").getTime(),
    scrapedAt: new Date().toISOString(),
    curriculum: "UK/IB",
    schoolRating: 8.2,
    jobRef: "REF: BM Teacher"
  };

  await schoolRef.collection("jobs").doc(jobDocId).set(jobData, { merge: true });
  console.log("Added Business Management Teacher to schools/FLIS0199/jobs collection.");

  // 3. Write job to featured_jobs_cache
  const cacheJobId = "fp_flis0199_official_bm_teacher";
  const cacheData = {
    id: cacheJobId,
    title: "Business Management Teacher (Economics Desirable)",
    department: "Secondary",
    source: "Official Website",
    sources: ["Official Website", "Northlands School"],
    sourceUrls: {
      "Official Website": careersUrl,
      "Northlands School": careersUrl
    },
    applyUrl: careersUrl,
    datePosted: new Date().toISOString(),
    closingDate: "2027-02-28T23:59:59.000Z",
    closingDateMillis: new Date("2027-02-28T23:59:59.000Z").getTime(),
    schoolId: "FLIS0199",
    schoolName: "Northlands School Argentina",
    city: "Buenos Aires",
    country: "Argentina",
    status: "approved",
    ingestedAtMillis: Date.now(),
    isRollingDeadline: true,
    curriculum: "UK/IB",
    schoolRating: 8.2,
    schoolWebsite: careersUrl,
    isVolatileMarket: true,
    paidInUSD: false,
    savingsPotentialSingle: 850,
    searchTokens: [
      "business", "management", "teacher", "economics", "secondary", "school",
      "northlands", "argentina", "buenos", "aires", "uk", "ib", "flis0199"
    ]
  };

  await db.collection("featured_jobs_cache").doc(cacheJobId).set(cacheData, { merge: true });
  console.log("SUCCESS! Written Business Management Teacher to featured_jobs_cache linked to FLIS0199.");
}

main().catch(err => {
  console.error("Failed to update Northlands careers page:", err);
  process.exit(1);
});
