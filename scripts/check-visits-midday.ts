import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { getAdminDb } from '../src/firebase/admin';

async function getVisitsSinceMidday() {
  const db = getAdminDb();
  // Midday local time is 12:00 CEST = 10:00:00 UTC on 2026-09-26
  const middayUtcStr = '2026-09-26T10:00:00.000Z';
  
  console.log('Querying telemetry events since midday (12:00 CEST / 10:00 UTC)...');
  
  const snap = await db.collection('telemetry')
    .where('timestamp', '>=', middayUtcStr)
    .get();

  console.log(`Total telemetry records found since midday: ${snap.size}`);

  const docs: any[] = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  // Sort chronologically
  docs.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Group by visitor / session
  const visitorsMap = new Map<string, any[]>();

  docs.forEach((d: any) => {
    const vId = d.visitor_id || d.session_id || 'unknown';
    const list = visitorsMap.get(vId) || [];
    list.push(d);
    visitorsMap.set(vId, list);
  });

  console.log('\n========================================');
  console.log(`UNIQUE VISITOR SESSIONS SINCE MIDDAY: ${visitorsMap.size}`);
  console.log('========================================\n');

  let visitorIndex = 1;
  visitorsMap.forEach((events, vId) => {
    const firstEvent = events[0];
    const country = firstEvent.client_country || firstEvent.country || 'Unknown';
    const email = (firstEvent.metadata?.user_email || firstEvent.user_email || '').toLowerCase();
    const isRoger = email.includes('roger') || email.includes('leopardfishintel.com') || vId === 'vis_uzx4bs49lmpmltcng';
    
    console.log(`=== Visitor #${visitorIndex} [ID: ${vId}] (${country}) — ${events.length} event(s) [${isRoger ? 'ADMIN' : 'EXTERNAL'}] ===`);
    
    events.forEach(e => {
      const tsUtc = new Date(e.timestamp);
      // Convert UTC to local CEST (+2 hours)
      const tsCest = new Date(tsUtc.getTime() + 2 * 60 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', ' CEST').substring(11, 24);
      
      const eventName = e.event_name || e.event || 'unknown_event';
      const path = e.metadata?.path || e.path || '-';
      let extra = '';
      
      if (eventName === 'school_profile_viewed') {
        extra = `-> School: ${e.metadata?.school_name || ''} (${e.metadata?.country_name || ''})`;
      } else if (eventName === 'simulator_dial_adjusted') {
        extra = `-> Target: ${e.metadata?.target_school || e.metadata?.target_country || ''} | Dial: ${e.metadata?.dial_modified || ''} (${e.metadata?.previous_value} -> ${e.metadata?.new_value}) | Profile: ${e.metadata?.deployment_profile || ''} | Status: ${e.metadata?.resulting_status || ''} (${e.metadata?.resulting_surplus_percentage}%)`;
      } else if (eventName === 'page_view') {
        extra = `-> Path: ${path}`;
      } else if (e.metadata) {
        extra = `-> ${JSON.stringify(e.metadata)}`;
      }
      
      console.log(`  • [${tsCest}] ${eventName.padEnd(24)} ${extra}`);
    });
    console.log('');
    visitorIndex++;
  });
}

getVisitsSinceMidday().then(() => process.exit(0)).catch(console.error);
