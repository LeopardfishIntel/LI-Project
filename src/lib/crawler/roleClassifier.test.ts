import { isSupportOrNonTeachingRole } from "./roleClassifier";

function runTests() {
  console.log("🧪 Running Expanded Role Classifier Unit Tests...");
  let passed = 0;
  let failed = 0;

  function assert(actual: boolean, expected: boolean, name: string) {
    if (actual === expected) {
      console.log("  ✅ PASS: " + name);
      passed++;
    } else {
      console.error("  ❌ FAIL: " + name + " (Expected " + expected + ", got " + actual + ")");
      failed++;
    }
  }

  // Executive / Corporate / Support roles (MUST BE TRUE / EXCLUDED)
  assert(isSupportOrNonTeachingRole("Chief Financial Officer (CFO)"), true, "Chief Financial Officer (CFO) is support");
  assert(isSupportOrNonTeachingRole("Chief Financial Officer"), true, "Chief Financial Officer is support");
  assert(isSupportOrNonTeachingRole("CFO"), true, "CFO is support");
  assert(isSupportOrNonTeachingRole("Financial Analyst"), true, "Financial Analyst is support");
  assert(isSupportOrNonTeachingRole("Business Analyst"), true, "Business Analyst is support");
  assert(isSupportOrNonTeachingRole("Director of Finance and Operations"), true, "Director of Finance is support");
  assert(isSupportOrNonTeachingRole("Finance Manager"), true, "Finance Manager is support");
  assert(isSupportOrNonTeachingRole("School Nurse"), true, "School Nurse is support");
  assert(isSupportOrNonTeachingRole("Admissions Executive"), true, "Admissions Executive is support");
  assert(isSupportOrNonTeachingRole("Assistant Admissions Officer"), true, "Assistant Admissions Officer is support");
  assert(isSupportOrNonTeachingRole("Admin Exec"), true, "Admin Exec is support");
  assert(isSupportOrNonTeachingRole("Administrative Assistant (Secondary)"), true, "Admin Assistant is support");
  assert(isSupportOrNonTeachingRole("Housekeeping Manager"), true, "Housekeeping Manager is support");
  assert(isSupportOrNonTeachingRole("School Receptionist"), true, "Receptionist is support");
  assert(isSupportOrNonTeachingRole("IT Technician"), true, "IT Technician is support");
  assert(isSupportOrNonTeachingRole("Bus Driver"), true, "Bus Driver is support");

  // Academic / Teaching roles (MUST BE FALSE / RETAINED)
  assert(isSupportOrNonTeachingRole("Teacher of English"), false, "Teacher of English is retained");
  assert(isSupportOrNonTeachingRole("Primary Teacher - August 2026"), false, "Primary Teacher is retained");
  assert(isSupportOrNonTeachingRole("Secondary PE Teacher"), false, "Secondary PE Teacher is retained");
  assert(isSupportOrNonTeachingRole("Head of Humanities"), false, "Head of Humanities is retained");
  assert(isSupportOrNonTeachingRole("Head of Music"), false, "Head of Music is retained");
  assert(isSupportOrNonTeachingRole("Director of Sport"), false, "Director of Sport is retained");
  assert(isSupportOrNonTeachingRole("Learning Support Teacher"), false, "Learning Support Teacher is retained");
  assert(isSupportOrNonTeachingRole("Co-TEACHERS"), false, "Co-TEACHERS is retained");
  assert(isSupportOrNonTeachingRole("Principal"), false, "Principal is retained");
  assert(isSupportOrNonTeachingRole("Head of Secondary School"), false, "Head of Secondary School is retained");
  assert(isSupportOrNonTeachingRole("Teacher of Business and Economics"), false, "Teacher of Business is retained");
  assert(isSupportOrNonTeachingRole("Teacher of Accounting"), false, "Teacher of Accounting is retained");
  assert(isSupportOrNonTeachingRole("MYP - Science Teacher"), false, "MYP Science Teacher is retained");

  console.log("\n📊 Role Classifier Test Summary: " + passed + " passed, " + failed + " failed.\n");
}

runTests();
