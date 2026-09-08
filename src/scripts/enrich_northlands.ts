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
  console.log("Enriching Northlands School Argentina (FLIS0199)...");
  
  const enrichmentData = {
    housingBenefit: "Furnished accommodation provided + housing & relocation support",
    housingprovision: "Provided (Furnished Accommodation)",
    housingProvided: true,
    healthcoverage: "Comprehensive private medical insurance for employee and eligible dependents",
    travelBenefit: "School-funded flights at beginning and end of contract",
    relocationBenefit: "One-month settling-in allowance + full visa sponsorship & reimbursement + relocation assistance",
    perks: "Complimentary lunch on school days, free Nordelta campus staff transport, weekly Spanish lessons, contract renewal bonus",
    holidayEntitlement: "Winter Break (~3 wks), Spring Break (1 wk), Summer (~6-7 wks)",
    jobRequirements: {
      eligibleCandidates: "Certified Teacher",
      minEducation: "Bachelor Degree",
      minExperience: "5+ years teaching experience",
      credentials: "Teaching Credential / License",
      curriculaPreference: "Secondary level IGCSE, GCSE, A-Level, IB or international curricula"
    },
    benefitsSummary: [
      "Competitive international salary package",
      "Furnished accommodation provided",
      "School-funded flights at beginning and end of contract",
      "One-month settling-in allowance upon arrival",
      "Comprehensive private medical insurance for employee and eligible dependents",
      "Full visa sponsorship and immigration support (including expense reimbursement)",
      "Relocation assistance",
      "Complimentary lunch provided during school days",
      "Free transportation for staff at Nordelta campus",
      "Weekly Spanish language lessons",
      "Generous holiday entitlement (~10-11 weeks total)",
      "Contract renewal bonus for extensions"
    ],
    researchNotes: "Enriched with complete Expatriate Package & Benefits: Furnished accommodation, start/end flights, 1-month settling-in allowance, full private medical insurance for family, visa sponsorship, school lunches, Nordelta transport, Spanish lessons, contract renewal bonus.",
    updatedAt: new Date().toISOString()
  };

  await db.collection("schools").doc("FLIS0199").set(enrichmentData, { merge: true });
  console.log("SUCCESSFULLY enriched FLIS0199 (Northlands School Argentina) in Firestore!");
}

main().catch(err => {
  console.error("Enrichment failed:", err);
  process.exit(1);
});
