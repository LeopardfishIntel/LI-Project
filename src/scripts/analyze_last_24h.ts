import { getAdminDb } from '../firebase/admin';

async function analyze() {
  const db = getAdminDb();
  const now = Date.now();
  const last24hMs = now - 24 * 60 * 60 * 1000;
  const last24hIso = new Date(last24hMs).toISOString();

  console.log(`Analyzing activity from ${last24hIso} to ${new Date(now).toISOString()}`);

  // 1. ANALYTICS / VISITOR EVENTS
  const analyticsSnap = await db.collection('analytics').get();
  console.log(`Total events in analytics collection: ${analyticsSnap.docs.length}`);

  const events24h: any[] = [];
  analyticsSnap.docs.forEach((doc: any) => {
    const data = doc.data();
    const timestampStr = data.timestamp || data.createdAt;
    const ts = timestampStr ? new Date(timestampStr).getTime() : 0;
    if (ts >= last24hMs) {
      events24h.push({ id: doc.id, ...data, ts });
    }
  });

  console.log(`\n=== VISITOR TELEMETRY (LAST 24 HOURS) ===`);
  console.log(`Total Events in last 24h: ${events24h.length}`);

  // Separate Roger (user) vs external guests/visitors
  const rogerEvents: any[] = [];
  const externalEvents: any[] = [];

  events24h.forEach(e => {
    const email = (e.metadata?.user_email || e.user_email || '').toLowerCase();
    const userType = e.metadata?.user_type || e.user_type;
    const isRoger = email.includes('roger') || email.includes('leopardfishintel.com') || (e.visitor_id === 'vis_uzx4bs49lmpmltcng');

    if (isRoger) {
      rogerEvents.push(e);
    } else {
      externalEvents.push(e);
    }
  });

  console.log(`Roger/Admin Events: ${rogerEvents.length}`);
  console.log(`External Visitor Events: ${externalEvents.length}`);

  // Aggregate external visitors by visitor_id / session_id
  const externalVisitors = new Map<string, any[]>();
  const externalCountries = new Map<string, number>();
  const externalPaths = new Map<string, number>();

  externalEvents.forEach(e => {
    const vId = e.visitor_id || e.session_id || 'anonymous';
    const list = externalVisitors.get(vId) || [];
    list.push(e);
    externalVisitors.set(vId, list);

    const country = e.client_country || e.country || 'Unknown';
    externalCountries.set(country, (externalCountries.get(country) || 0) + 1);

    const path = e.metadata?.path || e.path || '/';
    externalPaths.set(path, (externalPaths.get(path) || 0) + 1);
  });

  console.log(`Unique External Visitors: ${externalVisitors.size}`);
  console.log('External Visitors by Country:', Object.fromEntries(externalCountries));
  console.log('External Page Views by Path:', Object.fromEntries(externalPaths));

  if (externalEvents.length > 0) {
    console.log('\nExternal Event Log:');
    externalEvents.forEach(e => {
      console.log(`- [${new Date(e.ts).toLocaleTimeString()}] ${e.client_country || 'Unknown'} -> ${e.metadata?.path || e.path} (${e.event_name})`);
    });
  }

  // 2. SCRAPER & JOB RUNS LAST NIGHT
  console.log(`\n=== JOB RUNS & SCRAPE RESULTS (LAST NIGHT) ===`);
  const schoolsSnap = await db.collection('schools').get();
  const nightScrapedSchools: any[] = [];

  schoolsSnap.docs.forEach((doc: any) => {
    const data = doc.data();
    const scrapedTs = data.lastScrapedAt ? new Date(data.lastScrapedAt).getTime() : 0;
    if (scrapedTs >= last24hMs) {
      nightScrapedSchools.push({
        id: doc.id,
        name: data.name || data.schoolname,
        city: data.city,
        country: data.country,
        lastScrapedAt: data.lastScrapedAt,
        openJobsCount: data.openJobsCount || 0,
        revalidationStatus: data.revalidationStatus || 'none',
        revalidationError: data.revalidationError || null
      });
    }
  });

  console.log(`Total Schools Scraped/Processed: ${nightScrapedSchools.length}`);
  nightScrapedSchools.sort((a, b) => new Date(b.lastScrapedAt).getTime() - new Date(a.lastScrapedAt).getTime());
  nightScrapedSchools.forEach(s => {
    console.log(`• [${s.id}] ${s.name} (${s.city}, ${s.country}) -> Status: ${s.revalidationStatus}, Open Jobs: ${s.openJobsCount}, Time: ${s.lastScrapedAt}`);
    if (s.revalidationError) {
      console.log(`   ⚠️ Error: ${s.revalidationError}`);
    }
  });

  // 3. FEATURED JOBS SUMMARY
  const jobsSnap = await db.collection('featured_jobs_cache').get();
  const validJobs = jobsSnap.docs.filter((d: any) => {
    const j = d.data();
    const rawStatus = String(j.status || '').toUpperCase();
    if (rawStatus === 'EXPIRED' || rawStatus === 'CLOSED' || rawStatus === 'REJECTED' || rawStatus === 'PENDING_REVIEW' || rawStatus === 'PENDING') return false;
    if (j.closingDateMillis && j.closingDateMillis < now) return false;
    return true;
  });

  console.log(`\n=== SYSTEM TOTALS ===`);
  console.log(`Active Featured Jobs: ${validJobs.length}`);
  console.log(`Total Registered Schools: ${schoolsSnap.docs.length}`);
}

analyze().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
