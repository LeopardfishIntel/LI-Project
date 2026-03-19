 'use client';

import app, { auth, db } from './config'; 
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

export type FirebaseServices = {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
};

/**
 * 🛰️ ISOMORPHIC FIREBASE INITIALIZER
 * Optimized for Leopardfish Protocol. Uses the local config singleton.
 */
export async function initializeFirebase(): Promise<FirebaseServices> {
  // Use the verified instances from our local src/firebase/config.ts
  const storage = getStorage(app);

  if (!app || !db || !auth || !storage) {
    throw new Error("L.F.I. Critical: Firebase environment not initialized.");
  }

  return { 
    firebaseApp: app, 
    auth: auth, 
    firestore: db, 
    storage: storage 
  };
}