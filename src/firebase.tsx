"use client";

import { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  ReactNode, 
  useMemo 
} from "react";
import { 
  initializeApp, 
  getApps, 
  getApp, 
  FirebaseApp 
} from "firebase/app";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  Firestore, 
  collection,
  onSnapshot,
  Query,
  DocumentData
} from "firebase/firestore";
import { 
  getAuth, 
  onAuthStateChanged, 
  User, 
  signOut as firebaseSignOut, 
  Auth 
} from "firebase/auth";

// 🛡️ Zero-Doubt Config Sync
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "studio-2840117705-12faa.firebaseapp.com",
  projectId: "studio-2840117705-12faa",
  storageBucket: "studio-2840117705-12faa.firebasestorage.app",
  messagingSenderId: "342003687950",
  appId: "1:342003687950:web:a88b8ff24c82f67c1c125f"
};

const isBrowser = typeof window !== "undefined";

// 🛰️ Isomorphic Initialization
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db: Firestore = isBrowser ? getFirestore(app) : null as any;
const auth: Auth = isBrowser ? getAuth(app) : null as any;

export const useFirestore = () => db;

/**
 * 🛠️ Utility: useMemoFirebase
 * Memoization helper for Firebase queries.
 */
export function useMemoFirebase<T>(fn: () => T, deps: any[]): T {
  return useMemo(fn, deps);
}

/**
 * 🛰️ Hook: useCollection
 * Real-time listener for Firestore collections.
 */
export function useCollection<T = DocumentData>(query: Query | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(query, 
      (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as T));
        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error("Collection sync error:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}

/**
 * 🛰️ Hook: useDoc
 * Real-time listener for a single Firestore document.
 */
export function useDoc<T = DocumentData>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!path || !db) {
      setIsLoading(false);
      return;
    }

    const docRef = doc(db, path);
    const unsubscribe = onSnapshot(docRef, 
      (snap) => {
        if (snap.exists()) {
          setData({ id: snap.id, ...snap.data() } as T);
        } else {
          setData(null);
        }
        setIsLoading(false);
      },
      () => setIsLoading(false)
    );

    return () => unsubscribe();
  }, [path]);

  return { data, isLoading };
}

/**
 * 🛠️ Utility: Non-blocking Document Update
 */
export async function setDocumentNonBlocking(collectionName: string, docId: string, data: any) {
  if (!db) return null;
  try {
    const docRef = doc(db, collectionName, docId);
    return await setDoc(docRef, data, { merge: true });
  } catch (error) {
    console.error("Firebase write error:", error);
    return null;
  }
}

// 🛡️ Auth Context Type Definitions
interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true 
});

/**
 * 🛰️ Provider: Firebase Client Intelligence
 */
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

    const unsubscribe = onAuthStateChanged(auth, async (u: User | null) => {
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

  if (!mounted) return null;

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * 🛰️ Updated Hook: useUser
 * Retrieves core metadata (customId, isAdmin) from users/{uid}
 */
export const useUser = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  
  const { data: meta, isLoading: metaLoading } = useDoc<any>(
    user ? `users/${user.uid}` : null
  );

  return { 
    user, 
    uid: user?.uid ?? null,
    customId: meta?.customId ?? null,
    isAdmin: meta?.isAdmin ?? false,
    loading: authLoading || metaLoading
  };
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within a FirebaseClientProvider");
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

export { app, db, auth };