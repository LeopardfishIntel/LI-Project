'use client';

import { collection, query, orderBy } from 'firebase/firestore';
import { useFirestore } from './provider';
import { useMemoFirebase } from './stability';
import { useCollection } from './use-collection';

export type IntelModule = {
  id: string;
  name: string;
  summary: string;
  category: string;
  status: 'active' | 'pending';
  icon: 'Target' | 'Calculator' | 'GitCompare' | 'ShieldAlert';
};

/**
 * Retreives operational spotlight dossiers from the local registry.
 */
export function useIntelModules() {
  const db = useFirestore();
  
  const q = useMemoFirebase(() => {
    return query(collection(db, 'intel_spotlight'), orderBy('status', 'asc'));
  }, [db]);

  const { data, isLoading } = useCollection<IntelModule>(q);

  return { modules: data, isLoading };
}
