'use client';

import React, { useEffect, useState } from 'react';
import { Binoculars } from '@/components/icons/Binoculars';
import { cn } from '@/lib/utils';

/**
 * 🛡️ TACTICAL BRAND IDENTITY NODE
 * Optimized for zero-doubt deployment on Firebase.
 * Uses hard-coded HEX values and a hydration guard.
 */
export default function BrandLogo({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        {mounted ? (
          <Binoculars className="size-6 text-[#f97316]" />
        ) : (
          <div className="size-6" />
        )}
      </div>
      <span className="font-black text-xl tracking-tighter uppercase leading-none">
        <span className="text-[#f97316]">Leopardfish</span>
        <span className="ml-1 text-[#007FFF]">Intel</span>
      </span>
    </div>
  );
}
