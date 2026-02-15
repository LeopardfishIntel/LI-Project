"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { schools } from '@/lib/mock-data';
import type { School } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';
import { Star, MapPin, DollarSign, Sparkles, Home, HeartPulse, BookOpen, Building, Users } from 'lucide-react';
import { LeopardFishInsights } from '@/components/leopardfish-insights';

type ComparisonMetric = 'salary' | 'savings' | 'rating' | 'classSize' | 'monthlyCost';
type ComparisonResult = 'best' | 'worst' | 'neutral';

const calculateMonthlyCost = (school: School): number => {
    const { costOfLiving, intel } = school;
    // Calculation for a single adult
    const adults = 1;
    const children = 0;

    const foodCost = costOfLiving.food * adults + costOfLiving.food * 0.5 * children;
    const transportCost = costOfLiving.transport * adults + costOfLiving.transport * 0.3 * children;
    const mobileCost = costOfLiving.mobile * adults;
    const diningSocialCost = costOfLiving.diningSocial * adults;
    const uncoveredMedicalCost = costOfLiving.uncoveredMedical * adults + costOfLiving.uncoveredMedical * 0.5 * children;
    const apartmentCost = intel.housing.provided ? 0 : costOfLiving.apartment;

    return (
      apartmentCost +
      foodCost +
      transportCost +
      costOfLiving.utilities +
      costOfLiving.internet +
      mobileCost +
      diningSocialCost +
      costOfLiving.vehicleInsuranceMaint +
      uncoveredMedicalCost
    );
};

const getNumericValue = (school: School, metric: ComparisonMetric) => {
    switch (metric) {
        case 'salary':
            return parseInt(school.intel.salary.value.split(' - ')[1].replace('k', '000').replace('$', '')) || 0;
        case 'savings':
            if (school.intel.savingsPotential.value === 'Very High') return 3;
            if (school.intel.savingsPotential.value === 'High') return 2;
            if (school.intel.savingsPotential.value === 'Moderate') return 1;
            return 0;
        case 'rating':
            return school.rating;
        case 'classSize':
            return school.intel.classSize;
        case 'monthlyCost':
            return calculateMonthlyCost(school);
        default:
            return 0;
    }
};

const ComparisonRow = ({ label, value1, value2, result1, result2, format1, format2, icon }: {
    label: string;
    value1: any;
    value2: any;
    result1: ComparisonResult;
    result2: ComparisonResult;
    format1?: (value: any) => string;
    format2?: (value: any) => string;
    icon: React.ReactNode;
}) => {
    const resultColor = (result: ComparisonResult) => {
        if (result === 'best') return 'text-green-400';
        if (result === 'worst') return 'text-red-400';
        return 'text-primary-foreground';
    };

    return (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center text-center border-b last:border-b-0 py-3 relative">
            <div className={cn("text-lg font-semibold", resultColor(result1))}>{format1 ? format1(value1) : value1}</div>
            
            <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full z-10 border">
                {icon}
                <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
            </div>

            <div className={cn("text-lg font-semibold", resultColor(result2))}>{format2 ? format2(value2) : value2}</div>
        </div>
    );
};


