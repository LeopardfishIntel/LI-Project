'use client';

import { getFirebaseInstance } from '@/lib/firebase';
import { enableIndexedDbPersistence } from 'firebase/firestore';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

export type FirebaseServices = {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
};

/**
 * 🛰️ ISOMORPHIC FIREBASE INITIALIZER
 * Optimized for Firebase App Hosting. Delegates to the @/lib/firebase singleton.
 */
export async function initializeFirebase(): Promise<FirebaseServices> {
  const { firebaseApp, firestore, auth, storage } = getFirebaseInstance();

  if (!firebaseApp || !firestore || !auth || !storage) {
    // If the singleton returned null (e.g. during SSR build phase), 
    // we return a proxy or handle it in the provider.
    throw new Error("L.F.I. Critical: Firebase environment not initialized.");
  }

  // Persistence is a browser-only protocol.
  if (typeof window !== 'undefined') {
    try {
      await enableIndexedDbPersistence(firestore);
    } catch (err: any) {
      if (err.code !== 'failed-precondition') {
        console.warn('L.F.I. Persistence Protocol: Cache restricted.', err.message);
      }
    }
  }

  return { firebaseApp, auth, firestore, storage };
}
