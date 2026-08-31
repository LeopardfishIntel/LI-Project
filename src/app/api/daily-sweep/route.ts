import { NextResponse } from 'next/server';
import { getCollectionDocs, updateDocument } from '@/firebase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const forceAll = searchParams.get('force') === 'true';

    // 🛸 Pipeline 3 — Janitor: fire-and-forget (non-blocking)
    import('@/lib/pipelines/pipeline3-janitor')
      .then(({ runJanitorPipeline }) => runJanitorPipeline())
      .then(r => console.log(`🛸 [DAILY SWEEP] Janitor — expired=${r.expired} promoted=${r.promoted} durationMs=${r.durationMs}`))
      .catch(err => console.error('🛸 [DAILY SWEEP] Janitor failed (non-fatal):', err));

    const schools = await getCollectionDocs('schools');
    const now = Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    
    // Parse and sort by lastScrapedAt (null/oldest first)
    const sorted = schools.map((s: any) => {
      const data = s.data();
      let lastScraped: number | null = null;
      if (data.lastScrapedAt) {
        if (data.lastScrapedAt.seconds) {
          lastScraped = data.lastScrapedAt.seconds * 1000;
        } else {
          lastScraped = new Date(data.lastScrapedAt).getTime();
        }
      }
      return {
        id: s.id,
        name: data.schoolname || data.name || '',
        city: data.city || '',
        country: data.country || '',
        lastScraped
      };
    }).sort((a: any, b: any) => {
      if (a.lastScraped === null) return -1;
      if (b.lastScraped === null) return 1;
      return a.lastScraped - b.lastScraped;
    });

    // Filter to schools that haven't been swept in >24 hours (or never swept)
    const staleSchools = sorted.filter((s: any) => {
      if (forceAll) return true;
      if (s.lastScraped === null) return true;
      return (now - s.lastScraped) >= TWENTY_FOUR_HOURS_MS;
    });

    let targets = staleSchools;
    if (limitParam && limitParam !== 'all') {
      const limitNum = parseInt(limitParam, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        targets = staleSchools.slice(0, limitNum);
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    console.log(`📡 [DAILY SWEEP] Triggering 24h automated sweep for ${targets.length} schools (total stale: ${staleSchools.length}/${schools.length})...`);

    // Trigger sweeps in background by pushing to the scrape worker queue
    for (const target of targets) {
      // Mark revalidating in Firestore
      await updateDocument('schools', target.id, {
        isRevalidating: true
      });

      // Push task to worker endpoint
      fetch(`${baseUrl}/api/tasks/scrape-worker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: target.id,
          schoolName: target.name,
          city: target.city,
          country: target.country
        })
      }).catch(err => console.error('Failed to enqueue scrape worker for target:', target.name, err));
    }

    return NextResponse.json({
      success: true,
      janitorRan: true,
      totalSchoolsInDatabase: schools.length,
      staleSchoolsCount: staleSchools.length,
      triggeredCount: targets.length,
      schools: targets.map((t: any) => ({
        id: t.id,
        name: t.name,
        lastScraped: t.lastScraped ? new Date(t.lastScraped).toISOString() : 'never'
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
