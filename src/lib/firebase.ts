'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from '@/components/firebase/config';

let firebaseApp: FirebaseApp;
let firestore: Firestore;
let auth: Auth;
let storage: FirebaseStorage;

/**
 * 🛡️ TACTICAL FIREBASE SINGLETON
 * Ensures a single instance across the Next.js 15 app lifecycle.
 * Ingests the authoritative config and handles SSR/Client boundaries.
 */
export function getFirebaseInstance() {
  // Guard for Node.js build environment
  if (typeof window === 'undefined') {
    return { firebaseApp: null, firestore: null, auth: null, storage: null };
  }

  if (!getApps().length) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
    } catch (e) {
      firebaseApp = getApp();
    }
  } else {
    firebaseApp = getApp();
  }

  if (!firestore) firestore = getFirestore(firebaseApp);
  if (!auth) auth = getAuth(firebaseApp);
  if (!storage) storage = getStorage(firebaseApp);

  return { firebaseApp, firestore, auth, storage };
}

/**
 * 🛰️ NULL-PARITY WRAPPER
 * Wraps Firestore operations to return null instead of throwing.
 * Specifically supports the MetricRow safety bypass protocol.
 */
export async function tacticalFetch<T>(promise: Promise<T>): Promise<T | null> {
  return promise.catch((err) => {
    console.warn("L.F.I. Data Access Intercepted: Null-parity returned.", err.message);
    return null;
  });
}
