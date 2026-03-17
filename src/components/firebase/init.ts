'use client';

import { getFirebaseInstance } from '@/lib/firebase';
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
 * Persistence is now handled via localCache in the initializeFirestore protocol.
 */
export async function initializeFirebase(): Promise<FirebaseServices> {
  const { firebaseApp, firestore, auth, storage } = getFirebaseInstance();

  if (typeof window === 'undefined') {
    // Return instances for build-time resolution, though hooks should defer to client
    return { 
      firebaseApp: firebaseApp!, 
      auth: auth!, 
      firestore: firestore!, 
      storage: storage! 
    };
  }

  if (!firebaseApp || !firestore || !auth || !storage) {
    throw new Error("L.F.I. Critical: Firebase environment not initialized.");
  }

  return { firebaseApp, auth, firestore, storage };
}
