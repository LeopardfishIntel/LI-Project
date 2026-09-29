import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('../../service-account.json');
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

interface LivenessAuditRow {
  docId: string;
  jobId?: string;
  title?: string;
  schoolId?: string;
  schoolName?: string;
  source?: string;
  status?: string;
  applyUrl: string;
  flag: 'OK' | 'DEAD' | 'REDIRECTED' | 'ERROR';
  statusCode?: number | null;
  finalUrl?: string;
  redirectHostMismatch?: boolean;
  redirectPathGeneric?: boolean;
  error?: string;
}

const GENERIC_PATHS = new Set(['', '/', '/jobs', '/jobs/', '/careers', '/careers/', '/vacancies', '/vacancies/', '/home', '/home/']);

function isGenericPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return GENERIC_PATHS.has(normalized) || GENERIC_PATHS.has(pathname);
}

async function checkUrlLiveness(targetUrl: string, timeoutMs: number = 12000): Promise<{
  flag: 'OK' | 'DEAD' | 'REDIRECTED' | 'ERROR';
  statusCode?: number;
  finalUrl?: string;
  redirectHostMismatch?: boolean;
  redirectPathGeneric?: boolean;
  error?: string;
}> {
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return { flag: 'ERROR', error: `Invalid or missing URL: "${targetUrl}"` };
  }

  let originalHost = '';
  try {
    const parsed = new URL(targetUrl);
    originalHost = parsed.hostname.toLowerCase();
  } catch (err: any) {
    return { flag: 'ERROR', error: `Failed to parse URL: ${err.message}` };
  }

  const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  const makeRequest = async (method: 'HEAD' | 'GET') => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(targetUrl, {
        method,
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  try {
    let res: Response | null = null;
    try {
      res = await makeRequest('HEAD');
      // If HEAD is not allowed (405, 501) or returns server error, fall back to GET
      if (res.status === 405 || res.status === 501 || res.status >= 500) {
        res = await makeRequest('GET');
      }
    } catch (headErr) {
      // Fallback to GET on connection/HEAD failure
      res = await makeRequest('GET');
    }

    const finalUrl = res.url || targetUrl;
    const statusCode = res.status;

    // Check status code: DEAD on any 4xx or 5xx
    if (statusCode >= 400) {
      return {
        flag: 'DEAD',
        statusCode,
        finalUrl,
      };
    }

    // Check for REDIRECTED: final host differs or redirects to generic hub path
    try {
      const finalParsed = new URL(finalUrl);
      const finalHost = finalParsed.hostname.toLowerCase();
      const hostMismatch = finalHost !== originalHost && !finalHost.endsWith('.' + originalHost) && !originalHost.endsWith('.' + finalHost);
      const pathGeneric = isGenericPath(finalParsed.pathname);

      if (hostMismatch || (finalUrl !== targetUrl && pathGeneric)) {
        return {
          flag: 'REDIRECTED',
          statusCode,
          finalUrl,
          redirectHostMismatch: hostMismatch,
          redirectPathGeneric: pathGeneric,
        };
      }
    } catch (_) {}

    return {
      flag: 'OK',
      statusCode,
      finalUrl,
    };
  } catch (err: any) {
    return {
      flag: 'ERROR',
      error: err.name === 'AbortError' ? `Timeout after ${timeoutMs}ms` : (err.message || String(err)),
    };
  }
}

async function auditLinkLiveness() {
  console.log('🔍 Starting Read-Only Link Liveness Audit...');

  // Parse CLI args (e.g., --limit=N)
  let limitArg: number | null = null;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--limit=')) {
      const parsed = parseInt(arg.split('=')[1], 10);
      if (!isNaN(parsed) && parsed > 0) limitArg = parsed;
    }
  }

  if (limitArg) {
    console.log(`⚡ Limit applied: auditing first ${limitArg} active jobs.`);
  }

  // 1. Load active featured_jobs_cache docs (status in approved / pending_review)
  console.log('📡 Fetching active jobs from featured_jobs_cache...');
  const snap = await db.collection('featured_jobs_cache').get();
  console.log(`📡 Total documents in featured_jobs_cache: ${snap.docs.length}`);

  const activeDocs: Array<{ id: string; data: any }> = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    const status = data.status || 'approved'; // default status in cache is approved if unassigned
    if (status === 'approved' || status === 'pending_review') {
      activeDocs.push({ id: doc.id, data });
    }
  }
  console.log(`🎯 Active (approved/pending_review) jobs count: ${activeDocs.length}`);

  const targetDocs = limitArg ? activeDocs.slice(0, limitArg) : activeDocs;
  console.log(`🚀 Checking liveness for ${targetDocs.length} URLs with batch concurrency = 8...`);

  const results: LivenessAuditRow[] = [];
  let deadCount = 0;
  let redirectedCount = 0;
  let errorCount = 0;
  let okCount = 0;

  const BATCH_SIZE = 8;
  for (let i = 0; i < targetDocs.length; i += BATCH_SIZE) {
    const batch = targetDocs.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async ({ id, data }) => {
      const applyUrl = data.applyUrl || data.url || data.directUrl || '';
      const liveness = await checkUrlLiveness(applyUrl, 12000);

      const row: LivenessAuditRow = {
        docId: id,
        jobId: data.jobId || data.id,
        title: data.title || data.rawTitle,
        schoolId: data.schoolId,
        schoolName: data.schoolName,
        source: data.source,
        status: data.status,
        applyUrl,
        flag: liveness.flag,
        statusCode: liveness.statusCode,
        finalUrl: liveness.finalUrl,
        redirectHostMismatch: liveness.redirectHostMismatch,
        redirectPathGeneric: liveness.redirectPathGeneric,
        error: liveness.error,
      };

      return row;
    });

    const batchResults = await Promise.all(batchPromises);
    for (const r of batchResults) {
      if (r.flag === 'DEAD') deadCount++;
      else if (r.flag === 'REDIRECTED') redirectedCount++;
      else if (r.flag === 'ERROR') errorCount++;
      else okCount++;
      results.push(r);
    }

    if ((i + BATCH_SIZE) % 40 === 0 || i + BATCH_SIZE >= targetDocs.length) {
      const progress = Math.min(i + BATCH_SIZE, targetDocs.length);
      console.log(`   Checked ${progress}/${targetDocs.length} URLs... (OK: ${okCount}, DEAD: ${deadCount}, REDIRECTED: ${redirectedCount}, ERROR: ${errorCount})`);
    }
  }

  // 2. Write JSON report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.resolve(process.cwd(), 'src/scripts/output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, `link_liveness_audit_${timestamp}.json`);

  const report = {
    auditTimestamp: new Date().toISOString(),
    totalActiveJobsAudited: targetDocs.length,
    summary: {
      OK: okCount,
      DEAD: deadCount,
      REDIRECTED: redirectedCount,
      ERROR: errorCount,
    },
    results,
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');

  // 3. Print summary
  console.log('\n================ LINK LIVENESS AUDIT SUMMARY ================');
  console.log(`📁 Report written to: ${outputPath}`);
  console.log(`📊 Total Active URLs Audited: ${targetDocs.length}`);
  console.log(`✅ OK: ${okCount}`);
  console.log(`💀 DEAD (4xx/5xx): ${deadCount}`);
  console.log(`🔄 REDIRECTED (host mismatch / generic hub): ${redirectedCount}`);
  console.log(`⚠️  ERROR (throw / timeout): ${errorCount}`);
  console.log('=============================================================\n');
}

auditLinkLiveness().catch(err => {
  console.error('Link liveness audit failed:', err);
  process.exit(1);
});
