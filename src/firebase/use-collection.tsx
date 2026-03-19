 'use client';

import { useState, useEffect } from 'react';
// 1. Correct Core Imports
import { initializeApp, getApps, getApp } from 'firebase/app'; 
// 2. Correct Firestore Imports
import { 
  getFirestore, 
  collection, 
  query, 
  onSnapshot, 
  DocumentData 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Isomorphic Firebase Singleton Pattern
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export function useCollection<T = DocumentData>(path: string | undefined) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Tactical Guard: Prevent n.indexOf errors and SSR crashes
    if (!mounted || !path || typeof path !== 'string') return;

    setLoading(true);

    try {
      const colRef = collection(db, path);
      const q = query(colRef);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as T[];
        
        setData(docs);
        setLoading(false);
      }, (err) => {
        console.error("Firestore Error:", err);
        setError(err);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err: any) {
      setError(err);
      setLoading(false);
    }
  }, [path, mounted]);

  return { data, loading, error };
}