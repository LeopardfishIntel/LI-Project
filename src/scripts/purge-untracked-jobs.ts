import dotenv from "dotenv";
import path from "path";
import admin from "firebase-admin";

dotenv.config({ path: path.resolve(process.cwd(), "./.env.local") });

if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  }
}

const db = admin.firestore();

export async function purgeUntrackedJobs() {
  console.log("=================================================");
  console.log("=== UTILITY: PURGE UNTRACKED OFF-DATABASE JOBS ===");
  console.log("=================================================");

  // 1. Fetch set of valid tracked school IDs from schools collection
  const schoolsSnap = await db.collection("schools").get();
  const validSchoolIds = new Set<string>();

  schoolsSnap.docs.forEach(doc => {
    validSchoolIds.add(doc.id.toLowerCase());
  });

  console.log(`Loaded ${validSchoolIds.size} valid tracked school ID(s) from schools collection.`);

  let purgedCacheCount = 0;
  let purgedSubcollectionCount = 0;

  // 2. Scan featured_jobs_cache
  const cacheSnap = await db.collection("featured_jobs_cache").get();
  console.log(`Scanning ${cacheSnap.size} cache documents in featured_jobs_cache...`);

  for (const docSnap of cacheSnap.docs) {
    const data = docSnap.data();
    const sId = (data.schoolId || "").toLowerCase();

    if (!sId || !validSchoolIds.has(sId)) {
      console.log(`🗑️ [PURGE CACHE] Deleting orphaned cache job "${data.title}" (schoolId: "${data.schoolId}")`);
      await docSnap.ref.delete();
      purgedCacheCount++;
    }
  }

  // 3. Scan collectionGroup jobs
  try {
    const groupSnap = await db.collectionGroup("jobs").get();
    console.log(`Scanning ${groupSnap.size} total subcollection job documents...`);

    for (const jobDoc of groupSnap.docs) {
      const jData = jobDoc.data();
      const parentSchoolId = jobDoc.ref.parent.parent ? jobDoc.ref.parent.parent.id.toLowerCase() : "";
      const sId = (jData.schoolId || parentSchoolId).toLowerCase();

      if (!sId || !validSchoolIds.has(sId)) {
        console.log(`🗑️ [PURGE SUBCOLLECTION] Deleting orphaned job "${jData.title}" (schoolId: "${sId}")`);
        await jobDoc.ref.delete();
        purgedSubcollectionCount++;
      }
    }
  } catch (err) {
    console.warn("Notice: collectionGroup query fallback:", err);
  }

  console.log("=================================================");
  console.log(`✅ PURGE COMPLETE | Purged cache docs: ${purgedCacheCount} | Purged subcollection docs: ${purgedSubcollectionCount}`);
  console.log("=================================================");
}

purgeUntrackedJobs().catch(console.error);
