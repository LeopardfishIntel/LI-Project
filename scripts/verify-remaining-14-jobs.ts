import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collectionGroup, collection, getDocs, writeBatch } from 'firebase/firestore';

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

async function resolveUrlHttp(url: string): Promise<{ finalUrl: string; status: number; textSnippet: string }> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000)
    });
    const html = await res.text();
    return {
      finalUrl: res.url,
      status: res.status,
      textSnippet: html.slice(0, 1000)
    };
  } catch (err: any) {
    return {
      finalUrl: url,
      status: 0,
      textSnippet: err.message
    };
  }
}

async function verifyAllRemainingJobs() {
  await signInWithEmailAndPassword(auth, 'admin@leopardfishintel.com', 'TacticalAdmin2026!');
  const snap = await getDocs(collectionGroup(db, 'jobs'));
  console.log(`🔍 Resolving and verifying all ${snap.docs.length} remaining approved jobs...`);

  const batch = writeBatch(db);
  let purgedCount = 0;
  let validCount = 0;

  for (const d of snap.docs) {
    const data = d.data();
    const schoolId = d.ref.parent.parent?.id || '';
    const title = data.title || '';
    const rawUrl = data.applyUrl || data.directUrl || data.source_url || '';

    console.log(`\nTesting [${schoolId}] "${title}"...`);
    console.log(`  Raw URL: ${rawUrl.slice(0, 80)}...`);

    const { finalUrl, status, textSnippet } = await resolveUrlHttp(rawUrl);
    console.log(`  Status: ${status} | Final URL: ${finalUrl}`);

    // If HTTP error (404, 410, 500) or points to an aggregator or generic 404
    const isDead = status === 404 || status === 410 || status === 0;
    const isAggregator = /waytogulf|bebee|optioncarriere|jooble|jobrapido/i.test(finalUrl);
    const isNewsOrBlog = /\/news\/|\/blog\/|\/articles\//i.test(finalUrl);

    if (isDead || isAggregator || isNewsOrBlog) {
      console.log(`  ❌ INVALID -> Deleting job`);
      batch.delete(d.ref);
      purgedCount++;
    } else {
      console.log(`  ✅ VALID LIVE JOB -> Updating directUrl to: ${finalUrl}`);
      batch.update(d.ref, {
        directUrl: finalUrl,
        applyUrl: finalUrl,
        lastVerifiedAt: new Date()
      });
      validCount++;
    }
  }

  await batch.commit();
  console.log(`\n======================================================`);
  console.log(`Purged: ${purgedCount} | Retained & Resolved: ${validCount}`);
  console.log(`======================================================`);
}

verifyAllRemainingJobs().catch(console.error);
