 "use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { initializeFirestore, getFirestore, doc, setDoc, Firestore } from "firebase/firestore";
import { getAuth, onAuthStateChanged, User, signOut as firebaseSignOut, Auth } from "firebase/auth";

// 🛰️ TACTICAL CONFIG
export const firebaseConfig = {
  apiKey: "AIzaSyCsXjVXsRxZerNaYj7kFWTyxdMlR6kLK9U",
  authDomain: "studio-2840117705-12faa.firebaseapp.com",
  projectId: "studio-2840117705-12faa",
  storageBucket: "studio-2840117705-12faa.firebasestorage.app",
  messagingSenderId: "342003687950",
  appId: "1:342003687950:web:a88b8ff24c82f67c1c125f"
};

// 🛡️ SAFE INITIALIZATION (Bridges Server/Client Gap)
const isBrowser = typeof window !== "undefined";

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

if (isBrowser) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  try {
    db = getFirestore(app);
  } catch (e) {
    db = initializeFirestore(app, { experimentalForceLongPolling: true });
  }
  auth = getAuth(app);
} else {
  // 🛰️ Server-side Fallbacks (Prevents "undefined" crashes during build)
  app = null as any;
  db = null as any;
  auth = null as any;
}

/**
 * 🛡️ THE PUNCH-THROUGH (RECOVERY)
 */
export async function setDocumentNonBlocking(collectionName: string, docId: string, data: any) {
  if (!db) return; // Guard for server-side execution
  const docRef = doc(db, collectionName, docId);
  return setDoc(docRef, data, { merge: true });
}

// --- AUTH CONTEXT ---
const AuthContext = createContext<{ user: User | null; loading: boolean }>({ 
  user: null, 
  loading: true 
});

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// --- TACTICAL HOOKS ---
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within FirebaseClientProvider");
  return { ...context, signOut: () => (auth ? firebaseSignOut(auth) : Promise.resolve()) };
};

export const useUser = () => {
  const context = useContext(AuthContext);
  return { ...context, isUserLoading: context.loading, isAdmin: false };
};

// --- DATA HOOKS (Bridging to your .tsx files) ---
import { useCollection as useCollectionHook } from "./firestore/use-collection";
import { useDoc as useDocHook } from "./firestore/use-doc";

export const useCollection = useCollectionHook;
export const useDoc = useDocHook;
export const useFirestore = () => db;
export const useMemoFirebase = <T,>(fn: () => T, deps: any[]): T => useMemo(fn, deps);

export { app, db, auth };