import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
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

async function inspectBahrain() {
  console.log("--- INSPECTING BAHRAIN FULL ---");
  const d = doc(db, "locations_costOfLiving", "bahrain");
  const snap = await getDoc(d);
  
  if (snap.exists()) {
    console.log(JSON.stringify(snap.data(), null, 2));
  } else {
    console.log("BAHRAIN DOC NOT FOUND");
  }
}

inspectBahrain();
