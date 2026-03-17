'use client';

import React, { useEffect, useState } from 'react';
import { Binoculars } from '@/components/icons/Binoculars';
import { cn } from '@/lib/utils';

/**
 * 🛡️ INTEL SIGNATURE LOGO
 * Reinstated to match reference image: Binoculars icon + Orange/Blue split.
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
      <span className="font-black text-xl tracking-tighter uppercase">
        <span className="text-[#f97316]">Leopard</span>
        <span className="text-[#007FFF]">fish Intel</span>
      </span>
    </div>
  );
}
