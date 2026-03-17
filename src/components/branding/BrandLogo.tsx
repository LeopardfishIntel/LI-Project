'use client';

import React, { useEffect, useState } from 'react';
import { Binoculars } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 🛡️ LEOPARDFISH TACTICAL LOGO
 * Optimized for Next.js 15 SSR with hydration guards.
 * Uses hard-coded HEX values to prevent CSS bundle drift.
 */
export default function BrandLogo({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);

  // 🛰️ HYDRATION GUARD
  // Prevents mismatch between Server HTML and Client interactive state
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        {mounted ? (
          <Binoculars className="size-6 text-[#f97316]" />
        ) : (
          <div className="size-6" /> // Placeholder to maintain layout stability
        )}
      </div>
      <span className="font-bold text-lg tracking-tighter text-white">
        <span className="text-[#f97316]">Leopardfish</span>{" "}
        <span className="text-[#007FFF]">Intel</span>
      </span>
    </div>
  );
}
