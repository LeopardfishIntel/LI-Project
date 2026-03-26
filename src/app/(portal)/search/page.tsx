 'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * 🛰️ SEARCH CONTENT (INTERNAL COMPONENT)
 * This holds the logic that uses useSearchParams()
 */
function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  return (
    <div className="space-y-6">
      <div className="p-4 border border-border bg-background/50 rounded-lg">
        <p className="text-sm font-mono text-primary uppercase tracking-widest">
          Active Scan Query: <span className="text-white">{query || "NONE"}</span>
        </p>
      </div>
      
      {/* Search results or empty state would go here */}
      <div className="text-muted-foreground italic">
        {query ? `Searching Leopardfish Intel for "${query}"...` : "Awaiting search parameters..."}
      </div>
    </div>
  );
}

/**
 * 🛰️ SEARCH MISSION CONTROL (PAGE ENTRY)
 */
export default function SearchPage() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-black tracking-tighter text-primary mb-8 uppercase italic">
        Intelligence Search
      </h1>
      
      {/* 🛡️ TACTICAL SHIELD: Required by Next.js 15 for useSearchParams */}
      <Suspense fallback={
        <div className="animate-pulse text-primary font-mono tracking-tighter uppercase">
          Initializing Frequency Scan...
        </div>
      }>
        <SearchContent />
      </Suspense>
    </div>
  );
}

// 🚀 TACTICAL OVERRIDE: Forces the page to be rendered on the client/request-time
export const dynamic = 'force-dynamic'; 