"use client";

import * as React from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
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
import { cn, categorizeInsurance, getTacticalColor } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

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
    <div className="container mx-auto px-4 md:px-6 py-12 bg-[#020617]">
      <div className="space-y-8">
        <Skeleton className="h-[40vh] w-full rounded-sm bg-white/5" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-64 w-full bg-white/5" />
            <Skeleton className="h-96 w-full bg-white/5" />
          </div>
          <Skeleton className="h-96 w-full bg-white/5" />
        </div>
      </div>
    </div>
  );
}

export default function SchoolProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const firestore = useFirestore();
  
  const schoolRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'schools', id) : null),
    [firestore, id]
  );
  const { data: school, isLoading: isSchoolLoading } = useDoc<School>(schoolRef);

  const locationId = school?.locationId || (school?.city && school?.country ? `${school.city.toLowerCase()}-${school.country.toLowerCase()}` : null);
  const locationRef = useMemoFirebase(
    () => (firestore && locationId ? doc(firestore, 'locations_costOfLiving', locationId) : null),
    [firestore, locationId]
  );
  const { data: locationData } = useDoc<LocationCostOfLiving>(locationRef);

  if (isSchoolLoading) return <SchoolProfileSkeleton />;
  if (!school) notFound();

  const name = school.schoolname || school.name || 'Unknown School';
  const summary = school.summary || school.description || '';
  const finance = school.finance || (school.intel && school.intel.salary.value);
  const rating = school.rating || school.numericalrating || (school.intel && school.intel.salary.score);
  const housing = school.housingprovision || (school.intel && school.intel.housing.value);
  const health = school.healthcoverage || (school.intel && school.intel.healthInsurance);
  const curriculum = school.curriculum || (school.intel && school.intel.curriculum);
  const approvals = school.approvals || (school.intel && school.intel.accreditation);
  const ratio = school.staffstudentratio || (school.intel && school.intel.studentTeacherRatio);
  const classSize = school.classsize || (school.intel && school.intel.classSize);
  const tech = school.techecosystem || (school.intel && school.intel.technologyEcosystem);
  const website = school.website || school.websiteUrl;

  const matrixItems = [
    { key: 'salary', label: 'Finance Dossier', value: finance, score: rating },
    { key: 'housing', label: 'Housing Provision', value: housing },
    { key: 'health', label: 'Health Coverage', value: categorizeInsurance(health as string) },
    { key: 'curriculum', label: 'Curriculum', value: curriculum },
    { key: 'approvals', label: 'Approvals', value: approvals },
    { key: 'ratio', label: 'Ratio', value: ratio },
    { key: 'classSize', label: 'Class Size', value: classSize },
    { key: 'tech', label: 'Tech Ecosystem', value: tech },
  ];

  return (
    <div className="min-h-screen bg-[#020617]">
      <section className="relative h-64 md:h-[50vh] w-full">
        <Image
          src={school.imageUrl || 'https://picsum.photos/seed/school/1920/1080'}
          alt={`Hero image for ${name}`}
          fill
          style={{ objectFit: 'cover' }}
          className="brightness-[0.3]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-4 md:p-12 container mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="space-y-4">
              <Badge className="bg-[#f97316] hover:bg-[#f97316] text-white font-black uppercase tracking-widest text-[10px] rounded-sm py-1 border-0 shadow-lg">Tactical Dossier</Badge>
              <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white uppercase leading-none">{name}</h1>
              <div className="flex items-center text-sm font-black uppercase tracking-widest text-muted-foreground">
                <MapPin className="w-4 h-4 mr-2 text-[#f97316]" />
                <span>{school.city || school.location}, {school.country}</span>
              </div>
            </div>
            {website && (
              <Button asChild variant="outline" className="border-white/20 hover:bg-white/5 text-white font-black uppercase tracking-widest h-12 px-8 rounded-sm text-xs">
                <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Visit Website
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            <Card className="glass border-white/5 rounded-sm">
                <CardHeader className="border-b border-white/5">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-[#f97316] flex items-center gap-3"><BookOpen className="size-4" /> Executive summary</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <p className="text-muted-foreground leading-relaxed font-medium text-base md:text-lg">{summary}</p>
                </CardContent>
            </Card>

            <Card className="glass border-white/5 rounded-sm">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-[#f97316] flex items-center gap-3"><ShieldCheck className="size-4" /> Tactical matrix</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  {matrixItems.map(item =>
                    item.value ? (
                      <li key={item.key} className="flex items-start group">
                        <div className="mr-4 mt-1 transition-transform group-hover:scale-110">{(intelIcons as any)[item.key]}</div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{item.label}</p>
                          <p className={cn('text-sm md:text-base font-black tracking-tighter text-white uppercase', item.score && getTacticalColor(item.score as string))}>
                            {item.value.toString()}
                          </p>
                        </div>
                      </li>
                    ) : null
                  )}
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