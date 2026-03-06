
'use client';

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
  Briefcase,
  UserCheck,
  Ban,
  Gift,
  Clock,
  Laptop,
  ExternalLink,
  ShieldCheck,
  Info
} from 'lucide-react';
import { CostOfLivingCalculator } from '@/components/cost-of-living-calculator';
import { cn, categorizeInsurance, getTacticalColor } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

const intelIcons = {
  salary: <DollarSign className="w-5 h-5 text-green-400" />,
  housing: <Home className="w-5 h-5 text-blue-400" />,
  savingsPotential: <Sparkles className="w-5 h-5 text-amber-400" />,
  curriculum: <BookOpen className="w-5 h-5 text-purple-400" />,
  studentTeacherRatio: <Users className="w-5 h-5 text-rose-400" />,
  classSize: <Building className="w-5 h-5 text-sky-400" />,
  healthInsurance: <HeartPulse className="w-5 h-5 text-red-400" />,
  accreditation: <Award className="w-5 h-5 text-yellow-500" />,
  jobsPortal: <Briefcase className="w-5 h-5 text-primary" />,
  minQualifications: <UserCheck className="w-5 h-5 text-green-400" />,
  visaRestrictions: <Ban className="w-5 h-5 text-red-400" />,
  benefitsSummary: <Gift className="w-5 h-5 text-pink-400" />,
  nonContactTime: <Clock className="w-5 h-5 text-indigo-400" />,
  technologyEcosystem: <Laptop className="w-5 h-5 text-gray-400" />,
};

type IntelKey = keyof typeof intelIcons;

const HealthInsuranceHelp = () => (
    <div className="space-y-3 p-1">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Insurance classification</h4>
        <div className="border border-white/10 rounded-sm overflow-hidden bg-background/50">
            <Table>
                <TableBody>
                    <TableRow className="hover:bg-transparent border-b-white/5">
                        <TableCell className="py-2 text-[11px] font-bold px-3 text-white/90">Elite</TableCell>
                        <TableCell className="py-2 text-[10px] px-3 leading-tight text-muted-foreground">VIP access and proactive wellness.</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-transparent border-b-white/5">
                        <TableCell className="py-2 text-[11px] font-bold px-3 text-white/90">Comp</TableCell>
                        <TableCell className="py-2 text-[10px] px-3 leading-tight text-muted-foreground">Total peace of mind for daily life.</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-transparent border-0">
                        <TableCell className="py-2 text-[11px] font-bold px-3 text-white/90">State</TableCell>
                        <TableCell className="py-2 text-[10px] px-3 leading-tight text-muted-foreground">The "Just in case" safety net.</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
        <p className="text-[10px] text-muted-foreground leading-tight italic px-1">
            Always check with your school for full details of the health provision before signing the contract.
        </p>
    </div>
);

