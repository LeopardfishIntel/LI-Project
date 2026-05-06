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

async function inspect() {
  console.log("--- INSPECTING AZERBAIJAN ---");
  const q = query(collection(db, "schools"));
  const snap = await getDocs(q);
  
  snap.forEach(doc => {
    const data = doc.data();
    if (String(data.schoolname || "").toLowerCase().includes("azerbaijan")) {
      console.log("SCHOOL FOUND:", doc.id);
      console.log(JSON.stringify(data, null, 2));
    }
  });

  console.log("--- INSPECTING COL ---");
  const q2 = query(collection(db, "locations_costOfLiving"));
  const snap2 = await getDocs(q2);
  snap2.forEach(doc => {
    if (doc.id.toLowerCase().includes("azerbaijan") || doc.id.toLowerCase().includes("baku")) {
      console.log("COL MATCH FOUND:", doc.id);
      console.log(JSON.stringify(doc.data(), null, 2));
    }
  });
}

inspect();
