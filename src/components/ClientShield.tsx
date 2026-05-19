 "use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * 🛡️ LEOPARDFISH TACTICAL HYDRATION GUARD (HARDENED)
 * Only mounts children once client-side stability is confirmed.
 */
export function ClientShield({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 🛰️ Protocol: Signal browser readiness
    setMounted(true);
  }, []);

  // 🕵️ TACTICAL FIX: 
  // Instead of rendering children at opacity-0 (which triggers server hangs),
  // we show a minimal, branded loading state until the client is ready.
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center space-y-4">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 animate-spin text-[#d95f02]" />
          <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em]">
            Initialising Terminal...
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}