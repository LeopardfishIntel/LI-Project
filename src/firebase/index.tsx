"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { getAuth, onAuthStateChanged, User, signOut as firebaseSignOut } from "firebase/auth";

// 🚀 TACTICAL CONFIG (Consolidated from .env.local)
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
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
        const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
        document.cookie = `__session=${token}; path=/; SameSite=Lax${isSecure ? '; Secure' : ''}`;

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

/**
 * 🛠️ Utility: Non-blocking Document Update
 */
export async function setDocumentNonBlocking(collectionOrRef: string | any, idOrData: string | any, dataMaybe?: any) {
  if (!db) return null;
  try {
    let docRef;
    let data;
    
    if (typeof collectionOrRef === 'string') {
      docRef = doc(db, collectionOrRef, idOrData as string);
      data = dataMaybe;
    } else {
      docRef = collectionOrRef;
      data = idOrData;
    }

    const { setDoc } = await import("firebase/firestore");
    return await setDoc(docRef, data, { merge: true });
  } catch (error) {
    console.error("Firebase write error:", error);
    return null;
  }
}

// --- SHARED DATA SENSORS ---
export { useCollection } from "./firestore/use-collection";
export { useDoc } from "./firestore/use-doc";