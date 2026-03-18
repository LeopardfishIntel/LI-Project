 'use client';

import React, { useEffect, ReactElement, useState } from 'react';
import { Binoculars } from '@/components/icons/Binoculars';
import { cn } from '@/lib/utils';

/**
 * 🛡️ TACTICAL BRAND IDENTITY NODE v2
 * Weight-corrected for the "Iron Shell" protocol.
 * Transitioning from Black (900) to Bold (700).
 */
export default function BrandLogo({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={cn("flex items-center gap-2 select-none", className)}>
      <div className="relative">
        {mounted ? (
          <Binoculars className="size-6 text-[#f97316] drop-shadow-[0_0_8px_rgba(249,115,22,0.3)]" />
        ) : (
          <div className="size-6 bg-white/5 animate-pulse rounded-full" />
        )}
      </div>
      <span className="font-bold text-xl tracking-tighter leading-none flex items-baseline">
        <span className="text-[#f97316]">Leopardfish</span>
        <span className="ml-1 text-[#007FFF]">Intel</span>
      </span>
    </div>
  );
}