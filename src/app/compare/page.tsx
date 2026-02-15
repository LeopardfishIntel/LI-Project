"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { schools } from '@/lib/mock-data';
import type { School } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';
import { Star, MapPin, DollarSign, Sparkles, Home, HeartPulse, BookOpen, Building, Users } from 'lucide-react';
import { LeopardFishInsights } from '@/components/leopardfish-insights';
import { useFirestore } from '@/firebase';
import { doc, increment } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase';

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

const ComparisonRow = ({ label, values, results, formats, icon }: {
    label: string;
    values: any[];
    results: ComparisonResult[];
    formats?: ((value: any) => string)[];
    icon: React.ReactNode;
}) => {
    const resultColor = (result: ComparisonResult) => {
        if (result === 'best') return 'text-green-400';
        if (result === 'worst') return 'text-red-400';
        return 'text-primary-foreground';
    };

    return (
        <div className="text-center border-b last:border-b-0 py-3">
            <div className="flex items-center justify-center gap-2 mb-2">
                {icon}
                <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
                {values.map((value, index) => (
                    <div key={index} className={cn("text-lg font-semibold", resultColor(results[index]))}>
                        {formats && formats[index] ? formats[index](value) : (value.toString())}
                    </div>
                ))}
            </div>
        </div>
    );
};


