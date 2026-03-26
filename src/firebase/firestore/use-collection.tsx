import { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  onSnapshot, 
  Query, 
  DocumentData,
  CollectionReference
} from 'firebase/firestore';
import { db } from '../index';

/**
 * 🛰️ TACTICAL DATA RETRIEVAL (STABILIZED)
 * Prevents infinite re-subscription loops in Next.js 15.
 */
export function useCollection<T = DocumentData>(
  pathOrQuery: string | Query<DocumentData> | null | undefined
) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 🛡️ MEMOIZATION SHIELD: 
  // We extract a stable key from the query to prevent re-running on every render.
  const queryMemoKey = typeof pathOrQuery === 'string' 
    ? pathOrQuery 
    : (pathOrQuery as any)?._query?.path?.toString() || 'static-query';

  useEffect(() => {
    // 1. Initial State Guard
    if (!pathOrQuery) {
      setIsLoading(false);
      setData([]);
      return;
    }

    setIsLoading(true);

    // 2. Protocol Resolution: Handle string path or complex Query object
    const finalQuery = typeof pathOrQuery === 'string' 
      ? collection(db, pathOrQuery) 
      : pathOrQuery;

    // 3. Real-time Subscription with Error Handling
    const unsubscribe = onSnapshot(
      finalQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id, // Ensure ID is always appended
        })) as (T & { id: string })[];
        
        setData(docs);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        // 🎯 LOG: Critical for debugging Firebase App Hosting environment issues
        console.error("🎯 Leopardfish Firestore Intel Error:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    );

    // 4. Cleanup: Prevents memory leaks and duplicate listeners
    return () => unsubscribe();
  }, [queryMemoKey]); // Dependency is the stable path, NOT the volatile object

  return { data, isLoading, error };
}