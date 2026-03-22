 "use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Building, Globe, Fingerprint, BarChart3 } from 'lucide-react';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { School, AppMetrics } from '@/lib/types';

/**
 * 🛰️ TACTICAL UTILITY: AnimatedCounter
 */
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
    if (!inView) return;
    const duration = 1500;
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
    <div ref={ref} className="text-3xl md:text-5xl font-black tracking-tighter text-white tabular-nums drop-shadow-sm">
      {format(count)}
    </div>
  );
};

/**
 * 🛡️ LEOPARDFISH KEY FACTS
 */
export function KeyFactsSection() {
  const firestore = useFirestore();

  // Guard Document Reference
  const metricsRef = useMemo(() => 
    firestore ? doc(firestore, 'app_metrics', 'page_views') : undefined, 
  [firestore]);

  const { data: metrics } = useDoc<AppMetrics>(metricsRef);
  
  // TACTICAL FIX: Use an empty string fallback to satisfy the 'string' requirement
  // and ensure useCollection doesn't see 'undefined'
  const schoolsPath = firestore ? 'schools' : '';
  const { data: schools } = useCollection<School>(schoolsPath);

  const countryCount = useMemo(() => {
    if (!schools || !Array.isArray(schools)) return 0;
    const countries = schools.map(s => s.country).filter(Boolean);
    return new Set(countries).size;
  }, [schools]);

  const stats = [
    {
      icon: <Building className="size-6 text-[#f97316]" />,
      endValue: schools?.length || 0,
      label: 'Intelligence Nodes',
      format: (val: number) => val.toLocaleString(),
    },
    {
      icon: <Globe className="size-6 text-[#007FFF]" />,
      endValue: countryCount,
      label: 'Global Sectors',
      format: (val: number) => `${val}`,
    },
    {
      icon: <Fingerprint className="size-6 text-[#f97316]" />,
      endValue: metrics?.site_visits || 0,
      label: 'Active Intel Recruits',
      format: (val: number) => val.toLocaleString(),
    },
    {
      icon: <BarChart3 className="size-6 text-[#007FFF]" />,
      endValue: metrics?.comparisons_made || 0,
      label: 'Tactical Comparisons',
      format: (val: number) => val.toLocaleString(),
    },
  ];
  
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
        {stats.map((stat, index) => (
          <div key={index} className="flex flex-col items-center lg:items-start group">
            <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-sm group-hover:border-[#f97316]/50 transition-all duration-300">
              {stat.icon}
            </div>
            <AnimatedCounter endValue={stat.endValue} format={stat.format} />
            <p className="text-[11px] font-black tracking-[0.2em] text-slate-500 mt-2 uppercase">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}