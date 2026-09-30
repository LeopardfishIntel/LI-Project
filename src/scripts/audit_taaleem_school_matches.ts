import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import { matchSchoolEntity, SchoolEntity } from '../lib/crawler/entityMatcher';
import { isTaaleemSchool } from '../lib/search/taaleem';

const require = createRequire(import.meta.url);
const serviceAccount = require('../../service-account.json');
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

interface TaaleemAuditRow {
  docId: string;
  jobId?: string;
  title?: string;
  storedSchoolId?: string;
  storedSchoolName?: string;
  storedCity?: string;
  storedCountry?: string;
  applyUrl?: string;
  bestMatch: {
    schoolId?: string;
    schoolName?: string;
    city?: string;
    country?: string;
    score: number;
    matchType: string;
    confidence: string;
    reason?: string;
  } | null;
  flags: string[];
}

async function auditTaaleemSchoolMatches() {
  console.log('🔍 Starting Read-Only Taaleem School Matches Audit...');

  // 1. Load all school docs into SchoolEntity[]
  console.log('📡 Fetching canonical schools from Firestore...');
  const schoolsSnap = await db.collection('schools').get();
  const schoolEntities: SchoolEntity[] = schoolsSnap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || data.schoolname || '',
      schoolname: data.schoolname || data.name || '',
      city: data.city || '',
      country: data.country || '',
      aliases: Array.isArray(data.aliases) ? data.aliases : [],
      legalNames: Array.isArray(data.legalNames) ? data.legalNames : (Array.isArray(data.legal_names) ? data.legal_names : []),
      tesEmployerSlug: data.tesEmployerSlug || data.tes_slug || '',
      tesOrganizationId: data.tesOrganizationId || '',
      schroleAccountId: data.schroleAccountId || '',
      isSecondaryOnly: !!data.isSecondaryOnly,
      isPrimaryOnly: !!data.isPrimaryOnly,
      group: data.group || data.schoolGroup || '',
      schoolGroup: data.schoolGroup || data.group || ''
    } as any;
  });
  console.log(`✅ Loaded ${schoolEntities.length} schools.`);

  // 2. Load all featured_jobs_cache docs and filter to Taaleem-engine jobs
  console.log('📡 Fetching featured_jobs_cache records...');
  const jobsSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📡 Total featured_jobs_cache docs found: ${jobsSnap.docs.length}`);

  const taaleemJobs: Array<{ docId: string; data: any }> = [];
  for (const doc of jobsSnap.docs) {
    const d = doc.data();
    const docId = doc.id;
    const sourceStr = String(d.source || '').toLowerCase();
    const groupStr = String(d.group || '').toLowerCase();
    const ownershipStr = String(d.ownership || '').toLowerCase();

    const isDocIdTaaleem = docId.startsWith('taaleem_');
    const mentionsTaaleem = sourceStr.includes('taaleem') || groupStr.includes('taaleem') || ownershipStr.includes('taaleem');
    const isTaaleemFn = isTaaleemSchool(d.schoolId, d.schoolName, d.group || d.ownership);

    if (isDocIdTaaleem || mentionsTaaleem || isTaaleemFn) {
      taaleemJobs.push({ docId, data: d });
    }
  }
  console.log(`🎯 Filtered to ${taaleemJobs.length} Taaleem-engine job records.`);

  // 3. For each, re-run matchSchoolEntity() against every school using stored schoolName as candidateText
  let fallbackSchoolCount = 0;
  let schoolMismatchCount = 0;
  let lowConfidenceCount = 0;
  let matchCorrectCount = 0;

  const results: TaaleemAuditRow[] = [];

  for (const { docId, data } of taaleemJobs) {
    const candidateText = data.schoolName || data.companyName || data.name || '';
    const storedSchoolId = data.schoolId || '';
    const storedSchoolName = data.schoolName || '';
    const applyUrl = data.applyUrl || data.url || data.directUrl || '';
    const city = data.city || '';
    const country = data.country || '';

    let bestResult: {
      school: SchoolEntity;
      score: number;
      matchType: string;
      confidence: string;
      reason?: string;
    } | null = null;

    for (const school of schoolEntities) {
      const match = matchSchoolEntity(
        school,
        {
          candidateText,
          sourceUrl: applyUrl,
          city,
          country
        }
      );

      if (match.isMatch && (!bestResult || match.score > bestResult.score)) {
        bestResult = {
          school,
          score: match.score,
          matchType: match.matchType,
          confidence: match.confidence,
          reason: match.reason
        };
      }
    }

    const flags: string[] = [];

    // Flag 1: FALLBACK_SCHOOL (stored schoolId === "FLIS0104")
    if (storedSchoolId === 'FLIS0104') {
      flags.push('FALLBACK_SCHOOL');
      fallbackSchoolCount++;
    }

    // Flag 2: SCHOOL_MISMATCH (best match is a different school at score >= 0.9)
    if (bestResult && bestResult.score >= 0.9 && bestResult.school.id && bestResult.school.id !== storedSchoolId) {
      flags.push('SCHOOL_MISMATCH');
      schoolMismatchCount++;
    }

    // Flag 3: LOW_CONFIDENCE (no high-confidence match found)
    if (!bestResult || bestResult.confidence !== 'high' || bestResult.score < 0.85) {
      flags.push('LOW_CONFIDENCE');
      lowConfidenceCount++;
    }

    if (flags.length === 0) {
      matchCorrectCount++;
    }

    results.push({
      docId,
      jobId: data.jobId || data.id,
      title: data.title || data.rawTitle,
      storedSchoolId,
      storedSchoolName,
      storedCity: city,
      storedCountry: country,
      applyUrl,
      bestMatch: bestResult
        ? {
            schoolId: bestResult.school.id,
            schoolName: bestResult.school.name || bestResult.school.schoolname,
            city: bestResult.school.city,
            country: bestResult.school.country,
            score: bestResult.score,
            matchType: bestResult.matchType,
            confidence: bestResult.confidence,
            reason: bestResult.reason
          }
        : null,
      flags
    });
  }

  // 4. Write JSON report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.resolve(process.cwd(), 'src/scripts/output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, `taaleem_school_audit_${timestamp}.json`);

  const report = {
    auditTimestamp: new Date().toISOString(),
    totalTaaleemJobsAudited: taaleemJobs.length,
    summary: {
      FALLBACK_SCHOOL: fallbackSchoolCount,
      SCHOOL_MISMATCH: schoolMismatchCount,
      LOW_CONFIDENCE: lowConfidenceCount,
      NO_FLAGS: matchCorrectCount
    },
    results
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');

  // 5. Print summary
  console.log('\n================ TAALEEM MATCH AUDIT SUMMARY ================');
  console.log(`📁 Report written to: ${outputPath}`);
  console.log(`📊 Total Taaleem Jobs Audited: ${taaleemJobs.length}`);
  console.log(`🚩 FALLBACK_SCHOOL (FLIS0104): ${fallbackSchoolCount}`);
  console.log(`⚠️  SCHOOL_MISMATCH (best match != stored, score >= 0.9): ${schoolMismatchCount}`);
  console.log(`❓ LOW_CONFIDENCE (no high-confidence match found): ${lowConfidenceCount}`);
  console.log(`✅ UNFLAGGED / CLEAN: ${matchCorrectCount}`);
  console.log('===============================================================\n');
}

auditTaaleemSchoolMatches().catch(err => {
  console.error('Taaleem audit failed:', err);
  process.exit(1);
});
