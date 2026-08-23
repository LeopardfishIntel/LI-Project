import { isSupportOrNonTeachingRole } from './roleClassifier';

function runTests() {
  console.log('🧪 Running Role Classifier Unit Tests...');
  let passed = 0;
  let failed = 0;

  function assert(actual: boolean, expected: boolean, name: string) {
    if (actual === expected) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} (Expected ${expected}, got ${actual})`);
      failed++;
    }
  }

  // Support / Non-Teaching roles (MUST BE TRUE / EXCLUDED)
  assert(isSupportOrNonTeachingRole('School Nurse'), true, 'School Nurse is support');
  assert(isSupportOrNonTeachingRole('Staff Nurse - Primary Clinic'), true, 'Staff Nurse is support');
  assert(isSupportOrNonTeachingRole('Admissions Executive'), true, 'Admissions Executive is support');
  assert(isSupportOrNonTeachingRole('Assistant Admissions Officer'), true, 'Assistant Admissions Officer is support');
  assert(isSupportOrNonTeachingRole('Admissions Coordinator'), true, 'Admissions Coordinator is support');
  assert(isSupportOrNonTeachingRole('Admin Exec'), true, 'Admin Exec is support');
  assert(isSupportOrNonTeachingRole('Administrative Assistant (Secondary)'), true, 'Admin Assistant is support');
  assert(isSupportOrNonTeachingRole('School Receptionist'), true, 'Receptionist is support');
  assert(isSupportOrNonTeachingRole('Finance Officer'), true, 'Finance Officer is support');
  assert(isSupportOrNonTeachingRole('HR Executive'), true, 'HR Executive is support');
  assert(isSupportOrNonTeachingRole('IT Technician'), true, 'IT Technician is support');
  assert(isSupportOrNonTeachingRole('Bus Driver'), true, 'Bus Driver is support');
  assert(isSupportOrNonTeachingRole('Security Guard'), true, 'Security Guard is support');

  // Academic / Teaching roles (MUST BE FALSE / RETAINED)
  assert(isSupportOrNonTeachingRole('Teacher of English'), false, 'Teacher of English is retained');
  assert(isSupportOrNonTeachingRole('Primary Teacher - August 2026'), false, 'Primary Teacher is retained');
  assert(isSupportOrNonTeachingRole('Secondary PE Teacher'), false, 'Secondary PE Teacher is retained');
  assert(isSupportOrNonTeachingRole('Head of Humanities'), false, 'Head of Humanities is retained');
  assert(isSupportOrNonTeachingRole('Director of Sport'), false, 'Director of Sport is retained');
  assert(isSupportOrNonTeachingRole('Learning Support Teacher'), false, 'Learning Support Teacher is retained');
  assert(isSupportOrNonTeachingRole('Co-TEACHERS'), false, 'Co-TEACHERS is retained');
  assert(isSupportOrNonTeachingRole('Principal'), false, 'Principal is retained');
  assert(isSupportOrNonTeachingRole('Graduate Assistant'), false, 'Graduate Assistant is retained');
  assert(isSupportOrNonTeachingRole('Computer Science Teacher'), false, 'Computer Science Teacher is retained');

  console.log(`\n📊 Role Classifier Test Summary: ${passed} passed, ${failed} failed.`);
}

runTests();
