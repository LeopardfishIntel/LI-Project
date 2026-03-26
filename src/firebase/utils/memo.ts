 "use client";

import { useMemo } from 'react';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

/**
 * 🛰️ LEOPARDFISH TACTICAL CONFIG
 * Ensure these environment variables are set in your .env.local 
 * and your Firebase App Hosting dashboard.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Singleton Pattern: Initialize only if no apps exist
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Export production-grade instances
export const db = getFirestore(app);
export const auth = getAuth(app);

/**
 * 🛡️ HYDRATION GUARD HOOK
 * Use this to wrap Firebase-dependent logic in components
 */
export function useMemoFirebase<T>(factory: () => T, deps: any[]): T {
  return useMemo(factory, deps);
}

export default app;