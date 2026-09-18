import { getAdminDb } from "../../src/firebase/admin";
import { GEMS_SCHOOL_COMPANY_MAP } from "../../src/lib/search/gems";

async function patchSeedNames() {
  const db = getAdminDb();
  if (!db) {
    console.error("❌ Firestore Admin DB unavailable.");
    process.exit(1);
  }
  const batch = db.batch();
  for (const [id, name] of Object.entries(GEMS_SCHOOL_COMPANY_MAP)) {
    const ref = db.collection("schools").doc(id);
    const city = name.includes("ABU DHABI") 
      ? "Abu Dhabi" 
      : name.includes("QATAR") 
      ? "Doha" 
      : name.includes("SHARJAH") 
      ? "Sharjah" 
      : name.includes("RAK") 
      ? "Ras Al Khaimah" 
      : name.includes("FUJAIRAH") 
      ? "Fujairah" 
      : "Dubai";
    const country = name.includes("QATAR") ? "Qatar" : "United Arab Emirates";
    
    batch.set(ref, { schoolname: name, name, schoolGroup: "GEMS Education", city, country }, { merge: true });
  }
  await batch.commit();
  console.log("✅ Patched GEMS seed school names in Firestore.");
}

patchSeedNames()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error patching seed names:", err);
    process.exit(1);
  });
