
import { DependencyList, useMemo } from 'react';

/**
 * 🛡️ TACTICAL STABILITY REGISTRY
 * Tracks stabilized references without mutating core SDK objects.
 * Essential for preventing infinite render loops in useCollection and useDoc.
 */
const memoizedRefs = new WeakSet<object>();

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  const memoized = useMemo(factory, deps);
  if (memoized && typeof memoized === 'object') {
    memoizedRefs.add(memoized);
  }
  return memoized;
}

export function isMemoized(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return true; 
  return memoizedRefs.has(obj);
}
