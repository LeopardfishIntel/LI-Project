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
 * Optimized for Firebase App Hosting. Strictly avoids browser-only APIs 
 * during the pre-rendering / Node.js build phase.
 */
export async function initializeFirebase(): Promise<FirebaseServices> {
  if (services) return services;

  let app: FirebaseApp;
  
  try {
    // Attempt initialization via App Hosting environment variables
    app = getApps().length ? getApp() : initializeApp();
  } catch (e) {
    // Fallback to static config for development
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }

  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const storage = getStorage(app);

  // Persistence is a browser-only protocol.
  // Must be guarded to prevent build-time crashes in Node.js.
  if (typeof window !== 'undefined') {
    try {
      await enableIndexedDbPersistence(firestore);
    } catch (err: any) {
      if (err.code !== 'failed-precondition') {
        console.warn('L.F.I. Persistence Protocol: Cache restricted.', err.message);
      }
    }
  }

  services = { firebaseApp: app, auth, firestore, storage };
  return services;
}
