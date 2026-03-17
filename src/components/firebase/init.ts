import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

export type FirebaseServices = {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
};

let services: FirebaseServices | null = null;

/**
 * 🛰️ ISOMORPHIC FIREBASE INITIALIZER
 * Singleton pattern ensuring a single authoritative uplink to Firebase services.
 */
export async function initializeFirebase(): Promise<FirebaseServices> {
  if (services) return services;

  // Initialize via Firebase App Hosting or Fallback
  let app: FirebaseApp;
  try {
    app = getApps().length ? getApp() : initializeApp();
  } catch (e) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }

  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const storage = getStorage(app);

  // Enable persistence on client terminals
  if (typeof window !== 'undefined') {
    try {
      await enableIndexedDbPersistence(firestore);
    } catch (err: any) {
      if (err.code !== 'failed-precondition') {
        console.warn('L.F.I. Persistence Protocol: Offline cache unavailable.', err.message);
      }
    }
  }

  services = { firebaseApp: app, auth, firestore, storage };
  return services;
}
