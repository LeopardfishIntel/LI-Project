import { getAdminDb } from "../src/firebase/admin";
import { isValidJobTitle } from "../src/lib/crawler/titleSanitizer";

async function verifyParity() {
  const db = getAdminDb();
  if (!db) {
    console.error("❌ Firestore Admin DB unavailable.");
    process.exit(1);
  }

  const cacheSnap = await db.collection("featured_jobs_cache").get();
  
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
  const mismatches: any[] = [];
  let totalReported = 0;
  let totalActual = 0;

  schoolSnap.docs.forEach((doc: any) => {
    const sData = doc.data();
    const sId = (sData.schoolId || doc.id).toUpperCase().trim();
    const actual = countsBySchool[sId] || 0;
    const reported = typeof sData.openJobsCount === "number" ? sData.openJobsCount : actual;
    
    totalReported += reported;
    totalActual += actual;

    if (actual !== reported) {
      mismatches.push({
        id: sId,
        name: sData.schoolname || sData.name,
        actualCache: actual,
        reportedSchoolDoc: reported
      });
    }
  });

  console.log("\n================= PARITY AUDIT RESULTS =================");
  console.log(`Total Valid Cache Jobs (Across all Schools): ${Object.values(countsBySchool).reduce((a, b) => a + b, 0)}`);
  console.log(`Total School Doc openJobsCount Sum: ${totalReported}`);
  console.log(`Total Mismatches: ${mismatches.length}`);

  const targetIds = [
    "FLIS0006", "FLIS0028", "FLIS0092", "FLIS0110", "FLIS0111",
    "FLIS0114", "FLIS0120", "FLIS0121", "FLIS0123", "FLIS0134",
    "FLIS0135", "FLIS0136", "FLIS0162", "FLIS0170"
  ];

  console.log("\n--- Target Schools Status ---");
  targetIds.forEach(id => {
    const sDoc = schoolSnap.docs.find((d: any) => (d.data().schoolId || d.id).toUpperCase().trim() === id);
    const sData = sDoc?.data() || {};
    const actual = countsBySchool[id] || 0;
    const reported = sData.openJobsCount;
    console.log(`[${id}] ${sData.schoolname || sData.name}: Cache=${actual} vs School=${reported} | Status: ${actual === reported ? "✅ PERFECT MATCH" : "❌ MISMATCH"}`);
  });

  if (mismatches.length === 0) {
    console.log(`\n🎉 100% PERFECT DATA PARITY ACHIEVED ACROSS ALL ${schoolSnap.size} SCHOOLS!`);
  } else {
    console.error("\nRemaining mismatches:", mismatches);
    process.exit(1);
  }
}

verifyParity()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
