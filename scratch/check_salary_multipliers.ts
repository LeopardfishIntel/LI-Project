import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
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

async function check() {
  const q = collection(db, "locations_costOfLiving");
  const snap = await getDocs(q);
  
  snap.forEach(doc => {
    const data = doc.data();
    for (let k in data) {
       const val = String(data[k]);
       if (val.toLowerCase().includes("aguinaldo") || val.toLowerCase().includes("sac") || val.toLowerCase().includes("thr")) {
          console.log("TERM FOUND IN DOC:", doc.id, "Key:", k, "Value:", val);
       }
    }
  });
}

check();
