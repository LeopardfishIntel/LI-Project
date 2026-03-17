"use client";

import React, { useEffect, useState } from "react";

/**
 * 🛡️ LEOPARDFISH TACTICAL HYDRATION GUARD
 * Blocks pre-rendering drift by deferring client-only logic until mount.
 */
export function ClientShield({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <>{children}</>;
}