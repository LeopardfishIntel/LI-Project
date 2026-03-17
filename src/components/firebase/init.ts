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
 * Consolidated logic for Firebase App Hosting compatibility.
 * Strictly avoids browser-only APIs during the pre-hydration phase.
 */
export async function initializeFirebase(): Promise<FirebaseServices> {
  if (services) return services;

  let app: FirebaseApp;
  
  // Use explicit pattern for Firebase App Hosting environment variables
  try {
    // Attempt initialization without config (uses environment variables in production)
    app = getApps().length ? getApp() : initializeApp();
  } catch (e) {
    // Fallback to client config for local dev or if environment variables are missing
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }

  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const storage = getStorage(app);

  // Persistence is a browser-only capability.
  // Must be guarded to avoid crashing the Node.js build/SSR environment.
  if (typeof window !== 'undefined') {
    try {
      // Use firestore singleton to enable persistence
      await enableIndexedDbPersistence(firestore);
    } catch (err: any) {
      if (err.code !== 'failed-precondition') {
        // Log warnings but do not halt initialization
        console.warn('L.F.I. Persistence Protocol: Offline cache restricted.', err.message);
      }
    }
  }

  services = { firebaseApp: app, auth, firestore, storage };
  return services;
}
