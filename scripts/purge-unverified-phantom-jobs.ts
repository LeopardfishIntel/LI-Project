import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { 
  getFirestore, 
  collectionGroup, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc, 
  writeBatch 
} from 'firebase/firestore';
import { isThirdPartyAggregatorUrl, isBlockedContentUrl, resolveVacancyUrl } from '../src/lib/crawler/urlResolver';
import { verifyJobUrlHttp } from '../src/firebase/admin';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function purgePhantomJobs() {
  console.log('🚀 [PHANTOM PURGE] Starting audit and purge of unverified phantom/aggregator listings...');
  
  // 1. Authenticate with Admin credentials
  const cred = await signInWithEmailAndPassword(auth, 'admin@leopardfishintel.com', 'TacticalAdmin2026!');
  console.log(`🔐 [AUTH] Authenticated as: ${cred.user.email}`);

  // 2. Fetch all approved and active jobs across all schools
  console.log('🔍 [QUERY] Fetching all approved & active jobs across Firestore subcollections...');
  const approvedSnap = await getDocs(query(collectionGroup(db, 'jobs'), where('status', '==', 'approved')));
  const activeSnap = await getDocs(query(collectionGroup(db, 'jobs'), where('status', '==', 'active')));
  
  const allDocsMap = new Map<string, any>();
  approvedSnap.docs.forEach(d => allDocsMap.set(d.ref.path, d));
  activeSnap.docs.forEach(d => allDocsMap.set(d.ref.path, d));

  const totalInspected = allDocsMap.size;
  console.log(`📋 [QUERY] Found ${totalInspected} approved/active jobs across all schools.\n`);

  let delistedCount = 0;
  const delistedList: Array<{ id: string; schoolId: string; title: string; url: string; source: string; reason: string }> = [];

  for (const [path, jobDoc] of allDocsMap.entries()) {
    const data = jobDoc.data();
    const schoolId = jobDoc.ref.parent.parent?.id || 'unknown';
    const rawUrl = data.applyUrl || data.directUrl || data.source_url || data.url || '';
    const sourceName = data.sourceName || data.source || '';
    const title = data.title || 'Untitled';

    let isPhantom = false;
    let delistReason = '';

    // Check 1: Missing URL
    if (!rawUrl || rawUrl.trim().length === 0 || rawUrl.includes('undefined') || rawUrl.includes('null')) {
      isPhantom = true;
      delistReason = 'Missing destination URL';
    } 
    // Check 2: Aggregator source name
    else if (isThirdPartyAggregatorUrl(sourceName) || /waytogulf|optioncarriere|jobrapido|jooble|bebee|whatjobs|adzuna|bayt|naukrigulf|gulftalent/i.test(sourceName)) {
      isPhantom = true;
      delistReason = `Third-party aggregator source: ${sourceName}`;
    }
    // Check 3: Aggregator destination URL
    else if (isThirdPartyAggregatorUrl(rawUrl) || isBlockedContentUrl(rawUrl)) {
      isPhantom = true;
      delistReason = `Aggregator or non-job URL: ${rawUrl}`;
    }

    // Check 4: Live HTTP ping check if not already flagged
    if (!isPhantom && rawUrl.startsWith('http')) {
      try {
        const httpResult = await verifyJobUrlHttp(rawUrl);
        if (httpResult.status === 'delisted') {
          isPhantom = true;
          delistReason = httpResult.delistReason || 'Live HTTP verification failed (404/410/redirect to root)';
        }
      } catch (err: any) {
        // Network timeout / dead domain
        isPhantom = true;
        delistReason = `HTTP verification exception: ${err.message}`;
      }
    }

    if (isPhantom) {
      delistedCount++;
      delistedList.push({
        id: jobDoc.id,
        schoolId,
        title,
        url: rawUrl,
        source: sourceName,
        reason: delistReason
      });

      console.log(`🚫 [DELISTING] [${schoolId}] "${title}"`);
      console.log(`     URL:    ${rawUrl}`);
      console.log(`     Source: ${sourceName}`);
      console.log(`     Reason: ${delistReason}\n`);

      await updateDoc(jobDoc.ref, {
        status: 'delisted',
        delistReason: 'phantom_unverified_vacancy',
        delistDetailedReason: delistReason,
        delistedAt: new Date().toISOString()
      });
    }
  }

  console.log('======================================================');
  console.log('🎯 PHANTOM CLEANUP COMPLETE');
  console.log('======================================================');
  console.log(`📊 Total Approved/Active Jobs Inspected: ${totalInspected}`);
  console.log(`🚫 Total Phantom Jobs Delisted:         ${delistedCount}`);
  console.log(`✅ Verified Active Legitimate Jobs:      ${totalInspected - delistedCount}`);
  console.log('======================================================');

  if (delistedList.length > 0) {
    console.log('\n--- Summary of Delisted Phantom Jobs ---');
    delistedList.forEach((j, idx) => {
      console.log(`  [${idx + 1}] [${j.schoolId}] "${j.title}" (${j.source}) -> ${j.reason}`);
    });
  }
}

purgePhantomJobs().catch(err => {
  console.error('Fatal cleanup error:', err);
  process.exit(1);
});