export default function ComparePage() {
    const [school1Id, setSchool1Id] = useState<string>(schools[0].id);
    const [school2Id, setSchool2Id] = useState<string>(schools[1].id);

    const school1 = schools.find(s => s.id === school1Id)!;
    const school2 = schools.find(s => s.id === school2Id)!;

    const handleSelectSchool1 = (schoolId: string) => {
        if (schoolId === school2Id) setSchool2Id(school1Id);
        setSchool1Id(schoolId);
    };

    const handleSelectSchool2 = (schoolId: string) => {
        if (schoolId === school1Id) setSchool1Id(school2Id);
        setSchool2Id(schoolId);
    };
    
    const compare = (metric: ComparisonMetric, higherIsBetter: boolean): { res1: ComparisonResult, res2: ComparisonResult } => {
        const val1 = getNumericValue(school1, metric);
        const val2 = getNumericValue(school2, metric);

        if (val1 === val2) return { res1: 'neutral', res2: 'neutral' };

        let val1isBest;
        if (higherIsBetter) {
            val1isBest = val1 > val2;
        } else {
            if (val1 === 0) val1isBest = true;
            else if (val2 === 0) val1isBest = false;
            else val1isBest = val1 < val2;
        }
        
        return val1isBest ? { res1: 'best', res2: 'worst' } : { res1: 'worst', res2: 'best' };
    };
    
    const ratingComp = compare('rating', true);
    const salaryComp = compare('salary', true);
    const savingsComp = compare('savings', true);
    const monthlyCostComp = compare('monthlyCost', false);
    const classSizeComp = compare('classSize', false);

    const SchoolInfo = ({ school, onSelect, otherSchoolId }: { school: School, onSelect: (id: string) => void, otherSchoolId: string }) => (
        <div className="flex flex-col items-center gap-4">
            <div className="w-full max-w-xs">
                 <Select value={school.id} onValueChange={onSelect}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a school" />
                    </SelectTrigger>
                    <SelectContent>
                        {schools.map(s => (
                            <SelectItem key={s.id} value={s.id} disabled={s.id === otherSchoolId}>
                                {s.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Link href={`/schools/${school.id}`} className="block w-full max-w-xs">
                <Card className="bg-card/70 backdrop-blur-sm border-border overflow-hidden group">
                    <div className="relative aspect-video">
                        <Image src={school.imageUrl} alt={school.name} layout="fill" objectFit="cover" data-ai-hint={school.imageHint} className="group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <CardHeader>
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">{school.name}</CardTitle>
                         <div className="flex items-center text-muted-foreground text-sm pt-1">
                            <MapPin className="w-4 h-4 mr-1.5" />
                            <span>{school.location}, {school.country}</span>
                        </div>
                    </CardHeader>
                </Card>
            </Link>
        </div>
    );

    return (
        <div className="container mx-auto px-4 md:px-6 py-12">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-center">Compare Schools</h1>
            <p className="text-muted-foreground mb-12 text-center">Select two schools for a side-by-side comparison of key data.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-8">
                <SchoolInfo school={school1} onSelect={handleSelectSchool1} otherSchoolId={school2Id} />
                <SchoolInfo school={school2} onSelect={handleSelectSchool2} otherSchoolId={school1Id} />
            </div>

            <Card className="bg-card/70 backdrop-blur-sm border-border">
                <CardContent className="p-4 md:p-6 divide-y divide-border">
                    <div className="py-2">
                        <h3 className="font-semibold text-lg text-center mb-4">Ratings & Reviews</h3>
                        <ComparisonRow label="Overall Rating" value1={`${school1.rating.toFixed(1)}/5`} value2={`${school2.rating.toFixed(1)}/5`} result1={ratingComp.res1} result2={ratingComp.res2} icon={<Star className="w-4 h-4 text-amber-400" />} />
                    </div>

                    <div className="py-2 pt-6">
                        <ComparisonRow label="Salary Range" value1={school1.intel.salary.value} value2={school2.intel.salary.value} result1={salaryComp.res1} result2={salaryComp.res2} icon={<DollarSign className="w-4 h-4 text-green-400" />} />
                        <ComparisonRow label="Savings Potential" value1={school1.intel.savingsPotential.value} value2={school2.intel.savingsPotential.value} result1={savingsComp.res1} result2={savingsComp.res2} icon={<Sparkles className="w-4 h-4 text-amber-400" />} />
                        <ComparisonRow label="Est. Monthly Costs (Single)" value1={calculateMonthlyCost(school1)} value2={calculateMonthlyCost(school2)} result1={monthlyCostComp.res1} result2={monthlyCostComp.res2} format1={(v) => formatCurrency(v, 'USD')} format2={(v) => formatCurrency(v, 'USD')} icon={<DollarSign className="w-4 h-4 text-red-400" />} />
                        <ComparisonRow label="Housing" value1={school1.intel.housing.value} value2={school2.intel.housing.value} result1='neutral' result2='neutral' icon={<Home className="w-4 h-4 text-blue-400" />} />
                        <ComparisonRow label="Health Insurance" value1={school1.intel.healthInsurance} value2={school2.intel.healthInsurance} result1='neutral' result2='neutral' icon={<HeartPulse className="w-4 h-4 text-red-400" />} />
                    </div>
                    
                    <div className="py-2 pt-6">
                        <ComparisonRow label="Curriculum" value1={school1.intel.curriculum} value2={school2.intel.curriculum} result1='neutral' result2='neutral' icon={<BookOpen className="w-4 h-4 text-purple-400" />} />
                        <ComparisonRow label="Average Class Size" value1={school1.intel.classSize} value2={school2.intel.classSize} result1={classSizeComp.res1} result2={classSizeComp.res2} icon={<Building className="w-4 h-4 text-sky-400" />} />
                        <ComparisonRow label="Student-Teacher Ratio" value1={school1.intel.studentTeacherRatio} value2={school2.intel.studentTeacherRatio} result1='neutral' result2='neutral' icon={<Users className="w-4 h-4 text-rose-400" />} />
                    </div>
                </CardContent>
            </Card>

            <div className="mt-12">
                <h2 className="text-2xl font-bold tracking-tight text-center mb-8">School Videos</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <Card className="bg-card/70 backdrop-blur-sm border-border">
                        <CardHeader><CardTitle className="text-xl">{school1.name}</CardTitle></CardHeader>
                        <CardContent>
                            <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                                <p className="text-muted-foreground">Video coming soon</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card/70 backdrop-blur-sm border-border">
                        <CardHeader><CardTitle className="text-xl">{school2.name}</CardTitle></CardHeader>
                        <CardContent>
                            <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                                <p className="text-muted-foreground">Video coming soon</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="mt-12">
                 <h2 className="text-2xl font-bold tracking-tight text-center mb-8">LeopardFish Insights</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <LeopardFishInsights school={school1} />
                    <LeopardFishInsights school={school2} />
                </div>
            </div>
        </div>
    );
}
