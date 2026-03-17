'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase, type FirebaseServices } from './init';

/**
 * 🛰️ CLIENT-SIDE SERVICE COORDINATOR
 * Manages the transition from SSR to interactive Firebase environment.
 */
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<FirebaseServices | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const init = async () => {
      const s = await initializeFirebase();
      setServices(s);
    };
    init();
  }, []);

  if (!mounted || !services) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="animate-pulse space-y-4 text-center">
          <div className="h-1 w-48 bg-[#f97316]/20 rounded-full mx-auto" />
          <p className="text-[10px] font-black text-[#f97316]/40 uppercase tracking-[0.4em]">Establishing Uplink...</p>
        </div>
      </div>
    );
  }

  return (
    <FirebaseProvider
      firebaseApp={services.firebaseApp}
      auth={services.auth}
      firestore={services.firestore}
      storage={services.storage}
    >
      {children}
    </FirebaseProvider>
  );
}
