import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import { matchSchoolEntity, SchoolEntity } from '../lib/crawler/entityMatcher';
import { isTaaleemSchool } from '../lib/search/taaleem';
import { isMalvernCampus } from '../lib/search/malvern';

const require = createRequire(import.meta.url);
const serviceAccount = require('../../service-account.json');
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

interface EngineAuditRow {
  docId: string;
  engine: string;
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

interface EngineSummary {
  engine: string;
  total: number;
  fallbackSentinel: number;
  schoolMismatch: number;
  lowConfidence: number;
  clean: number;
}

/**
 * Classifies which engine created a job record, mirroring syncSchoolOpenJobCounters in pipeline3-janitor.ts
 */
function classifyEngine(docId: string, cacheDoc: any): string {
  const sourceUpper = String(cacheDoc.source || cacheDoc.engine || 'Direct').toUpperCase();
  const applyUrlLower = String(cacheDoc.applyUrl || cacheDoc.source_url || '').toLowerCase();
  const schoolNameUpper = String(cacheDoc.schoolName || cacheDoc.schoolname || cacheDoc.name || '').toUpperCase();
  const schoolGroupUpper = String(cacheDoc.schoolGroup || cacheDoc.group || '').toUpperCase();
  const sIdUpper = String(cacheDoc.schoolId || '').toUpperCase();
  const docIdLower = docId.toLowerCase();

  // Engine detection checks matching pipeline3-janitor.ts
  const isTes = sourceUpper.includes('TES') || applyUrlLower.includes('tes.com') || docIdLower.startsWith('tes_');
  const isNae = sourceUpper.includes('NORD ANGLIA') || applyUrlLower.includes('nordanglia.com') || applyUrlLower.includes('nordangliaeducation.com');
  const isGrc = sourceUpper.includes('GRC') || applyUrlLower.includes('grcfair.org');
  const isInspired = sourceUpper.includes('INSPIRED') || applyUrlLower.includes('inspirededu.com');
  const isTeachAway = sourceUpper.includes('TEACH AWAY') || applyUrlLower.includes('teachaway.com') || docIdLower.startsWith('ta_');
  const isCognita = sourceUpper.includes('COGNITA') || applyUrlLower.includes('cognitapeople.csod.com');
  const isMalvern = sourceUpper.includes('MALVERN') || applyUrlLower.includes('malverncollege') || isMalvernCampus(sIdUpper, schoolNameUpper, schoolGroupUpper);
  const isUwc = sourceUpper.includes('UWC') || sourceUpper.includes('UNITED WORLD COLLEGE') || applyUrlLower.includes('uwc.org');
  const isIsp = sourceUpper.includes('ISP') || sourceUpper.includes('INTERNATIONAL SCHOOLS PARTNERSHIP') || applyUrlLower.includes('internationalschools.wd3.myworkdayjobs.com');
  const isGlobe = sourceUpper.includes('GLOBE') || sourceUpper.includes('GLOBEDUCATE') || applyUrlLower.includes('globeducate');
  const isTaylors = sourceUpper.includes('TAYLOR') || applyUrlLower.includes('taylors');
  const isEsf = sourceUpper.includes('ESF') || sourceUpper.includes('ENGLISH SCHOOLS FOUNDATION') || applyUrlLower.includes('esf.edu.hk') || applyUrlLower.includes('esf.org.hk');
  const isGems = sourceUpper.includes('GEMS') || applyUrlLower.includes('gemseducation') || applyUrlLower.includes('gems.ae') || docIdLower.startsWith('gems_');
  const isTaaleem = docIdLower.startsWith('taaleem_') || isTaaleemSchool(sIdUpper, schoolNameUpper, schoolGroupUpper) || sourceUpper.includes('TAALEEM') || applyUrlLower.includes('taaleem.ae');
  const isGuardian = sourceUpper.includes('GUARDIAN') || applyUrlLower.includes('theguardian.com') || applyUrlLower.includes('guardianjobs');
  const isEureka = sourceUpper.includes('EUREKA');
  const isSearch = sourceUpper.includes('SEARCH') || applyUrlLower.includes('searchassociates') || sIdUpper === 'SEARCH_ASSOCIATES_HUB';
  const isOfficial = sourceUpper.includes('OFFICIAL') || sourceUpper.includes('WEBSITE') || sourceUpper.includes('DIRECT') || sourceUpper.includes('SCHOOL');

  if (isTaaleem) return 'Taaleem';
  if (isTes) return 'TES';
  if (isGems) return 'GEMS';
  if (isNae) return 'Nord Anglia';
  if (isTeachAway) return 'Teach Away';
  if (isCognita) return 'Cognita';
  if (isInspired) return 'Inspired';
  if (isSearch) return 'Search Associates';
  if (isGuardian) return 'Guardian';
  if (isGrc) return 'GRC';
  if (isIsp) return 'ISP';
  if (isGlobe) return 'Globeducate';
  if (isTaylors) return 'Taylors';
  if (isEsf) return 'ESF';
  if (isMalvern) return 'Malvern';
  if (isUwc) return 'UWC';
  if (isEureka) return 'Eureka';
  if (isOfficial) return 'Official / Direct';

  return 'Other / Unknown';
}

async function auditAllEnginesSchoolMatches() {
  console.log('🔍 Starting Read-Only All-Engines School Matches Audit...');

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

  // 2. Load all featured_jobs_cache docs without status filter
  console.log('📡 Fetching all featured_jobs_cache records (no status filter)...');
  const jobsSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📡 Total featured_jobs_cache records loaded: ${jobsSnap.docs.length}`);

  const engineStats: Record<string, EngineSummary> = {};
  const getOrCreateStats = (eng: string): EngineSummary => {
    if (!engineStats[eng]) {
      engineStats[eng] = {
        engine: eng,
        total: 0,
        fallbackSentinel: 0,
        schoolMismatch: 0,
        lowConfidence: 0,
        clean: 0,
      };
    }
    return engineStats[eng];
  };

  const flaggedRows: EngineAuditRow[] = [];
  const allRows: EngineAuditRow[] = [];

  for (const doc of jobsSnap.docs) {
    const data = doc.data();
    const docId = doc.id;
    const engine = classifyEngine(docId, data);
    const stats = getOrCreateStats(engine);
    stats.total++;

    const candidateText = data.schoolName || data.schoolname || data.companyName || data.name || '';
    const storedSchoolId = data.schoolId || '';
    const storedSchoolName = data.schoolName || data.schoolname || '';
    const applyUrl = data.applyUrl || data.url || data.directUrl || '';
    const city = data.city || '';
    const country = data.country || '';

    // Re-run matchSchoolEntity against every school
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

    // Flag 1: FALLBACK_SENTINEL
    // FLIS0104 for Taaleem, SEARCH_ASSOCIATES_HUB for Search Associates, no sentinel for others
    if (engine === 'Taaleem' && storedSchoolId === 'FLIS0104') {
      flags.push('FALLBACK_SENTINEL');
      stats.fallbackSentinel++;
    } else if (engine === 'Search Associates' && storedSchoolId === 'SEARCH_ASSOCIATES_HUB') {
      flags.push('FALLBACK_SENTINEL');
      stats.fallbackSentinel++;
    }

    // Flag 2: SCHOOL_MISMATCH (best match is different school with score >= 0.9)
    if (bestResult && bestResult.score >= 0.9 && bestResult.school.id && bestResult.school.id !== storedSchoolId) {
      flags.push('SCHOOL_MISMATCH');
      stats.schoolMismatch++;
    }

    // Flag 3: LOW_CONFIDENCE (no high-confidence match found today)
    if (!bestResult || bestResult.confidence !== 'high' || bestResult.score < 0.85) {
      flags.push('LOW_CONFIDENCE');
      stats.lowConfidence++;
    }

    if (flags.length === 0) {
      stats.clean++;
    }

    const row: EngineAuditRow = {
      docId,
      engine,
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
    };

    allRows.push(row);
    if (flags.length > 0) {
      flaggedRows.push(row);
    }
  }

  // 3. Write JSON report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.resolve(process.cwd(), 'src/scripts/output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, `all_engines_school_audit_${timestamp}.json`);

  const report = {
    auditTimestamp: new Date().toISOString(),
    totalJobsAudited: jobsSnap.docs.length,
    perEngineSummary: engineStats,
    flaggedCount: flaggedRows.length,
    flaggedRows
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');

  // 4. Print per-engine summary table to console
  console.log('\n================================== ALL-ENGINES SCHOOL MATCH AUDIT ==================================');
  console.log(`📁 Report written to: ${outputPath}`);
  console.log(`📊 Total Jobs Audited: ${jobsSnap.docs.length}\n`);

  console.log(
    'Engine'.padEnd(20) +
    'Total'.padStart(8) +
    'Sentinel'.padStart(12) +
    'Mismatch'.padStart(12) +
    'Low Conf'.padStart(12) +
    'Clean'.padStart(10)
  );
  console.log(''.padEnd(74, '-'));

  const sortedEngines = Object.values(engineStats).sort((a, b) => b.total - a.total);
  let totalAll = 0;
  let totalSentinel = 0;
  let totalMismatch = 0;
  let totalLowConf = 0;
  let totalClean = 0;

  for (const s of sortedEngines) {
    totalAll += s.total;
    totalSentinel += s.fallbackSentinel;
    totalMismatch += s.schoolMismatch;
    totalLowConf += s.lowConfidence;
    totalClean += s.clean;

    console.log(
      s.engine.padEnd(20) +
      String(s.total).padStart(8) +
      String(s.fallbackSentinel).padStart(12) +
      String(s.schoolMismatch).padStart(12) +
      String(s.lowConfidence).padStart(12) +
      String(s.clean).padStart(10)
    );
  }

  console.log(''.padEnd(74, '-'));
  console.log(
    'TOTAL'.padEnd(20) +
    String(totalAll).padStart(8) +
    String(totalSentinel).padStart(12) +
    String(totalMismatch).padStart(12) +
    String(totalLowConf).padStart(12) +
    String(totalClean).padStart(10)
  );
  console.log('====================================================================================================\n');
}

auditAllEnginesSchoolMatches().catch(err => {
  console.error('All-engines audit failed:', err);
  process.exit(1);
});
