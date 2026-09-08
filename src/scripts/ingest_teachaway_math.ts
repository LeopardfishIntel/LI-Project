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
  console.log("Ingesting TeachAway Secondary Mathematics listing for Northlands School Argentina (FLIS0199)...");

  // 1. Update FLIS0199 agency field
  const schoolRef = db.collection("schools").doc("FLIS0199");
  await schoolRef.set({
    agency: "Search Associates, LinkedIn, Teach Away"
  }, { merge: true });
  console.log("Updated FLIS0199 agency field to include Teach Away.");

  // 2. Write job to schools/FLIS0199/jobs
  const jobDocId = "ta_northlands_math_sec_2027";
  const jobData = {
    id: jobDocId,
    title: "Mathematics Teacher - Secondary School",
    department: "Secondary",
    source: "Teach Away",
    sourceName: "Teach Away",
    applyUrl: "https://www.teachaway.com/teaching-jobs-abroad/mathematics-teacher-secondary-school-buenos-aires",
    source_url: "https://www.teachaway.com/teaching-jobs-abroad/mathematics-teacher-secondary-school-buenos-aires",
    schoolId: "FLIS0199",
    schoolName: "Northlands School Argentina",
    city: "Buenos Aires",
    country: "Argentina",
    status: "approved",
    closingDate: "2027-02-28T23:59:59.000Z",
    closingDateMillis: new Date("2027-02-28T23:59:59.000Z").getTime(),
    scrapedAt: new Date().toISOString(),
    curriculum: "UK/IB",
    schoolRating: 8.2
  };

  await schoolRef.collection("jobs").doc(jobDocId).set(jobData, { merge: true });
  console.log("Added job to schools/FLIS0199/jobs collection.");

  // 3. Write job to featured_jobs_cache
  const cacheJobId = "fp_flis0199_ta_math_sec";
  const cacheData = {
    id: cacheJobId,
    title: "Mathematics Teacher - Secondary School",
    department: "Secondary",
    source: "Teach Away",
    sources: ["Teach Away"],
    sourceUrls: {
      "Teach Away": "https://www.teachaway.com/teaching-jobs-abroad/mathematics-teacher-secondary-school-buenos-aires"
    },
    applyUrl: "https://www.teachaway.com/teaching-jobs-abroad/mathematics-teacher-secondary-school-buenos-aires",
    datePosted: new Date().toISOString(),
    closingDate: "2027-02-28T23:59:59.000Z",
    closingDateMillis: new Date("2027-02-28T23:59:59.000Z").getTime(),
    schoolId: "FLIS0199",
    schoolName: "Northlands School Argentina",
    city: "Buenos Aires",
    country: "Argentina",
    status: "approved",
    ingestedAtMillis: Date.now(),
    isRollingDeadline: false,
    curriculum: "UK/IB",
    schoolRating: 8.2,
    schoolWebsite: "https://www.northlands.edu.ar/en/job-opportunities/",
    isVolatileMarket: true,
    paidInUSD: false,
    savingsPotentialSingle: 850,
    searchTokens: [
      "mathematics", "teacher", "secondary", "school", "northlands", "argentina",
      "buenos", "aires", "uk", "ib", "teach", "away", "flis0199"
    ]
  };

  await db.collection("featured_jobs_cache").doc(cacheJobId).set(cacheData, { merge: true });
  console.log("SUCCESS! Written Teach Away job to featured_jobs_cache linked to FLIS0199.");
}

main().catch(err => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
