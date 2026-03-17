'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, DocumentReference, DocumentData, DocumentSnapshot } from 'firebase/firestore';
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError } from './errors';
import { isMemoized } from './stability';

export function useDoc<T = any>(ref: DocumentReference<DocumentData> | null | undefined) {
  const [data, setData] = useState<(T & { id: string }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!ref) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      ref,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          setData({ ...(snapshot.data() as T), id: snapshot.id });
        } else {
          setData(null);
        }
        setIsLoading(false);
      },
      (err) => {
        const contextualError = new FirestorePermissionError({
          operation: 'get',
          path: ref.path,
        });
        errorEmitter.emit('permission-error', contextualError);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ref]);

  if (ref && !isMemoized(ref)) {
    throw new Error('L.F.I. Memory Leak Prevention: useDoc reference must be stabilized via useMemoFirebase.');
  }

  return { data, isLoading };
}
