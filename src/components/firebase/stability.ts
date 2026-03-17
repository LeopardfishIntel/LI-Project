import { DependencyList, useMemo } from 'react';

/**
 * 🛡️ TACTICAL STABILITY REGISTRY
 * A WeakSet to track memoized references without mutating SDK objects.
 */
const memoizedRefs = new WeakSet<object>();

/**
 * Marks a reference as stabilized for safe use in Firestore listeners.
 */
export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  const memoized = useMemo(factory, deps);
  if (memoized && typeof memoized === 'object') {
    memoizedRefs.add(memoized);
  }
  return memoized;
}

/**
 * Validates that a reference satisfies the Hydration Integrity Protocol.
 */
export function isMemoized(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return true; 
  return memoizedRefs.has(obj);
}
