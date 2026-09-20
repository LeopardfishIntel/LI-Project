'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Lock, Clock, Zap, Sparkles } from 'lucide-react';
import { useAuth, useDoc, db } from '@/firebase';
import { doc } from 'firebase/firestore';
import { getTimeUntilLocalMidnight, getLocalDateString } from '@/lib/utils/timeUtils';
import { cn } from '@/lib/utils';
import type { TeacherProfile } from '@/lib/types';

export function ClearanceRibbon() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  const teacherDocRef = React.useMemo(() => (user && db ? doc(db, 'teachers', user.uid) : null), [user]);
  const { data: teacherProfile } = useDoc<TeacherProfile>(teacherDocRef);

  const isAdmin = Boolean(user && (user.email === 'fred@leopardfish.intel' || user.email?.includes('admin') || teacherProfile?.role === 'admin' || teacherProfile?.teacherId === 'FLI007'));
  const isRelocationPassActive = Boolean(
    teacherProfile?.relocation_pass_active &&
    teacherProfile?.relocation_pass_expires_at &&
    new Date(teacherProfile.relocation_pass_expires_at).getTime() > Date.now()
  );
  const daysLeft = isRelocationPassActive && teacherProfile?.relocation_pass_expires_at
    ? Math.max(1, Math.ceil((new Date(teacherProfile.relocation_pass_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const allowance = isAdmin ? 1000 : (teacherProfile?.evaluations_allowance ?? 20);
  const used = teacherProfile?.evaluations_used ?? 0;
  const isPro = teacherProfile?.tier === 'pro' || isAdmin;
  const remainingEvaluations = Math.max(0, allowance - used);

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      setTimeUntilReset(getTimeUntilLocalMidnight().formatted);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenDataLock = () => {
    window.dispatchEvent(new CustomEvent('lfi:open-intel-modal', {
      detail: {
        isDataLock: true,
        category: 'Salary'
      }
    }));
  };

  if (!mounted) return null;

  // Don't show inside admin or login/signup/mismatch pages, or when user is not logged in
  if (!user || pathname.startsWith('/admin') || pathname === '/login' || pathname === '/signup' || pathname === '/framework-mismatch') {
    return null;
  }

  return (
    <aside aria-label="Operative Clearance and Quota Tracker" className="w-full bg-slate-950/95 border-b border-white/10 px-4 py-2 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-300">
            <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
            Clearance: <span className="text-emerald-400 font-mono">{
              isAdmin 
                ? "Admin Intel (FLI007)" 
                : isRelocationPassActive 
                  ? `Relocation Pass (${daysLeft}d left · 20/day)` 
                  : "Verified K-12"
            }</span>
          </span>
          <span className="text-slate-700 hidden sm:inline">|</span>
          <span className={cn(
            "font-mono font-bold px-2 py-0.5 rounded text-[11px]",
            remainingEvaluations > 0 
              ? "bg-emerald-950/40 text-emerald-300 border border-emerald-500/20" 
              : "bg-amber-950/40 text-amber-300 border border-amber-500/20"
          )}>
            ⚡ {remainingEvaluations}/{allowance} Evaluations Today
          </span>
          <span className="text-slate-700 hidden sm:inline">|</span>
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
            <Clock className="size-3 text-amber-400" />
            Resets in: <strong className="text-white font-mono">{timeUntilReset || 'midnight'}</strong>
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenDataLock}
          className="text-[11px] font-bold text-primary hover:text-orange-400 uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer bg-primary/10 hover:bg-primary/20 border border-primary/30 px-2.5 py-1 rounded"
        >
          <Zap className="size-3 text-primary" />
          <span>+ Request AI Uplift / Unlock (+20)</span>
        </button>
      </div>
    </aside>
  );
}
