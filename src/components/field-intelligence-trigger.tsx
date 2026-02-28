'use client';

import { Button } from '@/components/ui/button';
import { Binoculars } from 'lucide-react';

/**
 * @fileOverview A tactical trigger for the Field Intelligence dossier.
 * This is a Client Component to handle the window event dispatch.
 */
export function FieldIntelligenceTrigger() {
  const handleTrigger = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lfi:open-intel-modal'));
    }
  };

  return (
    <Button 
      size="lg" 
      className="h-14 px-10 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-sm shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]"
      onClick={handleTrigger}
    >
      <Binoculars className="mr-3 size-5" /> File Field Intel
    </Button>
  );
}
