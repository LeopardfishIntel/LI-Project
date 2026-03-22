import { useState, useEffect } from 'react';
import { doc, onSnapshot, DocumentReference, DocumentData } from 'firebase/firestore';
import { db } from '../index';

export function useDoc<T = DocumentData>(
  pathOrRef: string | DocumentReference<DocumentData> | null | undefined
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!pathOrRef) {
      setIsLoading(false);
      return;
    }

    const finalRef = typeof pathOrRef === 'string' 
      ? doc(db, pathOrRef) 
      : pathOrRef;

    const unsubscribe = onSnapshot(
      finalRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() } as T);
        } else {
          setData(null);
        }
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [pathOrRef]);

  return { data, isLoading, error };
}