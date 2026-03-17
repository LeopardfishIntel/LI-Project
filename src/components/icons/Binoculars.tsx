
import React from 'react';

/**
 * 🛰️ TACTICAL OPTICS ICON
 * Stable inline SVG representation of the Binoculars signature.
 * Prevents build resolution failures from external icon libraries.
 */
export function Binoculars({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
      <path d="M12 8v8" />
      <circle cx="7" cy="12" r="3" />
      <circle cx="17" cy="12" r="3" />
    </svg>
  );
}
