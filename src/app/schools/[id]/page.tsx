"use client";

import * as React from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, db } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { School, LocationCostOfLiving } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  Building,
  DollarSign,
  Users,
  BookOpen,
  HeartPulse,
  Sparkles,
  Home,
  Award,
  Laptop,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { CostOfLivingCalculator } from '@/components/cost-of-living-calculator';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

// Protocol: Inline utility helpers to bypass export ghosts
const getTacticalColor = (score: string) => {
  if (score === 'good') return 'text-green-400';
  if (score === 'bad') return 'text-red-400';
  return 'text-amber-400';
};

const categorizeInsurance = (val: string) => {
  if (!val || val === '—') return 'Unknown';
  if (val.toLowerCase().includes('comp') || val.toLowerCase().includes('full')) return 'Comprehensive';
  return val;
};

const intelIcons = {
  salary: <DollarSign className="w-5 h-5 text-green-400" />,
  housing: <Home className="w-5 h-5 text-[#007FFF]" />,
  savingsPotential: <Sparkles className="w-5 h-5 text-amber-400" />,
  curriculum: <BookOpen className="w-5 h-5 text-purple-400" />,
  ratio: <Users className="w-5 h-5 text-rose-400" />,
  classSize: <Building className="size-5 text-[#007FFF]" />,
  health: <HeartPulse className="w-5 h-5 text-red-400" />,
  approvals: <Award className="w-5 h-5 text-yellow-500" />,
  tech: <Laptop className="w-5 h-5 text-gray-400" />,
};

function SchoolProfileSkeleton() {
  return (
    <div className="container mx-auto px-4 py-12 bg-[#020617] space-y-8">
      <Skeleton className="h-[40vh] w-full rounded-sm bg-white/5" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Skeleton className="h-64 w-full bg-white/5" />
        </div>
      </div>
    </div>
  );
}

export default function SchoolProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  
  // FIXED: Standardize hook usage for Isomorphic Bridge
  const { data: school, isLoading: isSchoolLoading } = useDoc<School>(doc(db, 'schools', id));

  const locationId = school?.locationId || ( (school?.city && school?.country) ? `${school.city.toLowerCase()}-${school.country.toLowerCase()}` : null);
  const { data: locationData } = useDoc<LocationCostOfLiving>(locationId ? doc(db, 'locations_costOfLiving', locationId) : null);

  if (isSchoolLoading) return <SchoolProfileSkeleton />;
  if (!school) notFound();

  // Data Normalization
  const name = school.schoolname || school.name || 'Unknown School';
  const summary = school.summary || school.description || 'Intelligence Dossier Pending...';
  const finance = school.intel?.salary?.value || school.finance || '—';
  const rating = school.intel?.salary?.score || school.rating || 'neutral';
  const housing = school.intel?.housing?.value || school.housingprovision || '—';
  const health = school.intel?.healthInsurance || school.healthcoverage || '—';
  const curriculum = school.intel?.curriculum || school.curriculum || '—';
  const website = school.websiteUrl || school.website;

  const matrixItems = [
    { key: 'salary', label: 'Finance Dossier', value: finance, score: rating },
    { key: 'housing', label: 'Housing Provision', value: housing },
    { key: 'health', label: 'Health Coverage', value: categorizeInsurance(health as string) },
    { key: 'curriculum', label: 'Curriculum', value: curriculum },
    { key: 'ratio', label: 'Ratio', value: school.intel?.studentTeacherRatio || '—' },
    { key: 'classSize', label: 'Class Size', value: school.intel?.classSize || '—' },
  ];

  return (
    <div className="min-h-screen bg-[#020617]">
      <section className="relative h-64 md:h-[50vh] w-full">
        <Image
          src={school.imageUrl || 'https://picsum.photos/seed/school/1920/1080'}
          alt={name}
          fill
          className="object-cover brightness-[0.3]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent"></div>
        <div className="absolute bottom-0 left-0 p-8 container mx-auto">
          <Badge className="bg-primary font-black uppercase tracking-widest text-[10px] mb-4">Tactical Dossier</Badge>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white uppercase italic">{name}</h1>
          <div className="flex items-center text-sm font-black uppercase text-muted-foreground mt-2">
            <MapPin className="w-4 h-4 mr-2 text-primary" />
            <span>{school.city || school.location}, {school.country}</span>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            <Card className="bg-[#1f2937]/50 border-white/5">
                <CardHeader className="border-b border-white/5">
                    <CardTitle className="text-xs font-black uppercase text-primary flex items-center gap-3"><BookOpen className="size-4" /> Executive summary</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <p className="text-muted-foreground leading-relaxed font-bold text-lg italic">"{summary}"</p>
                </CardContent>
            </Card>

            <Card className="bg-[#1f2937]/50 border-white/5">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="text-xs font-black uppercase text-primary flex items-center gap-3"><ShieldCheck className="size-4" /> Tactical matrix</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {matrixItems.map(item => (
                    <li key={item.key} className="flex items-start">
                      <div className="mr-4 mt-1">{(intelIcons as any)[item.key]}</div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">{item.label}</p>
                        <p className={cn('text-base font-black tracking-tighter text-white uppercase', item.score && getTacticalColor(item.score as string))}>
                          {item.value?.toString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-12">
            <CostOfLivingCalculator school={school} overrideLocationData={locationData || undefined} />
          </div>
        </div>
      </div>
    </div>
  );
}