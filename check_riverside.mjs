import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkRiverside() {
  const snapshot = await getDocs(collection(db, 'schools'));
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.name && data.name.toLowerCase().includes('riverside')) {
      console.log(`Name: ${data.name}, housingprovision: ${data.housingprovision}`);
    }
  });
}

checkRiverside().catch(console.error);
