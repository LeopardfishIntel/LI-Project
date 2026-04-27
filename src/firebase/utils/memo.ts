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
import { db, auth } from "@/firebase";

// Export production-grade instances imported from the central config
export { db, auth };

/**
 * 🛡️ HYDRATION GUARD HOOK
 * Use this to wrap Firebase-dependent logic in components
 */
export function useMemoFirebase<T>(factory: () => T, deps: any[]): T {
  return useMemo(factory, deps);
}

// Removed undefined 'app' export