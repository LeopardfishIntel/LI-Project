'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Mail, ExternalLink, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FrameworkMismatchPage() {
  return (
    <div className="min-h-[85vh] bg-[#020617] text-slate-100 flex items-center justify-center p-4 md:p-8">
      <div className="max-w-2xl w-full space-y-8 bg-slate-950/70 border border-white/10 p-6 md:p-10 rounded-sm shadow-2xl backdrop-blur-md">
        
        {/* Header Badge & Title */}
        <div className="space-y-3 border-b border-white/10 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono uppercase tracking-wider">
            <ShieldAlert className="size-4" />
            Platform Scope Calibration
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white italic">
            📊 Framework Mismatch
          </h1>
          <p className="text-sm font-semibold text-slate-400">
            Why am I seeing this?
          </p>
        </div>

        {/* Narrative & Explanation Body */}
        <div className="space-y-4 text-sm md:text-base leading-relaxed text-slate-300">
          <p>
            <strong className="text-white">Leopardfish Intel</strong> is a specialized financial audit tool designed strictly for international K-12 career educators.
          </p>
          <p>
            Because true international school packages include complex variables—like localized tax bands, flight stipends, worldwide medical insurance caps, and corporate dependent tuition allowances—our financial models cannot accurately process language center, TEFL, or domestic public school salary data.
          </p>
          <p>
            To protect the savings projections of our core teaching community, we restrict access to educators holding domestic teaching licenses working within verified international school frameworks (such as IB, COBIS, or CIS).
          </p>
        </div>

        {/* Support & Dispute Box */}
        <div className="p-4 rounded bg-white/[0.03] border border-white/10 space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Mail className="size-3.5 text-primary" />
            Accredited Teacher Review
          </div>
          <p className="text-xs text-slate-400">
            If you are an international school teacher and believe your account was flagged in error, please contact our verification desk at{' '}
            <a 
              href="mailto:support@leopardfishintel.com" 
              className="text-primary hover:underline font-medium text-white"
            >
              support@leopardfishintel.com
            </a>.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link href="/signup" className="flex-1">
            <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 gap-2">
              <ArrowLeft className="size-4" />
              Adjust Credentials
            </Button>
          </Link>
          <Link href="/" className="flex-1">
            <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold gap-2">
              <Compass className="size-4" />
              Explore Public Tools
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
