"use client";
"use client";
import { useMemo } from 'react';

export function useMemoFirebase<T>(factory: () => T, deps: any[]): T {
  return useMemo(factory, deps);
}
