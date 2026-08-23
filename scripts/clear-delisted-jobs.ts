import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { 
  getFirestore, 
  collectionGroup, 
  getDocs, 
  query, 
  where, 
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

async function clearDelistedJobs() {
  console.log('🚀 [DELETE DELISTED] Permanently deleting all delisted jobs from Firestore...');
  
  // 1. Authenticate with Admin credentials
  const cred = await signInWithEmailAndPassword(auth, 'admin@leopardfishintel.com', 'TacticalAdmin2026!');
  console.log(`🔐 [AUTH] Authenticated as: ${cred.user.email}`);

  // 2. Fetch all delisted jobs across all school subcollections
  console.log('🔍 [QUERY] Querying all jobs with status == "delisted"...');
  const delistedSnap = await getDocs(query(collectionGroup(db, 'jobs'), where('status', '==', 'delisted')));
  const totalDelisted = delistedSnap.docs.length;
  console.log(`📋 [QUERY] Found ${totalDelisted} delisted job documents to remove.`);

  if (totalDelisted === 0) {
    console.log('✨ [CLEAN] No delisted jobs found in Firestore.');
    return;
  }

  // 3. Batch delete in chunks of 400
  let batch = writeBatch(db);
  let batchOps = 0;
  let deletedCount = 0;

  for (const docSnap of delistedSnap.docs) {
    batch.delete(docSnap.ref);
    batchOps++;
    deletedCount++;

    if (batchOps >= 400) {
      await batch.commit();
      console.log(`🗑️ [DELETE] Committed batch deletion of ${batchOps} documents...`);
      batch = writeBatch(db);
      batchOps = 0;
    }
  }

  if (batchOps > 0) {
    await batch.commit();
    console.log(`🗑️ [DELETE] Committed final batch deletion of ${batchOps} documents.`);
  }

  console.log('\n======================================================');
  console.log('🎯 DELISTED JOBS PURGE COMPLETE');
  console.log('======================================================');
  console.log(`🗑️ Total Delisted Documents Permanently Deleted: ${deletedCount}`);
  console.log('======================================================');
}

clearDelistedJobs().catch(err => {
  console.error('Fatal deletion error:', err);
  process.exit(1);
});
