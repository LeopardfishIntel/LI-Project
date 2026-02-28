'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Define a type for the services object
type FirebaseServices = {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
};

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export async function initializeFirebase(): Promise<FirebaseServices> {
  if (!getApps().length) {
    // Important! initializeApp() is called without any arguments because Firebase App Hosting
    // integrates with the initializeApp() function to provide the environment variables needed to
    // populate the FirebaseOptions in production. It is critical that we attempt to call initializeApp()
    // without arguments.
    let firebaseApp;
    try {
      // Attempt to initialize via Firebase App Hosting environment variables
      firebaseApp = initializeApp();
    } catch (e) {
      // Only warn in production because it's normal to use the firebaseConfig to initialize
      // during development
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }

    return await getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return await getSdks(getApp());
}

export async function getSdks(firebaseApp: FirebaseApp): Promise<FirebaseServices> {
  const firestore = getFirestore(firebaseApp);
  const storage = getStorage(firebaseApp);
  
  // Enable offline persistence for Firestore.
  // This allows the app to work offline and reduces online reads.
  try {
    await enableIndexedDbPersistence(firestore);
  } catch (err: any) {
      if (err.code == 'failed-precondition') {
        // This can happen if multiple tabs are open.
        console.warn('Firestore persistence failed: Multiple tabs open, persistence can only be enabled in one tab at a time.');
      } else if (err.code == 'unimplemented') {
        // The current browser does not support the required features.
        console.warn('Firestore persistence is not supported in this browser.');
      }
  }

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: firestore,
    storage: storage
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';