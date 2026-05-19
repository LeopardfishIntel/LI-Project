'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Binoculars } from '@/components/icons/Binoculars';
import { cn } from '@/lib/utils';

/**
 * @fileOverview A high-impact floating action button (FAB) for global field intel transmission.
 * Styled to match the Tactical Ember design system with an active signal pulse.
 */
export function FloatingIntelButton() {
  const [mounted, setMounted] = useState(false);

  // 🛡️ HYDRATION GUARD: Prevents TypeError: (reading 'call') on Firebase
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[100] group print:hidden">
      {/* Tactical Glow / Pulse Effect */}
      <div className="absolute inset-0 bg-[#d95f02]/20 rounded-full animate-ping opacity-75 group-hover:opacity-0 transition-opacity"></div>
      
      <div className="relative">
        <Link href="/enquiry/" prefetch={false}>
          <Button 
            className={cn(
              "h-14 w-14 md:h-16 md:w-16 rounded-full bg-[#d95f02] hover:bg-[#d95f02]/90 text-white shadow-[0_0_30px_rgba(249,115,22,0.4)] border-2 border-white/10",
              "flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
            )}
          >
            <Binoculars className="size-6 md:size-7" />
            <span className="sr-only">Transmit field intel</span>
          </Button>
        </Link>

        {/* Tactical Hover Label */}
        <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0 pointer-events-none">
          <div className="glass px-4 py-2 rounded-sm border-[#d95f02]/30 whitespace-nowrap">
            <p className="text-[10px] font-black text-[#d95f02] tracking-[0.2em]">Transmit intel</p>
          </div>
        </div>
      </div>
    </div>
  );
}