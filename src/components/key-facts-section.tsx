"use client";

import { useEffect, useState, useRef } from 'react';
import { Building, Globe, Users, BarChart3 } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

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
    <div ref={ref} className="text-xl md:text-2xl font-bold tracking-tighter text-primary-foreground">
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

  const { data: metrics } = useDoc<{ comparisons_made: number }>(metricsRef);

  const comparisonsMade = metrics?.comparisons_made || 0;

  const stats = [
    {
      icon: <Building className="w-5 h-5 text-primary mb-1" />,
      endValue: 13000,
      label: 'International Schools',
      format: (val: number) => `${Math.floor(val/1000)}k+`,
    },
    {
      icon: <Globe className="w-5 h-5 text-primary mb-1" />,
      endValue: 195,
      label: 'Countries',
      format: (val: number) => `${Math.floor(val)}`,
    },
    {
      icon: <Users className="w-5 h-5 text-primary mb-1" />,
      endValue: 500000,
      label: 'Teachers Worldwide',
      format: (val: number) => `${Math.floor(val/1000)}k+`,
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-primary mb-1" />,
      endValue: comparisonsMade,
      label: 'Comparisons Made',
      format: (val: number) => val.toLocaleString('en-US'),
    },
  ];
  
  return (
    <div className="w-full py-2 bg-black/30 backdrop-blur-md rounded-lg border border-white/10">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {stats.map((stat, index) => (
            <div key={index} className="flex flex-col items-center">
              {stat.icon}
              <AnimatedCounter endValue={stat.endValue} format={stat.format} />
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
