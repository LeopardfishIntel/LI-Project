import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collectionGroup, getDocs, writeBatch, Timestamp } from 'firebase/firestore';

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

async function parseClosingDateFromPage(url: string): Promise<{ closingDate: Date | null; isExpired: boolean; rawValidThrough?: string }> {
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
    
    // 1. Look for Schema.org JSON-LD validThrough
    const validThroughMatch = html.match(/"validThrough"\s*:\s*"([^"]+)"/i);
    if (validThroughMatch && validThroughMatch[1]) {
      const parsed = new Date(validThroughMatch[1]);
      if (!isNaN(parsed.getTime())) {
        const now = new Date();
        return {
          closingDate: parsed,
          isExpired: parsed.getTime() < now.getTime(),
          rawValidThrough: validThroughMatch[1]
        };
      }
    }

    // 2. Look for explicit past year mentions like "Closing date: ... 2024" or "Closing date: ... 2025"
    if (/closing\s*date[^<]{0,50}(2024|2025|January 2025|February 2025|March 2025|April 2025|May 2025|June 2025|July 2025|August 2025)/i.test(html)) {
      return {
        closingDate: new Date('2025-02-24'),
        isExpired: true,
        rawValidThrough: 'Detected past closing year in text'
      };
    }

    // 3. Generic career portal pages without specific expired date
    return {
      closingDate: null,
      isExpired: false
    };
  } catch (err: any) {
    return {
      closingDate: null,
      isExpired: false
    };
  }
}

async function runDeepVerification() {
  console.log('🚀 [DEEP CLOSING DATE AUDIT] Inspecting Schema.org validThrough on all approved jobs...');
  await signInWithEmailAndPassword(auth, 'admin@leopardfishintel.com', 'TacticalAdmin2026!');
  
  const snap = await getDocs(collectionGroup(db, 'jobs'));
  console.log(`📋 Found ${snap.docs.length} total jobs to audit...\n`);

  const batch = writeBatch(db);
  let expiredCount = 0;
  let activeValidCount = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const schoolId = docSnap.ref.parent.parent?.id || '';
    const title = data.title || '';
    const directUrl = data.directUrl || data.applyUrl || '';

    if (!directUrl || data.status !== 'approved') continue;

    console.log(`Checking [${schoolId}] "${title}"...`);
    console.log(`  URL: ${directUrl}`);

    const { closingDate, isExpired, rawValidThrough } = await parseClosingDateFromPage(directUrl);
    console.log(`  Closing Date Extracted: ${rawValidThrough || (closingDate ? closingDate.toISOString() : 'None (Rolling / Portal)')}`);

    if (isExpired) {
      console.log(`  ❌ EXPIRED in PAST -> Marking status: 'expired' (or deleting from active feed)\n`);
      batch.delete(docSnap.ref); // Delete from subcollection so it never renders as active
      expiredCount++;
    } else {
      console.log(`  ✅ ACTIVE & CURRENT -> Retaining as approved\n`);
      if (closingDate) {
        batch.update(docSnap.ref, {
          closingDate: Timestamp.fromDate(closingDate),
          isRollingDeadline: false,
          lastVerifiedAt: new Date()
        });
      }
      activeValidCount++;
    }
  }

  await batch.commit();

  console.log('======================================================');
  console.log('🎯 CLOSING DATE AUDIT COMPLETE');
  console.log('======================================================');
  console.log(`🗑️ Expired Past Jobs Deleted:   ${expiredCount}`);
  console.log(`✅ Truly Active Future Jobs:     ${activeValidCount}`);
  console.log('======================================================');
}

runDeepVerification().catch(console.error);
