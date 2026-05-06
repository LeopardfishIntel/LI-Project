import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkSchool() {
  const snapshot = await getDocs(query(collection(db, 'schools'), limit(1)));
  snapshot.forEach(doc => {
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

checkSchool().catch(console.error);
