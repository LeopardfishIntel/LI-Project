"use client";

import { useEffect, useState, useRef } from 'react';
import { Building, Globe, Users, BarChart3 } from 'lucide-react';
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
    <div ref={ref} className="text-lg md:text-xl font-bold tracking-tighter text-primary-foreground">
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

  const { data: metrics } = useDoc<{ comparisons_made: number }>(metricsRef);
  const { data: schools } = useCollection<School>(schoolsQuery);

  const comparisonsMade = metrics?.comparisons_made || 0;
  const schoolCount = schools?.length || 0;
  const countryCount = schools ? new Set(schools.map(school => school.country)).size : 0;
  const teacherCount = 101;

  const stats = [
    {
      icon: <Building className="size-5 text-primary" />,
      endValue: schoolCount,
      label: 'Intl Schools',
      format: (val: number) => val.toLocaleString(),
    },
    {
      icon: <Globe className="size-5 text-primary" />,
      endValue: countryCount,
      label: 'Countries',
      format: (val: number) => `${val}`,
    },
    {
      icon: <Users className="size-5 text-primary" />,
      endValue: teacherCount,
      label: 'Registered',
      format: (val: number) => val.toLocaleString(),
    },
    {
      icon: <BarChart3 className="size-5 text-primary" />,
      endValue: comparisonsMade,
      label: 'Comparisons',
      format: (val: number) => val.toLocaleString('en-US'),
    },
  ];
  
  return (
    <div className="w-full py-8 glass rounded-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {stats.map((stat, index) => (
          <div key={index} className="flex flex-col items-center">
            {stat.icon}
            <AnimatedCounter endValue={stat.endValue} format={stat.format} />
            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
