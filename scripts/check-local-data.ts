import { 
  NEW_LOCATIONS_COST_OF_LIVING, 
  NEW_TEACHER_REQUIREMENTS 
} from "../src/lib/data/new-destinations-data";

function checkLocalDataCompleteness() {
  console.log("\n🔍 Checking Local Data Objects for Missing Fields...\n");

  const requiredColKeys = [
    "monthlyRent1BR", "monthlyRent2BR", "monthlyRent3BR", 
    "utilitiesMonthly", "foodGroceries", "transportPass", "currencyCode"
  ];

  const requiredReqKeys = [
    "minExperienceYears", "licenseRequired", "degreeLegalizationPath", "maxAgeLimit"
  ];

  let missingCount = 0;

  // 1. Audit Cost of Living
  Object.entries(NEW_LOCATIONS_COST_OF_LIVING).forEach(([country, data]) => {
    const missing = requiredColKeys.filter(key => (data as any)[key] === undefined || (data as any)[key] === null);
    if (missing.length > 0) {
      missingCount++;
      console.log(`❌ [COL MISSING] ${country}: Missing -> ${missing.join(", ")}`);
    }
  });

  // 2. Audit Visa Requirements
  Object.entries(NEW_TEACHER_REQUIREMENTS).forEach(([country, data]) => {
    const missing = requiredReqKeys.filter(key => (data as any)[key] === undefined || (data as any)[key] === null);
    if (missing.length > 0) {
      missingCount++;
      console.log(`❌ [REQUIREMENTS MISSING] ${country}: Missing -> ${missing.join(", ")}`);
    }
  });

  if (missingCount === 0) {
    console.log("✅ 100% Complete! Zero missing fields across all local data objects.\n");
  }
}

checkLocalDataCompleteness();
