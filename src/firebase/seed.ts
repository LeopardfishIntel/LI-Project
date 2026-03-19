'use client';

import { collection, doc } from 'firebase/firestore';
import { useFirestore } from './provider';
import { setDocumentNonBlocking } from './non-blocking-updates';

/**
 * Standard Operational Spotlight Data
 */
const MODULES = [
  {
    id: 'nook-finder',
    name: 'Nook finder',
    summary: 'Aligning subject expertise with local regional realities.',
    category: 'Discovery',
    status: 'active',
    icon: 'Target'
  },
  {
    id: 'contract-decoder',
    name: 'Contract decoder',
    summary: 'Revealing the true financial signature of regional offers.',
    category: 'Evaluation',
    status: 'active',
    icon: 'Calculator'
  },
  {
    id: 'matrix-analyser',
    name: 'Matrix analyser',
    summary: 'Side-by-side comparison of institutional benchmarks.',
    category: 'Decision',
    status: 'active',
    icon: 'GitCompare'
  }
];

/**
 * Ensures the spotlight registry is populated.
 */
export function useSeedIntelModules() {
  const db = useFirestore();

  return () => {
    MODULES.forEach(module => {
      const ref = doc(collection(db, 'intel_spotlight'), module.id);
      setDocumentNonBlocking(ref, module, { merge: true });
    });
  };
}
