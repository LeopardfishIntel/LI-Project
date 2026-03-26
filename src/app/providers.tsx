 'use client';

import React, { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from "@/firebase";
import { TooltipProvider } from '@/components/ui/tooltip';

/**
 * 🛰️ MISSION CONTROL PROVIDERS (STABILIZED)
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // 🛡️ HYDRATION GUARD: Ensures the client is ready before 
  // rendering components that rely on browser APIs (like Firebase Auth)
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <FirebaseClientProvider>
      <TooltipProvider 
        delayDuration={0} 
        skipDelayDuration={0}
      >
        {/* If not mounted, we render children but keep them invisible 
            to prevent hydration mismatch while maintaining layout shift stability.
        */}
        <div style={{ visibility: mounted ? 'visible' : 'hidden' }}>
          {children}
        </div>
        
        <Toaster />
      </TooltipProvider>
    </FirebaseClientProvider>
  );
}