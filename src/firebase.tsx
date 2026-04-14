"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, doc, setDoc, Firestore, initializeFirestore } from "firebase/firestore";
import { getAuth, onAuthStateChanged, User, signOut as firebaseSignOut, Auth } from "firebase/auth";

// 🛰️ TACTICAL COORDINATES: Verified 2026 Project SDK
export const firebaseConfig = {
  apiKey: "AIzaSyCsXjVXsRxZerNaYj7kFWTyxdMlR6kLK9U",
  authDomain: "studio-2840117705-12faa.firebaseapp.com",
  projectId: "studio-2840117705-12faa",
  storageBucket: "studio-2840117705-12faa.firebasestorage.app",
  messagingSenderId: "342003687950",
  appId: "1:342003687950:web:a88b8ff24c82f67c1c125f"
};

const isBrowser = typeof window !== "undefined";

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

// Isomorphic Initialization Protocol
app = getApps().length ? getApp() : initializeApp(firebaseConfig);
if (isBrowser) {
  try {
    db = getFirestore(app);
  } catch (e) {
    db = initializeFirestore(app, { experimentalForceLongPolling: true });
  }
  auth = getAuth(app);
} else {
  db = getFirestore(app);
  auth = null as any;
}

// ✅ FIXED: Explicit Export for Build Engine
export async function setDocumentNonBlocking(collectionName: string, docId: string, data: any) {
  try {
    const docRef = doc(db, collectionName, docId);
    return await setDoc(docRef, data, { merge: true });
  } catch (error) {
    console.error("Firebase write error:", error);
    return null;
  }
}

// --- AUTH CONTEXT ---
const AuthContext = createContext<{ user: User | null; loading: boolean }>({ 
  user: null, 
  loading: true 
});

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!auth) {
        setLoading(false);
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const token = await u.getIdToken();
        document.cookie = `__session=${token}; path=/; SameSite=Lax; Secure`;
      } else {
        document.cookie = "__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 🛡️ Hydration Guard
  if (!mounted) return null;

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
  return { 
    ...context, 
    signOut: async () => {
      if (auth) {
        await firebaseSignOut(auth);
        document.cookie = "__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
    } 
  };
};

export const useUser = () => {
  const context = useContext(AuthContext);
  return { ...context, isUserLoading: context?.loading ?? true, isAdmin: false };
};

// --- DATA HOOKS ---
import { useCollection as useCollectionHook } from "./firebase/firestore/use-collection";
import { useDoc as useDocHook } from "./firebase/firestore/use-doc";

export const useCollection = useCollectionHook;
export const useDoc = useDocHook;
export const useFirestore = () => db;
export const useMemoFirebase = <T,>(fn: () => T, deps: any[]): T => useMemo(fn, deps);

export { app, db, auth };