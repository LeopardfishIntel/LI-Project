import { getAdminDb } from '@/firebase/admin';

export interface LinkSweepTelemetry {
  timestamp: string;
  totalAudited: number;
  verifiedLiveCount: number;
  takedownsPurgedCount: number;
  takedownDetails: {
    docId: string;
    schoolId: string;
    schoolName: string;
    title: string;
    url: string;
    reason: string;
  }[];
  durationMs: number;
}

const EXPIRED_HTML_PATTERNS = [
  /closed\s+or\s+expired\s+job/i,
  /this\s+job\s+posting\s+is\s+closed/i,
  /no\s+longer\s+accepting\s+applications/i,
  /no\s+longer\s+open\s+for\s+applications/i,
  /this\s+vacancy\s+is\s+closed/i,
  /position\s+has\s+been\s+filled/i,
  /job\s+is\s+no\s+longer\s+available/i,
  /application\s+deadline\s+has\s+passed/i,
  /this\s+job\s+ad\s+has\s+expired/i,
  /this\s+posting\s+has\s+expired/i,
  /vacancy\s+expired/i,
  /this\s+job\s+has\s+expired/i,
  /the\s+job\s+you\s+are\s+looking\s+for\s+is\s+no\s+longer\s+available/i,
  /this\s+position\s+is\s+no\s+longer\s+open/i,
  /this\s+job\s+is\s+closed/i,
  /position\s+closed/i,
  /do\s+not\s+currently\s+have\s+any\s+vacancies/i,
  /no\s+vacancies\s+available/i,
  /no\s+current\s+vacancies/i
];

export async function checkUrlLiveStatus(urlStr: string): Promise<{ isLive: boolean; reason: string }> {
  if (!urlStr || urlStr === '#' || urlStr.trim() === '') {
    return { isLive: false, reason: 'Empty or missing URL' };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(urlStr, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: controller.signal,
      redirect: 'follow'
    });
    clearTimeout(timer);

    if (res.status === 404 || res.status === 410) {
      return { isLive: false, reason: `HTTP ${res.status} Takedown` };
    }

    if (res.status === 200) {
      const htmlText = await res.text();
      for (const pattern of EXPIRED_HTML_PATTERNS) {
        if (pattern.test(htmlText)) {
          return { isLive: false, reason: `HTML Expired Banner: "${pattern.source}"` };
        }
      }
    }

    return { isLive: true, reason: 'OK' };
  } catch (e: any) {
    // Network timeouts or anti-bot protection: do not treat as 404 takedown
    return { isLive: true, reason: 'OK (Timeout/Shielded)' };
  }
}

export async function runDailyLinkSweep(): Promise<LinkSweepTelemetry> {
  const startMs = Date.now();
  const db = getAdminDb();
  const utcTime = new Date().toISOString();

  if (!db) {
    throw new Error('Database connection uninitialized');
  }

  console.log(`🧹 [DAILY LINK SWEEPER] Starting daily HTTP takedown sweep at ${utcTime}...`);

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  const docs = cacheSnap.docs;

  console.log(`🧹 Found ${docs.length} active cached job records to verify.`);

  const takedownDocs: {
    docId: string;
    schoolId: string;
    schoolName: string;
    title: string;
    url: string;
    reason: string;
  }[] = [];

  let verifiedLiveCount = 0;
  const concurrency = 20;

  for (let i = 0; i < docs.length; i += concurrency) {
    const chunk = docs.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (docSnap: any) => {
        const data = docSnap.data();
        const url = data.applyUrl || data.source_url || '';
        const statusCheck = await checkUrlLiveStatus(url);

        if (!statusCheck.isLive) {
          takedownDocs.push({
            docId: docSnap.id,
            schoolId: data.schoolId || '',
            schoolName: data.schoolName || '',
            title: data.title || data.jobTitle || '',
            url,
            reason: statusCheck.reason
          });
        } else {
          verifiedLiveCount++;
        }
      })
    );
  }

  console.log(`🧹 Daily Link Sweep Audit Complete: ${verifiedLiveCount} Verified Live | ${takedownDocs.length} Takedowns Identified.`);

  // Purge takedowns from featured_jobs_cache and schools collection
  if (takedownDocs.length > 0) {
    const batchSize = 400;
    let batch = db.batch();
    let count = 0;

    for (const item of takedownDocs) {
      const docRef = db.collection('featured_jobs_cache').doc(item.docId);
      batch.delete(docRef);
      count++;

      // Also clean school doc's scrapedJobs if schoolId exists
      if (item.schoolId) {
        try {
          const schoolRef = db.collection('schools').doc(item.schoolId.toUpperCase().trim());
          const schoolSnap = await schoolRef.get();
          if (schoolSnap.exists) {
            const sData = schoolSnap.data();
            const currentJobs = sData?.scrapedJobs || [];
            const filteredJobs = currentJobs.filter((j: any) => {
              const jTitle = (j.title || j.jobTitle || '').toLowerCase().trim();
              const targetTitle = item.title.toLowerCase().trim();
              return jTitle !== targetTitle && j.id !== item.docId;
            });
            if (filteredJobs.length !== currentJobs.length) {
              batch.update(schoolRef, { scrapedJobs: filteredJobs });
              count++;
            }
          }
        } catch (sErr) {
          console.warn(`Failed to sync school takedown for ${item.schoolId}:`, sErr);
        }
      }

      if (count >= batchSize) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    console.log(`🧹 Purged ${takedownDocs.length} takedown documents from database.`);
  }

  const durationMs = Date.now() - startMs;

  // Persist sweep telemetry log to crawllogs
  try {
    await db.collection('crawllogs').add({
      engine: 'DAILY_LINK_SWEEP',
      totalAudited: docs.length,
      verifiedLiveCount,
      takedownsPurgedCount: takedownDocs.length,
      durationMs,
      createdAt: utcTime,
      createdAtMillis: Date.now()
    });
  } catch (logErr) {
    console.warn('Failed to persist daily link sweep log:', logErr);
  }

  return {
    timestamp: utcTime,
    totalAudited: docs.length,
    verifiedLiveCount,
    takedownsPurgedCount: takedownDocs.length,
    takedownDetails: takedownDocs,
    durationMs
  };
}