export default function ComparePage() {
    const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([
        schools[0].id,
        schools[1].id,
        schools[2].id,
    ]);
    
    const firestore = useFirestore();

    useEffect(() => {
        if (firestore) {
            const counterRef = doc(firestore, 'app_metrics', 'page_views');
            setDocumentNonBlocking(counterRef, { comparisons_made: increment(1) }, { merge: true });
        }
    }, [firestore]);

    const selectedSchools = selectedSchoolIds.map(id => schools.find(s => s.id === id)!);

    const handleSelectSchool = (index: number, newSchoolId: string) => {
        const currentlySelectedIds = [...selectedSchoolIds];
        const alreadySelectedIndex = currentlySelectedIds.indexOf(newSchoolId);

        if (alreadySelectedIndex > -1) {
            const schoolIdToSwap = currentlySelectedIds[index];
            currentlySelectedIds[alreadySelectedIndex] = schoolIdToSwap;
        }
        
        currentlySelectedIds[index] = newSchoolId;
        setSelectedSchoolIds(currentlySelectedIds);
    };
    
    const compareThree = (metric: ComparisonMetric, higherIsBetter: boolean): ComparisonResult[] => {
        const values = selectedSchools.map(school => getNumericValue(school, metric));
        
        if (values.every(v => v === values[0])) return ['neutral', 'neutral', 'neutral'];

        const sortedValues = [...values].sort((a, b) => higherIsBetter ? b - a : a - b);
        const bestValue = sortedValues[0];
        const worstValue = sortedValues[sortedValues.length - 1];

        if (bestValue === worstValue) return ['neutral', 'neutral', 'neutral'];

        return values.map(val => {
            if (val === bestValue) return 'best';
            if (val === worstValue) return 'worst';
            return 'neutral';
        });
    };
    
    const ratingComp = compareThree('rating', true);
    const salaryComp = compareThree('salary', true);
    const savingsComp = compareThree('savings', true);
    const monthlyCostComp = compareThree('monthlyCost', false);
    const classSizeComp = compareThree('classSize', false);

    const SchoolInfo = ({ school, onSelect, selectedIds }: { school: School, onSelect: (id: string) => void, selectedIds: string[] }) => (
        <div className="flex flex-col items-center gap-4">
            <div className="w-full max-w-[280px]">
                 <Select value={school.id} onValueChange={onSelect}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a school" />
                    </SelectTrigger>
                    <SelectContent>
                        {schools.map(s => (
                            <SelectItem key={s.id} value={s.id} disabled={selectedIds.includes(s.id) && s.id !== school.id}>
                                {s.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Link href={`/schools/${school.id}`} className="block w-full max-w-[280px]">
                <Card className="bg-card/70 backdrop-blur-sm border-border overflow-hidden group">
                    <div className="relative aspect-video">
                        <Image src={school.imageUrl} alt={school.name} fill objectFit="cover" data-ai-hint={school.imageHint} className="group-hover:scale-105 transition-transform duration-300" />
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
            <p className="text-muted-foreground mb-12 text-center">Select up to three schools for a side-by-side comparison of key data.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start mb-8 justify-items-center">
                {selectedSchools.map((school, index) => (
                     <SchoolInfo key={school.id} school={school} onSelect={(id) => handleSelectSchool(index, id)} selectedIds={selectedSchoolIds} />
                ))}
            </div>

            <Card className="bg-card/70 backdrop-blur-sm border-border">
                <CardContent className="p-4 md:p-6 divide-y divide-border">
                    <div className="py-2">
                        <ComparisonRow 
                            label="Overall Rating" 
                            values={selectedSchools.map(s => `${s.rating.toFixed(1)}/5`)} 
                            results={ratingComp} 
                            icon={<Star className="w-4 h-4 text-amber-400" />} />
                    </div>

                    <div className="py-2 pt-6">
                        <ComparisonRow label="Salary Range" values={selectedSchools.map(s => s.intel.salary.value)} results={salaryComp} icon={<DollarSign className="w-4 h-4 text-green-400" />} />
                        <ComparisonRow label="Savings Potential" values={selectedSchools.map(s => s.intel.savingsPotential.value)} results={savingsComp} icon={<Sparkles className="w-4 h-4 text-amber-400" />} />
                        <ComparisonRow 
                            label="Est. Monthly Costs (Single)" 
                            values={selectedSchools.map(s => calculateMonthlyCost(s))} 
                            results={monthlyCostComp} 
                            formats={selectedSchools.map(() => (v) => formatCurrency(v, 'USD'))}
                            icon={<DollarSign className="w-4 h-4 text-red-400" />} />
                        <ComparisonRow label="Housing" values={selectedSchools.map(s => s.intel.housing.value)} results={['neutral', 'neutral', 'neutral']} icon={<Home className="w-4 h-4 text-blue-400" />} />
                        <ComparisonRow label="Health Insurance" values={selectedSchools.map(s => s.intel.healthInsurance)} results={['neutral', 'neutral', 'neutral']} icon={<HeartPulse className="w-4 h-4 text-red-400" />} />
                    </div>
                    
                    <div className="py-2 pt-6">
                        <ComparisonRow label="Curriculum" values={selectedSchools.map(s => s.intel.curriculum)} results={['neutral', 'neutral', 'neutral']} icon={<BookOpen className="w-4 h-4 text-purple-400" />} />
                        <ComparisonRow label="Average Class Size" values={selectedSchools.map(s => s.intel.classSize)} results={classSizeComp} icon={<Building className="w-4 h-4 text-sky-400" />} />
                        <ComparisonRow label="Student-Teacher Ratio" values={selectedSchools.map(s => s.intel.studentTeacherRatio)} results={['neutral', 'neutral', 'neutral']} icon={<Users className="w-4 h-4 text-rose-400" />} />
                    </div>
                </CardContent>
            </Card>

            <div className="mt-12">
                <h2 className="text-2xl font-bold tracking-tight text-center mb-8">School Videos</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start justify-items-center">
                    {selectedSchools.map(school => (
                        <div key={school.id} className="w-full max-w-[280px]">
                            <Card className="bg-card/70 backdrop-blur-sm border-border">
                                <CardHeader><CardTitle className="text-xl">{school.name}</CardTitle></CardHeader>
                                <CardContent>
                                    {school.videoUrl ? (
                                        <div className="aspect-video">
                                            <iframe
                                                className="w-full h-full rounded-md"
                                                src={school.videoUrl}
                                                title={`School video for ${school.name}`}
                                                frameBorder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            ></iframe>
                                        </div>
                                    ) : (
                                        <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                                            <p className="text-muted-foreground">Video coming soon</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-12">
                 <h2 className="text-2xl font-bold tracking-tight text-center mb-8">LeopardFish Insights</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {selectedSchools.map(school => (
                         <LeopardFishInsights key={school.id} school={school} />
                    ))}
                </div>
            </div>
        </div>
    );
}
