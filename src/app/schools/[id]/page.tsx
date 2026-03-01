'use client';

import * as React from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { School } from '@/lib/types';
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
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { CostOfLivingCalculator } from '@/components/cost-of-living-calculator';
import { cn } from '@/lib/utils';
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

const scoreColorClasses = {
  good: 'text-green-400',
  neutral: 'text-slate-400',
  bad: 'text-red-400',
};

const HealthInsuranceHelp = () => (
    <div className="space-y-3 p-1">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Insurance classification</h4>
        <div className="border border-white/10 rounded-sm overflow-hidden bg-background/50">
            <Table>
                <TableBody>
                    <TableRow className="hover:bg-transparent border-b-white/5">
                        <TableCell className="py-2 text-[11px] font-bold px-3 text-white/90">Top global</TableCell>
                        <TableCell className="py-2 text-[11px] px-3 text-muted-foreground italic">Elite</TableCell>
                        <TableCell className="py-2 text-[10px] px-3 leading-tight text-muted-foreground">VIP access and proactive wellness.</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-transparent border-b-white/5">
                        <TableCell className="py-2 text-[11px] font-bold px-3 text-white/90">Good</TableCell>
                        <TableCell className="py-2 text-[11px] px-3 text-muted-foreground italic">Standard</TableCell>
                        <TableCell className="py-2 text-[10px] px-3 leading-tight text-muted-foreground">Total peace of mind for daily life.</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-transparent border-0">
                        <TableCell className="py-2 text-[11px] font-bold px-3 text-white/90">Emerging</TableCell>
                        <TableCell className="py-2 text-[11px] px-3 text-muted-foreground italic">Foundational</TableCell>
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
  const { data: school, isLoading } = useDoc<School>(schoolRef);

  if (isLoading) {
    return <SchoolProfileSkeleton />;
  }

  if (!school) {
    notFound();
  }

  const schoolIntel = [
    {
      key: 'salary',
      label: 'Salary',
      value: school.intel.salary.value,
      score: school.intel.salary.score,
    },
    { key: 'housing', label: 'Housing', value: school.intel.housing.value },
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
      value: school.intel.nonContactTime
        ? `${school.intel.nonContactTime}%`
        : undefined,
    },
    {
      key: 'technologyEcosystem',
      label: 'Tech ecosystem',
      value: school.intel.technologyEcosystem,
    },
    {
      key: 'curriculum',
      label: 'Curriculum',
      value: school.intel.curriculum,
    },
    {
      key: 'accreditation',
      label: 'Accreditation',
      value: school.intel.accreditation,
    },
    {
      key: 'studentTeacherRatio',
      label: 'Student-teacher ratio',
      value: school.intel.studentTeacherRatio,
    },
    {
      key: 'classSize',
      label: 'Average class size',
      value: school.intel.classSize,
    },
    {
      key: 'healthInsurance',
      label: 'Health insurance',
      value: school.intel.healthInsurance,
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
      <section className="relative h-64 md:h-96 w-full">
        <Image
          src={school.imageUrl}
          alt={`Hero image for ${school.name}`}
          fill
          style={{ objectFit: 'cover' }}
          className="brightness-50"
          data-ai-hint={school.imageHint}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-4 md:p-8 container mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-primary-foreground">
                {school.name}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                <div className="flex items-center text-lg">
                  <MapPin className="w-5 h-5 mr-2" />
                  <span>
                    {school.location}, {school.country}
                  </span>
                </div>
              </div>
            </div>
            {school.websiteUrl && (
              <div className="mt-4 md:mt-0">
                <Button asChild variant="outline">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {school.description && (
                <Card className="bg-card/70 backdrop-blur-sm border-border shadow-lg">
                <CardHeader>
                    <CardTitle>About {school.name}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{school.description}</p>
                </CardContent>
                </Card>
            )}
            
            <Card className="bg-card/70 backdrop-blur-sm border-border shadow-lg">
              <CardHeader>
                <CardTitle>Core intel</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  {schoolIntel.map(item =>
                    item.value ? (
                      <li key={item.key} className="flex items-start">
                        <div className="mr-3 mt-1">
                          {intelIcons[item.key as IntelKey]}
                        </div>
                        <div>
                          {item.key === 'healthInsurance' ? (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className="font-semibold text-muted-foreground border-b border-dotted border-muted-foreground/50 cursor-help hover:text-primary transition-colors text-left">
                                        {item.label}
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 glass border-primary/20 shadow-2xl" side="top">
                                    <HealthInsuranceHelp />
                                </PopoverContent>
                            </Popover>
                          ) : (
                            <p className="font-semibold text-muted-foreground">
                                {item.label}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <p
                              className={cn(
                                'text-lg font-bold',
                                item.score && scoreColorClasses[item.score]
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

          <div className="space-y-8">
            <CostOfLivingCalculator school={school} />
          </div>
        </div>
      </div>
    </div>
  );
}
