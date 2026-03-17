"use client";

import { useEffect, useState, useRef } from 'react';
import { Building, Globe, Fingerprint, BarChart3 } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { School } from '@/lib/types';

const AnimatedCounter = ({ endValue, format }: { endValue: number; format: (val: number) => string; }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  useEffect(() => {
    if (inView) {
      const duration = 2000;
      let startTimestamp: number | null = null;
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        setCount(Math.floor(progress * endValue));
        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
            setCount(endValue);
        }
      };
      window.requestAnimationFrame(step);
    }
  }, [inView, endValue]);
  
  return (
    <div ref={ref} className="text-xl md:text-2xl font-black tracking-tighter text-white">
      {format(count)}
    </div>
  );
};


export function KeyFactsSection() {
  const firestore = useFirestore();
  
  const metricsRef = useMemoFirebase(() => {
      if (!firestore) return null;
      return doc(firestore, 'app_metrics', 'page_views');
  }, [firestore]);
  
  const schoolsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'schools') : null),
    [firestore]
  );

  const { data: metrics } = useDoc<{ comparisons_made: number; site_visits: number }>(metricsRef);
  const { data: schools } = useCollection<School>(schoolsQuery);

  const comparisonsMade = metrics?.comparisons_made || 0;
  const siteVisits = metrics?.site_visits || 0;
  const schoolCount = schools?.length || 0;
  const countryCount = schools ? new Set(schools.map(school => school.country)).size : 0;

  const stats = [
    {
      icon: <Building className="size-4 text-[#f97316]" />,
      endValue: schoolCount,
      label: 'Intl schools',
      format: (val: number) => val.toLocaleString(),
    },
    {
      icon: <Globe className="size-4 text-[#f97316]" />,
      endValue: countryCount,
      label: 'Countries',
      format: (val: number) => `${val}`,
    },
    {
      icon: <Fingerprint className="size-4 text-[#f97316]" />,
      endValue: siteVisits,
      label: 'Visits',
      format: (val: number) => val.toLocaleString(),
    },
    {
      icon: <BarChart3 className="size-4 text-[#f97316]" />,
      endValue: comparisonsMade,
      label: 'Comparisons',
      format: (val: number) => val.toLocaleString('en-US'),
    },
  ];
  
  return (
    <div className="w-full max-w-4xl mx-auto p-6 md:p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 text-center">
        {stats.map((stat, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className="mb-1">{stat.icon}</div>
            <AnimatedCounter endValue={stat.endValue} format={stat.format} />
            <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground/60 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
