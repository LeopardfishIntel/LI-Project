import { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  onSnapshot, 
  Query, 
  DocumentData,
  CollectionReference
} from 'firebase/firestore';
import { db } from '../index';
import { applyDulwichCollegeShanghaiOverride } from '../../lib/utils';

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
  // We extract a stable key from the query including filter constraints to prevent re-running on every render while supporting query parameter changes.
  const queryMemoKey = pathOrQuery 
    ? (typeof pathOrQuery === 'string' 
        ? pathOrQuery 
        : (() => {
            try {
              const q = pathOrQuery as any;
              if (q?._query) {
                const pathStr = q._query.path?.toString() || 'path';
                const filtersStr = (q._query.filters || []).map((f: any) => {
                  const fieldStr = f.field?.segments ? f.field.segments.join('.') : (f.field?.canonicalString?.() || '');
                  const opStr = f.op || '';
                  const valStr = JSON.stringify(f.value || f.val || '');
                  return `${fieldStr}:${opStr}:${valStr}`;
                }).join('|');
                return `${pathStr}?${filtersStr}`;
              }
            } catch (e) {}
            return 'active-query';
          })())
    : 'null-query';

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
        const docs = snapshot.docs.map((doc) => {
          const docData = { ...doc.data(), id: doc.id, ref: doc.ref };
          return applyDulwichCollegeShanghaiOverride(docData);
        }) as (T & { id: string })[];
        
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