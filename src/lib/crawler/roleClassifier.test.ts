import { isSupportOrNonTeachingRole, isStrictAcademicTeachingRole } from "./roleClassifier";

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
  assert(isSupportOrNonTeachingRole("Chinese Percussion Instructor"), true, "Chinese Percussion Instructor is non-teaching");
  assert(isSupportOrNonTeachingRole("Piano Tutor"), true, "Piano Tutor is non-teaching");
  assert(isSupportOrNonTeachingRole("Music Teacher"), false, "Music Teacher stays teaching");
  assert(isSupportOrNonTeachingRole("Head of Music"), false, "Head of Music stays teaching");
  assert(isSupportOrNonTeachingRole("Part-time Squash Instructor"), true, "Part-time Squash Instructor is non-teaching");
  assert(isSupportOrNonTeachingRole("Swimming Coach"), true, "Swimming Coach is non-teaching");
  assert(isSupportOrNonTeachingRole("Instructor - Squash"), true, "Instructor - Squash is non-teaching");
  assert(isSupportOrNonTeachingRole("Physical Education Teacher"), false, "PE Teacher stays teaching");
  assert(isSupportOrNonTeachingRole("Secondary Teacher of Physical Education and Swimming"), false, "PE and Swimming teacher stays teaching");
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
  assert(isSupportOrNonTeachingRole("Surveillant(e)"), true, "Surveillant(e) is non-teaching support");
  assert(isSupportOrNonTeachingRole("Surveillant"), true, "Surveillant is non-teaching support");
  assert(isSupportOrNonTeachingRole("Student Supervisor"), true, "Student Supervisor is non-teaching support");
  assert(isSupportOrNonTeachingRole("Lunchtime Supervisor"), true, "Lunchtime Supervisor is non-teaching support");
  assert(isSupportOrNonTeachingRole("Cafeteria(opens in new window/tab)"), true, "Cafeteria link is support");
  assert(isSupportOrNonTeachingRole("Distinguished Speakers Fund"), true, "Giving fund is support");
  assert(isSupportOrNonTeachingRole("Leadership and Service"), true, "Leadership section is support");
  assert(isSupportOrNonTeachingRole("The Arts"), true, "The Arts section is support");
  assert(isSupportOrNonTeachingRole("Live Stream(opens in new window/tab)"), true, "Live Stream widget is support");
  assert(isSupportOrNonTeachingRole("LinkedIn(opens in new window/tab)"), true, "LinkedIn link is support");
  assert(isSupportOrNonTeachingRole("YouTube(opens in new window/tab)"), true, "YouTube link is support");
  // Leadership Welcomes, Governance & Tenders (MUST BE TRUE / EXCLUDED)
  assert(isSupportOrNonTeachingRole("Head's Welcome"), true, "Head's Welcome is rejected");
  assert(isSupportOrNonTeachingRole("Principal's Message"), true, "Principal's Message is rejected");
  assert(isSupportOrNonTeachingRole("Headmaster's Desk"), true, "Headmaster's Desk is rejected");
  assert(isSupportOrNonTeachingRole("Director's Vision"), true, "Director's Vision is rejected");
  assert(isSupportOrNonTeachingRole("Jobs and Tenders"), true, "Jobs and Tenders is rejected");
  assert(isSupportOrNonTeachingRole("Procurement Tender Notice"), true, "Procurement Tender Notice is rejected");
  assert(isSupportOrNonTeachingRole("School History"), true, "School History is rejected");
  assert(isSupportOrNonTeachingRole("Board of Governors"), true, "Board of Governors is rejected");
  assert(isSupportOrNonTeachingRole("Work With Us"), true, "Work With Us header is rejected");

  // Academic / Teaching roles (MUST BE FALSE / RETAINED)
  assert(isSupportOrNonTeachingRole("Teacher of English"), false, "Teacher of English is retained");
  assert(isSupportOrNonTeachingRole("Teacher of Mathematics"), false, "Teacher of Mathematics is retained");
  assert(isSupportOrNonTeachingRole("Head of Science"), false, "Head of Science is retained");
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

  // French teaching titles (Lycee Libanais, Taaleem) are teaching jobs; a French admin title is not
  assert(isStrictAcademicTeachingRole("Professeur d'éducation physique et sportive"), true, "French PE teacher is teaching");
  assert(isStrictAcademicTeachingRole("Professeur des matières MOE"), true, "French 'Professeur des matières MOE' is teaching");
  assert(isStrictAcademicTeachingRole("Enseignant de mathématiques"), true, "French maths teacher is teaching");
  assert(isStrictAcademicTeachingRole("Institutrice maternelle"), true, "French nursery teacher is teaching");
  assert(isStrictAcademicTeachingRole("Comptable"), false, "French accountant is not teaching");
  assert(isStrictAcademicTeachingRole("Accountant"), false, "Accountant is still not teaching");

  // Learning assistants are support staff, not teachers (Taaleem)
  assert(isStrictAcademicTeachingRole("Learning Assistant"), false, "Learning Assistant is support");
  assert(isStrictAcademicTeachingRole("Homeroom Learning Assistant"), false, "Homeroom Learning Assistant is support");
  assert(isStrictAcademicTeachingRole("Learning Assistant - Arabic"), false, "Learning Assistant - Arabic is support");
  assert(isStrictAcademicTeachingRole("Learning Assistant - Librarian (Secondary)"), true, "Learning Assistant - Librarian is kept (Roger, 2026-10-08)");
  assert(isStrictAcademicTeachingRole("Learning Support Assistant"), false, "Learning Support Assistant is still support");
  assert(isStrictAcademicTeachingRole("Homeroom Teacher"), true, "Homeroom Teacher is still teaching");
  assert(isStrictAcademicTeachingRole("Learning Coach"), true, "Learning Coach is still teaching");
  assert(isStrictAcademicTeachingRole("Librarian"), true, "Librarian is still kept");

  console.log("\n📊 Role Classifier Test Summary: " + passed + " passed, " + failed + " failed.\n");
}

runTests();
