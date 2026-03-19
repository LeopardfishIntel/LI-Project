import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

const firebaseConfig = {
  // Use a generic name here
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, 
  authDomain: "studio-2840117705.firebaseapp.com",
  projectId: "studio-2840117705",
  storageBucket: "studio-2840117705.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Singleton Pattern: Ensure only one instance runs
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);

export default app;