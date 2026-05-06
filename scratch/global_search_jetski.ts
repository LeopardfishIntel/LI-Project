import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query } from "firebase/firestore";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function globalSearch() {
  const collections = ["locations_costOfLiving", "schools", "transport_intel", "teacher_requirements", "system"];
  
  for (const colName of collections) {
    console.log(`--- SEARCHING ${colName} ---`);
    const q = query(collection(db, colName));
    const snap = await getDocs(q);
    
    snap.forEach(doc => {
      const data = JSON.stringify(doc.data()).toLowerCase();
      if (data.includes("jetski")) {
        console.log(`MATCH FOUND IN ${colName} DOC:`, doc.id);
        console.log(JSON.stringify(doc.data(), null, 2));
      }
    });
  }
}

globalSearch();
