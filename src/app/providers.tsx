'use client';

import React, { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from "@/firebase";
import { TooltipProvider } from '@/components/ui/tooltip';

/**
 * 🛰️ MISSION CONTROL PROVIDERS (STABILIZED)
 * Protocol: Zero-Doubt Hydration + Full-Width Transparency
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // 🛡️ HYDRATION GUARD: Prevents the "reading call" error on Firebase Auth
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <FirebaseClientProvider>
      <TooltipProvider 
        delayDuration={0} 
        skipDelayDuration={0}
      >
        {/* 🛰️ TACTICAL ADJUSTMENT: 
            Using 'contents' ensures this div doesn't affect the layout/box model.
            Using 'opacity-0' vs 'opacity-100' with a transition prevents the "pop-in" effect.
        */}
        <div 
          className={`w-full flex-1 flex flex-col transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}
          style={{ display: mounted ? 'flex' : 'none' }}
        >
          {children}
        </div>
        
        <Toaster />
      </TooltipProvider>
    </FirebaseClientProvider>
  );
}