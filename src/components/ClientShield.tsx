 "use client";

import React, { useEffect, useState } from "react";

/**
 * 🛡️ LEOPARDFISH TACTICAL HYDRATION GUARD (RECOVERED)
 * Prevents "reading 'call'" errors while maintaining visual continuity.
 */
export function ClientShield({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // TACTICAL FIX: Do NOT return null. 
  // Return a themed fragment to prevent the "Blackout" effect.
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#020617] text-white opacity-0">
        {/* The opacity-0 prevents content flickering while keeping the layout space reserved */}
        {children}
      </div>
    );
  }

  return <>{children}</>;
}