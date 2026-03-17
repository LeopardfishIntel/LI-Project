
'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, Query, DocumentData, QuerySnapshot } from 'firebase/firestore';
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError } from './errors';
import { isMemoized } from './stability';

export type WithId<T> = T & { id: string };

export function useCollection<T = any>(query: Query<DocumentData> | null | undefined) {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!query) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<DocumentData>) => {
        setData(snapshot.docs.map(doc => ({ ...(doc.data() as T), id: doc.id })));
        setIsLoading(false);
      },
      (err) => {
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: (query as any).path || 'unknown_collection',
        });
        errorEmitter.emit('permission-error', contextualError);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  if (query && !isMemoized(query)) {
    throw new Error('L.F.I. Memory Leak Prevention: useCollection query must be stabilized via useMemoFirebase.');
  }

  return { data, isLoading };
}
