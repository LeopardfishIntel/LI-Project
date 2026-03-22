 "use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getAuth, onAuthStateChanged, User, signOut as firebaseSignOut } from "firebase/auth";

// 🛰️ HARDCODED UPLINK: Bypassing .env for guaranteed connection
const firebaseConfig = {
  apiKey: "AIzaSyCsXjVXsRxZerNaYj7kFWTyxdMlR6kLK9U",
  authDomain: "studio-2840117705-12faa.firebaseapp.com",
  projectId: "studio-2840117705-12faa",
  storageBucket: "studio-2840117705-12faa.firebasestorage.app",
  messagingSenderId: "342003687950",
  appId: "1:342003687950:web:a88b8ff24c82f67c1c125f"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// 🛡️ PUNCH-THROUGH ENABLED
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

const auth = getAuth(app);
const AuthContext = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true });

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (!mounted) return <div className="bg-[#020617] min-h-screen" />;

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  return { ...context, signOut: () => firebaseSignOut(auth) };
};

export const useUser = () => {
  const context = useContext(AuthContext);
  return { ...context, isUserLoading: context.loading, isAdmin: false };
};

export { app, db, auth };

import { useCollection as useCollectionHook } from "./firestore/use-collection";
import { useDoc as useDocHook } from "./firestore/use-doc";

export const useCollection = useCollectionHook;
export const useDoc = useDocHook;
export const useFirestore = () => db;
export const useMemoFirebase = <T,>(fn: () => T, deps: any[]): T => useMemo(fn, deps);

export const setDocumentNonBlocking = async (ref: any, data: any, options: { merge?: boolean } = { merge: true }) => {
  const { setDoc } = await import("firebase/firestore");
  return setDoc(ref, data, options);
};