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

async function deepSearch() {
  console.log("--- SEARCHING FOR BAHRAIN ---");
  const q = query(collection(db, "locations_costOfLiving"));
  const snap = await getDocs(q);
  
  snap.forEach(doc => {
    const dataStr = JSON.stringify(doc.data()).toLowerCase();
    if (dataStr.includes("bahrain") || dataStr.includes("hamala") || dataStr.includes("manama")) {
      console.log("MATCH FOUND IN DOC:", doc.id);
      console.log("Keys:", Object.keys(doc.data()));
    }
  });
}

deepSearch();
