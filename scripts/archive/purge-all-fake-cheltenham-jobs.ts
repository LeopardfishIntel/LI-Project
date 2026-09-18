import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { 
  getFirestore, 
  collectionGroup, 
  collection, 
  getDocs, 
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

async function purgeAllFakeJobs() {
  console.log('🚀 [PURGE FAKE JOBS] Starting thorough purge of fake/mismatched/phantom jobs across Firestore...');
  
  await signInWithEmailAndPassword(auth, 'admin@leopardfishintel.com', 'TacticalAdmin2026!');
  console.log('🔐 [AUTH] Authenticated as admin.');

  const snap = await getDocs(collectionGroup(db, 'jobs'));
  console.log(`📋 Found ${snap.docs.length} total job documents across all subcollections.`);

  let deletedCount = 0;
  const batch = writeBatch(db);

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const path = docSnap.ref.path;
    const schoolId = docSnap.ref.parent.parent?.id || '';
    const title = data.title || '';
    const url = data.applyUrl || data.directUrl || data.source_url || '';

    let shouldDelete = false;
    let reason = '';

    // 1. Delete all Cheltenham Muscat subcollection jobs (all 11 are mismatched 2024 London/fake test fixtures)
    if (schoolId === 'FLIS0044' || path.includes('FLIS0044/jobs')) {
      shouldDelete = true;
      reason = 'Cheltenham Muscat fake/mismatched subcollection fixture';
    }
    // 2. Delete any delisted/rejected/expired test jobs
    else if (data.status === 'delisted' || data.status === 'rejected') {
      shouldDelete = true;
      reason = `Status is ${data.status}`;
    }
    // 3. Delete any jobs with 2024 in URL or title
    else if (url.includes('2024') || title.includes('2024') || url.includes('schrole.com/news')) {
      shouldDelete = true;
      reason = '2024 legacy job';
    }
    // 4. Delete any aggregator jobs
    else if (url.includes('waytogulf') || url.includes('bebee') || url.includes('jooble') || url.includes('optioncarriere')) {
      shouldDelete = true;
      reason = 'Aggregator phantom job';
    }

    if (shouldDelete) {
      deletedCount++;
      console.log(`🗑️ [DELETING] [${schoolId}] "${title}" -> ${reason}`);
      batch.delete(docSnap.ref);
    }
  }

  await batch.commit();
  console.log(`\n✅ [COMPLETE] Permanently deleted ${deletedCount} fake/phantom/delisted job documents.`);

  // Also clean up any cachedStability or scrapedJobsList on FLIS0044 school document
  const { doc: fDoc, updateDoc } = await import('firebase/firestore');
  const cheltenhamRef = fDoc(db, 'schools', 'FLIS0044');
  await updateDoc(cheltenhamRef, {
    scrapedJobsList: [],
    scrapedJobsCount: 0,
    salaryRange: 'OMR 1,500 - 2,500/month (tax free)' // Fix corrupt salary string
  });
  console.log('✨ [CLEAN] Reset Cheltenham Muscat school document salary and jobs list.');
}

purgeAllFakeJobs().catch(console.error);
