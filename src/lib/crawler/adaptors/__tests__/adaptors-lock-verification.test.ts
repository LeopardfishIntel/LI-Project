import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { extractJobPostingsFromHtml } from '../tes-adaptor';
import { hasClosedPositionNegativeBanner } from '../adaptor-utils';
import { isSupportOrNonTeachingRole } from '../../roleClassifier';

async function runAdaptorLockVerificationTestSuite() {
  console.log('================================================================');
  console.log('🧪 ADAPTOR DOM LOCK & 4-STEP PIPELINE VERIFICATION TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assertEqual(actual: any, expected: any, testName: string) {
    if (actual === expected) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} (Expected: ${expected}, Got: ${actual})`);
      failed++;
    }
  }

  // ── TEST 1: Negative Control Test (Informational Page Payload) ─────────────
  console.log('1️⃣ Running Test 1: Negative Control Test (Informational Page)...');
  try {
    const informationalHtmlPayload = `
      <!DOCTYPE html>
      <html>
        <head><title>Welcome to UWCSEA - About Us</title></head>
        <body>
          <h1>Welcome to UWC South East Asia</h1>
          <p>UWCSEA is a mission-driven international school in Singapore serving students from K-12.</p>
          <div class="footer-links">
            <a href="/about/our-history">Our History</a>
            <a href="/about/governance">Governance</a>
          </div>
        </body>
      </html>
    `;

    // Step 2: Structured schema extraction
    const jsonLdPostings = extractJobPostingsFromHtml(informationalHtmlPayload);
    
    // Step 3/4: Academic role heading check
    const pageTitle = "Welcome to UWCSEA - About Us";
    const isAcademicJobHeading = !isSupportOrNonTeachingRole(pageTitle) && (pageTitle.includes("Teacher") || pageTitle.includes("Head of"));

    const isAcceptedJobPage = jsonLdPostings.length > 0 || isAcademicJobHeading;

    assertEqual(isAcceptedJobPage, false, 'Reject informational page missing academic role headings and apply CTAs');
  } catch (err: any) {
    console.error('  ⚠️ Exception in Test 1:', err.message || err);
    failed++;
  }

  // ── TEST 2: Expired Vacancy Banner Test ────────────────────────────────────
  console.log('\n2️⃣ Running Test 2: Expired Vacancy Negative Signal Test...');
  try {
    const expiredHtmlPayload = `
      <!DOCTYPE html>
      <html>
        <head><title>Teacher of Science - Expired</title></head>
        <body>
          <div class="banner-alert alert-warning">
            This position is no longer accepting applications.
          </div>
          <h1>Teacher of Science</h1>
          <p>Thank you for your interest. This vacancy is now closed.</p>
        </body>
      </html>
    `;

    const isClosedDetected = hasClosedPositionNegativeBanner(expiredHtmlPayload);
    assertEqual(isClosedDetected, true, 'Detect "This position is no longer accepting applications" banner and flag negative signal');
  } catch (err: any) {
    console.error('  ⚠️ Exception in Test 2:', err.message || err);
    failed++;
  }

  // ── TEST 3: Structured Schema Extraction Test ─────────────────────────────
  console.log('\n3️⃣ Running Test 3: Structured Schema Extraction Test (JobPosting JSON-LD)...');
  try {
    const workdayLeverHtmlPayload = `
      <!DOCTYPE html>
      <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org/",
            "@type": "JobPosting",
            "title": "Teacher of Mathematics",
            "datePosted": "2026-08-30",
            "validThrough": "2026-09-30T23:59:59Z",
            "description": "We are seeking an outstanding Teacher of Mathematics.",
            "hiringOrganization": {
              "@type": "Organization",
              "name": "British School Muscat"
            },
            "jobLocation": {
              "@type": "Place",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Muscat",
                "addressCountry": "Oman"
              }
            }
          }
          </script>
        </head>
        <body>
          <h1>Teacher of Mathematics</h1>
        </body>
      </html>
    `;

    const schemaPostings = extractJobPostingsFromHtml(workdayLeverHtmlPayload);
    const hasJobPosting = schemaPostings.length === 1 && schemaPostings[0]["@type"] === "JobPosting";
    const extractedTitle = hasJobPosting ? schemaPostings[0].title : null;
    const extractedValidThrough = hasJobPosting ? schemaPostings[0].validThrough : null;

    assertEqual(hasJobPosting, true, 'Extract @type: "JobPosting" structured JSON-LD schema cleanly');
    assertEqual(extractedTitle, 'Teacher of Mathematics', 'Extract exact position title from JSON-LD schema');
    assertEqual(extractedValidThrough, '2026-09-30T23:59:59Z', 'Extract exact validThrough closing date from JSON-LD schema');
  } catch (err: any) {
    console.error('  ⚠️ Exception in Test 3:', err.message || err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`📊 ADAPTOR LOCK TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdaptorLockVerificationTestSuite().catch(console.error);
