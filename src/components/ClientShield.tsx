"use client";

import React, { useEffect, useState } from "react";

/**
 * @description Leopardfish Tactical Hydration Guard
 * Prevents TypeError: (reading 'call') by deferring 
 * client-specific logic until the component is mounted.
 */
export function ClientShield({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return <>{children}</>;
}
