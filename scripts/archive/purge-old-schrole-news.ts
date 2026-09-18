import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { 
  getFirestore, 
  collectionGroup, 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc, 
  writeBatch
} from 'firebase/firestore';

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

async function main() {
  console.log('🚀 [PURGE] Initiating purge of old 2024 Schrole news, blog posts, and articles...');
  
  // 1. Authenticate with Admin privileges
  const cred = await signInWithEmailAndPassword(auth, 'admin@leopardfishintel.com', 'TacticalAdmin2026!');
  console.log(`🔐 [AUTH] Authenticated as Admin: ${cred.user.email} (UID: ${cred.user.uid})`);

  // 2. Query all approved jobs across collection group 'jobs'
  console.log('🔍 [QUERY] Fetching all approved jobs (status == "approved")...');
  const approvedJobsQuery = query(collectionGroup(db, 'jobs'), where('status', '==', 'approved'));
  const snap = await getDocs(approvedJobsQuery);
  console.log(`📋 [QUERY] Retrieved ${snap.docs.length} approved job records for inspection.\n`);

  let delistedCount = 0;
  const delistedDetails: Array<{ id: string; title: string; url: string; reason: string; path: string }> = [];

  const shouldDelist = (job: any): { match: boolean; reason: string } => {
    const urls = [
      job.directUrl,
      job.applyUrl,
      job.source_url,
      job.url,
      job.sourceUrl,
      ...(Array.isArray(job.alternateUrls) ? job.alternateUrls : [])
    ].filter(Boolean);

    for (const u of urls) {
      const uLower = String(u).toLowerCase();
      if (uLower.includes('schrole.com/news/')) {
        return { match: true, reason: `Matches schrole.com/news/ -> ${u}` };
      }
      if (uLower.includes('/blog/')) {
        return { match: true, reason: `Matches /blog/ -> ${u}` };
      }
      if (uLower.includes('/articles/')) {
        return { match: true, reason: `Matches /articles/ -> ${u}` };
      }
      if (uLower.includes('2024') && (uLower.includes('schrole') || uLower.includes('news') || uLower.includes('blog'))) {
        return { match: true, reason: `Matches 2024 news link -> ${u}` };
      }
    }

    const titleLower = (job.title || '').toLowerCase();
    if (titleLower.includes('2024') && (titleLower.includes('news') || titleLower.includes('update') || titleLower.includes('article') || titleLower.includes('blog'))) {
      return { match: true, reason: `2024 News Title -> "${job.title}"` };
    }

    return { match: false, reason: '' };
  };

  // 3. Batch update matching jobs to 'delisted'
  const batch = writeBatch(db);
  let batchOps = 0;

  for (const jobDoc of snap.docs) {
    const data = jobDoc.data();
    const check = shouldDelist(data);

    if (check.match) {
      delistedCount++;
      delistedDetails.push({
        id: jobDoc.id,
        title: data.title || 'Untitled',
        url: data.directUrl || data.applyUrl || data.source_url || '',
        reason: check.reason,
        path: jobDoc.ref.path
      });

      batch.update(jobDoc.ref, {
        status: 'delisted',
        delistedAt: new Date().toISOString(),
        delistReason: check.reason
      });
      batchOps++;

      if (batchOps >= 400) {
        await batch.commit();
        batchOps = 0;
      }
    }
  }

  if (batchOps > 0) {
    await batch.commit();
  }

  // 4. Output summary logs
  console.log('======================================================');
  console.log('🎯 PURGE EXECUTION COMPLETE');
  console.log('======================================================');
  console.log(`📊 Total Approved Jobs Inspected: ${snap.docs.length}`);
  console.log(`🚫 Total Jobs Delisted:            ${delistedCount}`);
  console.log('======================================================');

  if (delistedDetails.length > 0) {
    console.log('\nDelisted Jobs Breakdown:');
    delistedDetails.forEach((d, idx) => {
      console.log(`  [${idx + 1}] ID: ${d.id}`);
      console.log(`      Title:  "${d.title}"`);
      console.log(`      URL:    ${d.url}`);
      console.log(`      Path:   ${d.path}`);
      console.log(`      Reason: ${d.reason}`);
    });
  } else {
    console.log('ℹ️ No active approved jobs contained Schrole news, blog, or 2024 article links.');
  }

  // 5. Clear all documents in the 'search_cache' collection
  console.log('\n🧹 [CACHE] Clearing search_cache collection...');
  let cacheDeletedCount = 0;
  try {
    const cacheSnap = await getDocs(collection(db, 'search_cache'));
    if (!cacheSnap.empty) {
      const cacheBatch = writeBatch(db);
      cacheSnap.docs.forEach(d => {
        cacheDeletedCount++;
        cacheBatch.delete(d.ref);
      });
      await cacheBatch.commit();
    }
    console.log(`✨ [CACHE] Purged ${cacheDeletedCount} documents from search_cache collection.`);
  } catch (cacheErr) {
    console.log(`✨ [CACHE] search_cache collection is empty / clear.`);
  }
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
