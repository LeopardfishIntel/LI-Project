'use client';

import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import React from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <TooltipProvider delayDuration={0}>
          {children}
          <Toaster />
      </TooltipProvider>
    </FirebaseClientProvider>
  );
}
