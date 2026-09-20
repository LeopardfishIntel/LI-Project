'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

/**
 * 🛰️ FLOATING PILL BUTTON (Bottom Corner)
 * Fixed floating orange pill with subtle shadow, high contrast text, and auto page-context detection.
 */
export function FloatingIntelButton() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleClick = () => {
    // 🛰️ Automatic Page Context Extraction
    let schoolName = '';
    let schoolId = '';
    let city = '';
    let country = '';
    let location = '';
    let category = 'Salary';

    if (pathname?.startsWith('/schools/')) {
      schoolId = pathname.replace('/schools/', '').replace(/\/$/, '');
      const h1El = document.querySelector('h1');
      if (h1El) schoolName = h1El.innerText.trim();
      
      // Look for location element in school profile header
      const mapPinEl = document.querySelector('h1 + div span, h1 ~ div .text-muted-foreground span, section .text-muted-foreground span');
      if (mapPinEl) {
        location = mapPinEl.textContent?.trim() || '';
      }
      category = 'Salary';
    } else if (pathname?.includes('/featured-jobs')) {
      category = 'Other';
    } else if (pathname?.includes('/financial-forecaster')) {
      category = 'Salary';
    } else if (pathname?.includes('/decide')) {
      category = 'Other';
    } else if (pathname?.includes('/find-your-fit')) {
      category = 'Other';
    }

    const event = new CustomEvent('lfi:open-intel-modal', {
      detail: {
        url: typeof window !== 'undefined' ? window.location.href : '',
        path: pathname,
        pageTitle: typeof document !== 'undefined' ? document.title : '',
        schoolId,
        schoolName,
        organisation: schoolName || (schoolId ? `School ID: ${schoolId}` : ''),
        location,
        city,
        country,
        category
      }
    });

    window.dispatchEvent(event);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] group print:hidden">
      {/* Subtle pulse glow backdrop */}
      <div className="absolute inset-0 bg-[#d95f02]/30 rounded-full blur-md animate-pulse opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <button
        onClick={handleClick}
        type="button"
        aria-label="Submit Intel or Feedback"
        className={cn(
          "relative flex items-center gap-2.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full",
          "bg-gradient-to-r from-[#d95f02] via-[#ea580c] to-[#f97316] hover:from-[#ea580c] hover:to-[#fb923c]",
          "text-white font-bold text-xs sm:text-sm tracking-wide",
          "shadow-[0_4px_24px_rgba(217,95,2,0.45)] border border-white/20",
          "transition-all duration-300 hover:scale-105 active:scale-95",
          "cursor-pointer select-none"
        )}
      >
        <MessageSquare className="size-4 sm:size-4.5 shrink-0 text-white drop-shadow-sm" />
        <span className="font-black tracking-wider uppercase text-[11px] sm:text-xs drop-shadow-sm">
          Submit Intel / Feedback
        </span>
      </button>
    </div>
  );
}