function SchoolProfileSkeleton() {
  return (
    <div>
      <section className="relative h-64 md:h-96 w-full">
        <Skeleton className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-4 md:p-8 container mx-auto space-y-2">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      </section>
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-40" />
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <Skeleton className="w-6 h-6 rounded" />
                    <div className="space-y-1">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
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

  const locationRef = useMemoFirebase(
    () => (firestore && school?.locationId ? doc(firestore, 'locations_costOfLiving', school.locationId) : null),
    [firestore, school?.locationId]
  );
  const { data: locationData } = useDoc<LocationCostOfLiving>(locationRef);

  if (isSchoolLoading) {
    return <SchoolProfileSkeleton />;
  }

  if (!school) {
    notFound();
  }

  const schoolIntel = [
    {
      key: 'salary',
      label: 'Salary profile',
      value: school.finance || school.intel.salary.value,
      score: school.numericalRating || school.intel.salary.score,
    },
    { 
      key: 'housing', 
      label: 'Housing provision', 
      value: school.housingProvision || school.intel.housing.value 
    },
    {
      key: 'savingsPotential',
      label: 'Savings potential',
      value: school.intel.savingsPotential.value,
      score: school.intel.savingsPotential.score,
    },
    {
      key: 'benefitsSummary',
      label: 'Benefits summary',
      value: school.intel.benefitsSummary,
    },
    {
      key: 'nonContactTime',
      label: 'Non-contact time',
      value: school.ncTime ? `${school.ncTime}%` : school.intel.nonContactTime ? `${school.intel.nonContactTime}%` : undefined,
    },
    {
      key: 'technologyEcosystem',
      label: 'Tech ecosystem',
      value: school.techEcosystem || school.intel.technologyEcosystem,
    },
    {
      key: 'curriculum',
      label: 'Curriculum',
      value: school.curriculum || school.intel.curriculum,
    },
    {
      key: 'accreditation',
      label: 'Accreditation',
      value: school.approvals || school.intel.accreditation,
    },
    {
      key: 'studentTeacherRatio',
      label: 'Student-teacher ratio',
      value: school.ratio || school.intel.studentTeacherRatio,
    },
    {
      key: 'classSize',
      label: 'Average class size',
      value: school.classSize || school.intel.classSize,
    },
    {
      key: 'healthInsurance',
      label: 'Health insurance',
      value: categorizeInsurance(school.healthCoverage || school.intel.healthInsurance),
    },
    { key: 'jobsPortal', label: 'Jobs portal', value: school.intel.jobsPortal },
    {
      key: 'minQualifications',
      label: 'Min. qualifications',
      value: school.intel.minQualifications,
    },
    {
      key: 'visaRestrictions',
      label: 'Visa restrictions',
      value: school.intel.visaRestrictions,
    },
  ];

  return (
    <div className="min-h-screen">
      <section className="relative h-64 md:h-[50vh] w-full">
        <Image
          src={school.imageUrl}
          alt={`Hero image for ${school.name}`}
          fill
          style={{ objectFit: 'cover' }}
          className="brightness-50"
          data-ai-hint={school.imageHint}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-4 md:p-12 container mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary hover:bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-sm py-1">Verified Dossier</Badge>
                {school.score && (
                    <Badge variant="outline" className="border-primary/50 text-primary font-black uppercase tracking-widest text-[10px] rounded-sm py-1 bg-primary/5">Score: {school.score}</Badge>
                )}
              </div>
              <h1 className="text-3xl md:text-6xl font-black tracking-tighter text-white uppercase leading-none">
                {school.name}
              </h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center text-sm font-bold uppercase tracking-widest">
                  <MapPin className="w-4 h-4 mr-2 text-primary" />
                  <span>
                    {school.city || school.location}, {school.country}
                  </span>
                </div>
              </div>
            </div>
            {school.websiteUrl && (
              <div className="mt-4 md:mt-0">
                <Button asChild variant="outline" className="border-white/20 hover:bg-white/5 text-white font-bold h-12 px-8 rounded-sm">
                  <a href={school.websiteUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> Visit Website
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            
            {/* Academic Briefing */}
            <Card className="glass border-white/5 rounded-sm">
                <CardHeader className="border-b border-white/5">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <BookOpen className="size-4" /> Academic Briefing
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <p className="text-muted-foreground leading-relaxed font-medium">{(school.summary || school.description)}</p>
                    {school.academic && (
                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-sm">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Curriculum Strategy</h4>
                            <p className="text-sm text-white/90 font-medium leading-relaxed">{school.academic}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="glass border-white/5 rounded-sm shadow-xl">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <ShieldCheck className="size-4" /> Operational Intel
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  {schoolIntel.map(item =>
                    item.value ? (
                      <li key={item.key} className="flex items-start group">
                        <div className="mr-4 mt-1 transition-transform group-hover:scale-110">
                          {intelIcons[item.key as IntelKey]}
                        </div>
                        <div className="space-y-1">
                          {item.key === 'healthInsurance' ? (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 border-b border-dotted border-muted-foreground/30 cursor-help hover:text-primary transition-colors text-left">
                                        {item.label}
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 glass border-primary/20 shadow-2xl" side="top">
                                    <HealthInsuranceHelp />
                                </PopoverContent>
                            </Popover>
                          ) : (
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                                {item.label}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <p
                              className={cn(
                                'text-sm md:text-base font-bold text-white',
                                item.score && getTacticalColor(item.score as string)
                              )}
                            >
                              {item.value.toString()}
                            </p>
                          </div>
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
            
            {school.confidence && (
                <Card className="glass border-accent/20 bg-accent/5 rounded-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-2">
                            <Info className="size-3" /> Data confidence
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-3xl font-black text-white">{school.confidence}%</span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Signal strength</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${school.confidence}%` }} />
                        </div>
                    </CardContent>
                </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
