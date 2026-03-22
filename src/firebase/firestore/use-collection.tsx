import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  Query, 
  CollectionReference,
  DocumentData 
} from 'firebase/firestore';
import { db } from '../index';

export function useCollection<T = DocumentData>(
  pathOrQuery: string | Query<DocumentData> | null | undefined
) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!pathOrQuery) {
      setIsLoading(false);
      return;
    }

    // Protocol: Determine if we were handed a string path or a pre-built Query
    const finalQuery = typeof pathOrQuery === 'string' 
      ? collection(db, pathOrQuery) 
      : pathOrQuery;

    const unsubscribe = onSnapshot(
      finalQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];
        setData(docs);
        setIsLoading(false);
      },
      (err) => {
        console.error("Firestore Collection Error:", err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [pathOrQuery]);

  return { data, isLoading, error };
}