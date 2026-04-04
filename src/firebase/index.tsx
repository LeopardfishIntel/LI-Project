"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { getAuth, onAuthStateChanged, User, signOut as firebaseSignOut } from "firebase/auth";

// 🚀 TACTICAL CONFIG (Hardcoded for App Hosting Stability)
export const firebaseConfig = {
  apiKey: "AIzaSyCsXjVXsRxZerNaYj7kFWTyxdMlR6kLK9U",
  authDomain: "studio-2840117705-12faa.firebaseapp.com",
  projectId: "studio-2840117705-12faa",
  storageBucket: "studio-2840117705-12faa.firebasestorage.app",
  messagingSenderId: "342003687950",
  appId: "1:342003687950:web:a88b8ff24c82f67c1c125f"
};

// 🛡️ INITIALIZATION
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
export const useFirestore = () => db;

// --- AUTH CONTEXT INTERFACE ---
type UserRole = 'admin' | 'school' | 'sponsor' | 'standard' | null;

interface LeopardfishAuth {
  user: User | null;
  role: UserRole;
  isAdmin: boolean;
  customId: string | null;
  loading: boolean;
}

const AuthContext = createContext<LeopardfishAuth>({ 
  user: null, 
  role: null,
  isAdmin: false, 
  customId: null,
  loading: true 
});

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [customId, setCustomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (u) {
        // 🛰️ SESSION HANDSHAKE (Required for Middleware)
        const token = await u.getIdToken();
        document.cookie = `__session=${token}; path=/; SameSite=Lax; Secure`;

        // 🎯 REAL-TIME IDENTITY SENTRY
        const userRef = doc(db, "users", u.uid);
        const unsubDoc = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const currentRole = data.role || 'standard';
            
            // Check for explicit admin flag or admin role
            const adminStatus = data.isAdmin === true || currentRole === 'admin';
            
            setRole(currentRole as UserRole);
            setIsAdmin(adminStatus);
            setCustomId(data.customId || null); // 🕵️ AGENT 007 LINK
          } else {
            setRole('standard');
            setIsAdmin(false);
            setCustomId(null);
          }
          setLoading(false);
        });

        return () => unsubDoc();
      } else {
        // Clear all states on logout
        setRole(null);
        setIsAdmin(false);
        setCustomId(null);
        document.cookie = "__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, isAdmin, customId, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// --- TACTICAL HOOKS ---
export const useAuth = () => {
  const context = useContext(AuthContext);
  return { 
    ...context, 
    signOut: () => firebaseSignOut(auth) 
  };
};

export const useUser = () => useContext(AuthContext);

/**
 * 🎯 THE FREQUENCY STABILIZER
 * The <T,> syntax (with a comma) tells the compiler this is 
 * TypeScript logic, not a JSX tag.
 */
export const useMemoFirebase = <T,>(fn: () => T, deps: any[]) => useMemo(fn, deps);

// --- SHARED DATA SENSORS ---
export { useCollection } from "./firestore/use-collection";
export { useDoc } from "./firestore/use-doc";