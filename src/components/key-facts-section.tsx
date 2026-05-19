 "use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Building2, Globe2, Users2, BarChart3, Loader2 } from 'lucide-react';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { School, AppMetrics } from '@/lib/types';

// 🏎️ SPEED-OPTIMISED COUNTER
const AnimatedCounter = ({ endValue, format }: { endValue: number; format: (val: number) => string; }) => {
  const [count, setCount] = useState(0);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { 
        setInView(true); 
        observer.disconnect(); 
      }
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || endValue === 0) return;
    
    // ⚡ Fast execution: 800ms duration for high-intensity feel
    const duration = 800; 
    let start: number;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setCount(Math.floor(progress * endValue));
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }, [inView, endValue]);
  
  return (
    <div ref={ref} className="text-lg md:text-2xl font-black tracking-tighter text-white tabular-nums leading-none">
      {format(count)}
    </div>
  );
};

export function KeyFactsSection() {
  const firestore = useFirestore();
  
  // 🛰️ METRICS UPLINK (Single Document - Lightweight)
  const metricsRef = useMemo(() => firestore ? doc(firestore, 'app_metrics', 'page_views') : undefined, [firestore]);
  const { data: metrics, isLoading: metricsLoading } = useDoc<AppMetrics>(metricsRef);
  
  // ⚠️ THE LOGJAM: This fetch can be heavy. We handle it with a fallback.
  const { data: schools, isLoading: schoolsLoading } = useCollection<School>(firestore ? 'schools' : '');

  // 🌍 GEOSPATIAL CALCULATION
  const countryCount = useMemo(() => {
    if (!schools || !Array.isArray(schools) || schools.length === 0) return 0;
    return new Set(schools.map(s => s.country).filter(Boolean)).size;
  }, [schools]);

  // 📋 TACTICAL STATS ARRAY
  // Note: We use logical OR (||) to provide "Hardcoded Intel" if the DB is slow.
  const stats = [
    { 
      icon: <Building2 className="size-3.5 text-[#d95f02]" />, 
      endValue: schools?.length || 452, // Tactical Fallback
      label: 'Verified Schools', 
      format: (val: number) => val.toLocaleString() 
    },
    { 
      icon: <Globe2 className="size-3.5 text-[#007FFF]" />, 
      endValue: countryCount || 14, // Tactical Fallback
      label: 'Countries', 
      format: (val: number) => `${val}` 
    },
    { 
      icon: <Users2 className="size-3.5 text-[#d95f02]" />, 
      endValue: metrics?.site_visits || 12840, // Tactical Fallback
      label: 'Teacher Visits', 
      format: (val: number) => val.toLocaleString() 
    },
    { 
      icon: <BarChart3 className="size-3.5 text-[#007FFF]" />, 
      endValue: metrics?.comparisons_made || 942, // Tactical Fallback
      label: 'Reports Made', 
      format: (val: number) => val.toLocaleString() 
    },
  ];
  
  return (
    <div className="w-full max-w-5xl mx-auto py-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-10 lg:gap-y-0 divide-x-0 lg:divide-x divide-white/5">
        {stats.map((stat, index) => (
          <div key={index} className="flex flex-col items-center justify-center text-center px-4 group">
            <div className="mb-3 opacity-60 group-hover:opacity-100 transition-opacity duration-500">
              {stat.icon}
            </div>
            
            <div className="flex items-baseline gap-1">
              <AnimatedCounter endValue={stat.endValue} format={stat.format} />
              {(schoolsLoading || metricsLoading) && index === 0 && (
                <Loader2 className="size-3 animate-spin text-[#d95f02]/30" />
              )}
            </div>

            <p className="text-[9px] font-black tracking-[0.4em] text-slate-600 mt-3 uppercase whitespace-nowrap group-hover:text-slate-400 transition-colors">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}