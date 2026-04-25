import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

/**
 * 🛰️ LEOPARDFISH SERVER-SIDE BRIDGE
 * Logic: A clean, Auth-free initialization for Server Actions and AI Flows.
 * This prevents the "Cannot read properties of undefined (reading 'call')" error.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize App (Server-Safe)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Export only the Database
export const db = getFirestore(app);