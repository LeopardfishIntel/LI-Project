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

// Synthetic dummy template URL patterns from previous testing sessions
const DUMMY_TEMPLATE_PATTERNS = [
  /-(12345[0-9]|23456[0-9]|34567[0-9]|45678[0-9]|78901[0-9]|212345[0-9]|212346[0-9]|2099000|2180000|2165000|2200000|2210000|2170000|2140000|2150000|2155000|2160001|2170000|2180000|3333333|2222222)$/,
  /tes\.com\/jobs\/vacancy\/.*-(123456|345678|789012|2123456|2123457|2123458|2123459|2123460|2099000|2180000|2165000|2200000|2210000|2170000)/i,
  /schrole\.com\/jobs\/.*-(12345|12346)/i
];

function isDummyTemplateUrl(url: string): boolean {
  if (!url) return false;
  return DUMMY_TEMPLATE_PATTERNS.some(pat => pat.test(url.trim()));
}

async function auditAllJobs() {
  console.log('🚀 [AUDIT ALL SCHOOLS] Starting comprehensive audit of all jobs across all schools in Firestore...');
  
  await signInWithEmailAndPassword(auth, 'admin@leopardfishintel.com', 'TacticalAdmin2026!');
  console.log('🔐 [AUTH] Authenticated as admin.');

  // Fetch school metadata map
  const schoolsSnap = await getDocs(collection(db, 'schools'));
  const schoolMap: Record<string, any> = {};
  schoolsSnap.docs.forEach(d => {
    schoolMap[d.id] = { id: d.id, ...d.data() };
  });

  const jobsSnap = await getDocs(collectionGroup(db, 'jobs'));
  console.log(`📋 Inspecting ${jobsSnap.docs.length} total jobs in Firestore subcollections...\n`);

  let deletedCount = 0;
  let keptCount = 0;
  const batch = writeBatch(db);

  for (const docSnap of jobsSnap.docs) {
    const data = docSnap.data();
    const schoolId = docSnap.ref.parent.parent?.id || '';
    const school = schoolMap[schoolId] || { schoolname: 'Unknown', country: '', city: '' };
    const schoolName = school.schoolname || school.name || 'Unknown';
    const title = data.title || '';
    const url = data.applyUrl || data.directUrl || data.source_url || '';
    const status = data.status || '';

    let shouldDelete = false;
    let deleteReason = '';

    // Check 1: Delisted / Rejected / Expired
    if (status === 'delisted' || status === 'rejected' || status === 'expired') {
      shouldDelete = true;
      deleteReason = `Status is "${status}"`;
    }
    // Check 2: Synthetic dummy template URL (e.g. fake TES / Schrole IDs)
    else if (isDummyTemplateUrl(url)) {
      shouldDelete = true;
      deleteReason = `Synthetic dummy URL pattern (${url})`;
    }
    // Check 3: Old 2024 dates or news articles
    else if (url.includes('2024') || url.includes('/news/') || url.includes('/blog/') || title.includes('2024')) {
      shouldDelete = true;
      deleteReason = `Historical 2024 / News content URL`;
    }
    // Check 4: Third-party job aggregators
    else if (url.includes('waytogulf') || url.includes('bebee') || url.includes('optioncarriere') || url.includes('jooble') || url.includes('jobrapido')) {
      shouldDelete = true;
      deleteReason = `Third-party aggregator mirror`;
    }

    if (shouldDelete) {
      deletedCount++;
      console.log(`🗑️ [DELETE] [${schoolId} - ${schoolName}] "${title}"`);
      console.log(`     URL:    ${url}`);
      console.log(`     Reason: ${deleteReason}\n`);
      batch.delete(docSnap.ref);
    } else {
      keptCount++;
      console.log(`✅ [KEEP]   [${schoolId} - ${schoolName}] "${title}" (${status})`);
      console.log(`     URL:    ${url}\n`);
    }
  }

  await batch.commit();

  console.log('======================================================');
  console.log('🎯 AUDIT & CLEANUP COMPLETE');
  console.log('======================================================');
  console.log(`🗑️ Total Synthetic / Inactive Jobs Deleted: ${deletedCount}`);
  console.log(`✅ Legitimate Live Approved Jobs Retained:   ${keptCount}`);
  console.log('======================================================');
}

auditAllJobs().catch(console.error);
