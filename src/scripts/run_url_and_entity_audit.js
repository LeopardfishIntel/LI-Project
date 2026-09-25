const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('../../service-account.json');
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

const exportPath = path.resolve(process.cwd(), 'public/complete_school_fields_export.json');
const schools = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));

// Modern fast fetch test with AbortSignal timeout
async function testUrl(targetUrl) {
  if (!targetUrl || typeof targetUrl !== 'string' || targetUrl.trim() === '') {
    return { status: 'MISSING', code: null, error: 'Empty URL' };
  }

  let formatted = targetUrl.trim();
  if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
    formatted = 'https://' + formatted;
  }

  try {
    const res = await fetch(formatted, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(3000),
      redirect: 'follow'
    });

    if (res.status >= 200 && res.status < 400) {
      return { status: 'OK', code: res.status };
    } else if (res.status === 403 || res.status === 401) {
      return { status: 'PROTECTED', code: res.status }; // Cloudflare/Akamai bot wall
    } else {
      return { status: 'FAILED', code: res.status };
    }
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return { status: 'TIMEOUT', error: 'Timed out (>3s)' };
    }
    return { status: 'ERROR', error: err.code || err.message };
  }
}

// Map concurrent worker with progress
async function mapConcurrent(items, limit, fn, label) {
  const results = new Array(items.length);
  let index = 0;
  let completed = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
      completed++;
      if (completed % 100 === 0 || completed === items.length) {
        console.log(`   [${label}] Checked ${completed}/${items.length}...`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function runAudit() {
  console.log('================================================================');
  console.log('🤖 PART 1: ENTITY RECONCILIATION & VACANCY LINKAGE AUDIT');
  console.log('================================================================\n');

  const canonicalIdSet = new Set(schools.map(s => s.id));
  const canonicalNameMap = new Map(schools.map(s => [s.id, s.name]));

  // Check featured_jobs_cache collection in Firestore
  const jobsSnap = await db.collection('featured_jobs_cache').get();
  console.log(`Total Cached Live Jobs in Firestore: ${jobsSnap.size}\n`);

  const orphanJobs = [];
  const validJobs = [];

  jobsSnap.forEach(doc => {
    const job = doc.data();
    const sId = job.schoolId || job.school_id || job.flicId;
    
    if (!sId || !canonicalIdSet.has(sId)) {
      orphanJobs.push({
        jobDocId: doc.id,
        title: job.title || job.jobTitle,
        unmatchedSchoolId: sId,
        schoolName: job.schoolName || job.school_name || job.companyName
      });
    } else {
      validJobs.push({
        jobDocId: doc.id,
        title: job.title || job.jobTitle,
        schoolId: sId,
        canonicalName: canonicalNameMap.get(sId)
      });
    }
  });

  console.log(`✅ Validly Linked Jobs: ${validJobs.length} (${((validJobs.length / Math.max(1, jobsSnap.size)) * 100).toFixed(1)}%)`);
  console.log(`❌ Orphan / Unlinked Jobs: ${orphanJobs.length}`);

  if (orphanJobs.length > 0) {
    console.log('\n--- Orphan Jobs Breakdown ---');
    orphanJobs.slice(0, 10).forEach(o => {
      console.log(`  - Job: "${o.title}" | Given School ID: "${o.unmatchedSchoolId}" | Named: "${o.schoolName}"`);
    });
    if (orphanJobs.length > 10) console.log(`  ... and ${orphanJobs.length - 10} more.`);
  }

  // Count active vacancies listed per school
  let schoolsWithActiveJobs = 0;
  let totalScrapedJobsListed = 0;
  schools.forEach(s => {
    const list = s.scrapedJobsList || [];
    if (list.length > 0) {
      schoolsWithActiveJobs++;
      totalScrapedJobsListed += list.length;
    }
  });

  console.log(`\n🏫 Schools with Active Grounded Vacancies in Export: ${schoolsWithActiveJobs} schools (${totalScrapedJobsListed} total positions).\n`);

  console.log('================================================================');
  console.log('🌐 PART 2: BROKEN URLS & CAREERS PORTAL LINK SWEEP (459 SCHOOLS)');
  console.log('================================================================\n');

  console.log('⏳ Probing official websites (Concurrency: 60)...');
  const websiteResults = await mapConcurrent(schools, 60, async (s) => {
    const webRes = await testUrl(s.website);
    return { id: s.id, name: s.name, country: s.country, url: s.website, type: 'website', ...webRes };
  }, 'Websites');

  console.log('\n⏳ Probing careers portal URLs (Concurrency: 60)...');
  const careersResults = await mapConcurrent(schools, 60, async (s) => {
    const carUrl = s.careersPageUrl || s.careersUrl;
    const carRes = await testUrl(carUrl);
    return { id: s.id, name: s.name, country: s.country, url: carUrl, type: 'careers', ...carRes };
  }, 'Careers');

  const brokenWebsites = websiteResults.filter(r => r.status === 'FAILED' || r.status === 'ERROR' || r.status === 'MISSING');
  const brokenCareers = careersResults.filter(r => r.status === 'FAILED' || r.status === 'ERROR' || r.status === 'MISSING');
  const timedOutWeb = websiteResults.filter(r => r.status === 'TIMEOUT');
  const timedOutCar = careersResults.filter(r => r.status === 'TIMEOUT');
  const protectedWeb = websiteResults.filter(r => r.status === 'PROTECTED');
  const protectedCar = careersResults.filter(r => r.status === 'PROTECTED');

  console.log(`\n📊 WEBSITES SWEEP SUMMARY:`);
  console.log(`   - Total Checked: ${websiteResults.length}`);
  console.log(`   - HTTP 2xx/3xx (Healthy): ${websiteResults.length - brokenWebsites.length - timedOutWeb.length - protectedWeb.length}`);
  console.log(`   - Protected / Bot-Filtered (403/401): ${protectedWeb.length}`);
  console.log(`   - Timed Out (>3s): ${timedOutWeb.length}`);
  console.log(`   - Dead / Broken / Missing: ${brokenWebsites.length}`);

  console.log(`\n📊 CAREERS PORTALS SWEEP SUMMARY:`);
  console.log(`   - Total Checked: ${careersResults.length}`);
  console.log(`   - HTTP 2xx/3xx (Healthy): ${careersResults.length - brokenCareers.length - timedOutCar.length - protectedCar.length}`);
  console.log(`   - Protected / Bot-Filtered (403/401): ${protectedCar.length}`);
  console.log(`   - Timed Out (>3s): ${timedOutCar.length}`);
  console.log(`   - Dead / Broken / Missing: ${brokenCareers.length}\n`);

  if (brokenWebsites.length > 0) {
    console.log(`❌ Dead / Broken Websites (${brokenWebsites.length}):`);
    brokenWebsites.forEach(b => console.log(`   - [${b.id}] ${b.name} (${b.country}): ${b.url || '(Empty)'} -> [${b.status}] ${b.code || b.error}`));
    console.log('\n');
  }

  if (brokenCareers.length > 0) {
    console.log(`❌ Dead / Broken Careers URLs (${brokenCareers.length}):`);
    brokenCareers.forEach(b => console.log(`   - [${b.id}] ${b.name} (${b.country}): ${b.url || '(Empty)'} -> [${b.status}] ${b.code || b.error}`));
    console.log('\n');
  }

  // Save report to scratch JSON for detailed inspection
  const report = {
    timestamp: new Date().toISOString(),
    brokenWebsites,
    brokenCareers,
    timedOutWeb,
    timedOutCar,
    orphanJobs
  };
  fs.writeFileSync(path.resolve(process.cwd(), 'scratch_link_audit_report.json'), JSON.stringify(report, null, 2));
  console.log(`💾 Saved full breakdown to scratch_link_audit_report.json`);
}

runAudit().catch(console.error);

