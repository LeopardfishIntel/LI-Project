"use client";

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { schools, teacherProfile } from '@/lib/mock-data';
import type { School } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';
import { Star, MapPin, DollarSign, Sparkles, Home, HeartPulse, BookOpen, Building, Users, PiggyBank, Info } from 'lucide-react';
import { LeopardfishComparisonInsights } from '@/components/leopardfish-comparison-insights';
import { useFirestore } from '@/firebase';
import { doc, increment } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase';

type ComparisonMetric = 'salary' | 'savings' | 'classSize' | 'monthlyCost' | 'yourSavings';
type ComparisonResult = 'best' | 'worst' | 'neutral';

const calculateMonthlyCost = (school: School): number => {
    const { costOfLiving, intel } = school;
    
    let adults = 1;
    let children = 0;

    switch (teacherProfile.familyStatus) {
        case 'Couple':
            adults = 2;
            children = 0;
            break;
        case 'Family (2+1)':
            adults = 2;
            children = 1;
            break;
        case 'Family (2+2)':
            adults = 2;
            children = 2;
            break;
        case 'Single':
        default:
            adults = 1;
            children = 0;
            break;
    }

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

const MetricRow = ({ label, value, result, format, icon, link }: {
    label: string;
    value: any;
    result: ComparisonResult;
    format?: (value: any) => string;
    icon: React.ReactNode;
    link?: { href: string; ariaLabel: string; };
}) => {
    const resultColor = (result: ComparisonResult) => {
        if (result === 'best') return 'text-green-400';
        if (result === 'worst') return 'text-red-400';
        return 'text-primary-foreground';
    };

    return (
        <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <div className={cn("flex items-center gap-2 text-sm font-semibold text-right whitespace-nowrap", resultColor(result))}>
                <span>{format ? format(value) : (value.toString())}</span>
                 {link && (
                    <Link href={link.href} aria-label={link.ariaLabel}>
                        <Info className="w-4 h-4 text-sky-400 hover:text-sky-300" />
                    </Link>
                )}
            </div>
        </div>
    );
};


export default function ComparePage() {
    const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>(() => {
        // Prioritize schools from preferred countries
        const preferredSchools = schools
            .filter(school => teacherProfile.preferredCountries.includes(school.country));

        // Get other schools to fill up the slots
        const otherSchools = schools.filter(school => !teacherProfile.preferredCountries.includes(school.country));

        // Combine and ensure no duplicates, then take the top 3
        const initialSchoolIds = [...new Set([...preferredSchools, ...otherSchools].map(s => s.id))].slice(0, 3);
        
        // Fallback if we don't have 3 schools for some reason
        if (initialSchoolIds.length < 3) {
            return schools.slice(0, 3).map(s => s.id);
        }

        return initialSchoolIds;
    });
    const [netSalaries, setNetSalaries] = useState<string[]>(['', '', '']);
    
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

    const handleNetSalaryChange = (index: number, value: string) => {
        const newSalaries = [...netSalaries];
        newSalaries[index] = value;
        setNetSalaries(newSalaries);
    };
    
    const getNumericValue = (school: School, metric: ComparisonMetric, index: number) => {
        switch (metric) {
            case 'salary':
                return parseInt(school.intel.salary.value.split(' - ')[1].replace('k', '000').replace('$', '')) || 0;
            case 'savings':
                if (school.intel.savingsPotential.value === 'V High') return 3;
                if (school.intel.savingsPotential.value === 'High') return 2;
                if (school.intel.savingsPotential.value === 'Moderate') return 1;
                return 0;
            case 'classSize':
                return school.intel.classSize;
            case 'monthlyCost':
                return calculateMonthlyCost(school);
            case 'yourSavings':
                const netSalary = parseFloat(netSalaries[index]) || 0;
                if (netSalary <= 0) return -Infinity; // Treat no/zero salary as the worst for comparison
                return (netSalary / 12) - calculateMonthlyCost(school);
            default:
                return 0;
        }
    };
    
    const compareThree = (metric: ComparisonMetric, higherIsBetter: boolean): ComparisonResult[] => {
        const values = selectedSchools.map((school, i) => getNumericValue(school, metric, i));
        
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
    
    const salaryComp = compareThree('salary', true);
    const savingsComp = compareThree('savings', true);
    const monthlyCostComp = compareThree('monthlyCost', false);
    const classSizeComp = compareThree('classSize', false);
    const yourSavingsComp = compareThree('yourSavings', true);

    const SchoolComparisonColumn = ({ school, index, onSelect, selectedIds, netSalary, onNetSalaryChange }: {
        school: School;
        index: number;
        onSelect: (id: string) => void;
        selectedIds: string[];
        netSalary: string;
        onNetSalaryChange: (value: string) => void;
    }) => {
        const comparisonResults = {
            salary: salaryComp[index],
            savings: savingsComp[index],
            monthlyCost: monthlyCostComp[index],
            classSize: classSizeComp[index],
            yourSavings: yourSavingsComp[index],
        };

        const yourMonthlySavings = useMemo(() => {
            const parsedSalary = parseFloat(netSalary) || 0;
            if (parsedSalary <= 0) return null;
            return (parsedSalary / 12) - calculateMonthlyCost(school);
        }, [netSalary, school]);

        return (
            <div className="flex flex-col gap-4 items-center">
                <div className="w-full max-w-sm">
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

                <div className="w-full max-w-sm space-y-2">
                    <Label htmlFor={`net-salary-${index}`}>Offered Net Salary (Annual)</Label>
                    <Input
                        id={`net-salary-${index}`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="e.g., 55000"
                        value={netSalary}
                        onChange={(e) => onNetSalaryChange(e.target.value)}
                    />
                </div>

                <Card className="bg-card/70 backdrop-blur-sm border-border overflow-hidden group w-full max-w-sm">
                    <Link href={`/schools/${school.id}`} className="block">
                        <div className="relative aspect-video">
                            <Image src={school.imageUrl} alt={school.name} fill objectFit="cover" data-ai-hint={school.imageHint} className="group-hover:scale-105 transition-transform duration-300" />
                        </div>
                        <CardHeader className="min-h-[8rem]">
                            <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-2">{school.name}</CardTitle>
                             <div className="flex items-center text-muted-foreground text-sm pt-1">
                                <MapPin className="w-4 h-4 mr-1.5" />
                                <span>{school.location}, {school.country}</span>
                            </div>
                        </CardHeader>
                    </Link>
                    <CardContent className="p-4 md:p-6 pt-0 divide-y divide-border/50">
                        <div className="pt-4">
                             <MetricRow label="Salary Range" value={school.intel.salary.value} result={comparisonResults.salary} icon={<DollarSign className="w-4 h-4 text-green-400" />} />
                             <MetricRow label="Savings Potential" value={school.intel.savingsPotential.value} result={comparisonResults.savings} icon={<Sparkles className="w-4 h-4 text-amber-400" />} />
                             {yourMonthlySavings !== null && (
                                <MetricRow
                                    label="Your Est. Monthly Savings"
                                    value={yourMonthlySavings}
                                    result={comparisonResults.yourSavings}
                                    format={(v) => formatCurrency(v, 'USD')}
                                    icon={<PiggyBank className="w-4 h-4 text-green-500" />}
                                />
                             )}
                             <MetricRow
                                label={`Est. Monthly Costs (${teacherProfile.familyStatus})`}
                                value={calculateMonthlyCost(school)}
                                result={comparisonResults.monthlyCost}
                                format={(v) => formatCurrency(v, 'USD')}
                                icon={<DollarSign className="w-4 h-4 text-red-400" />}
                            />
                             <MetricRow label="Housing" value={school.intel.housing.value} result={'neutral'} icon={<Home className="w-4 h-4 text-blue-400" />} />
                             <MetricRow 
                                label="Health Insurance" 
                                value={school.intel.healthInsurance} 
                                result={'neutral'} 
                                icon={<HeartPulse className="w-4 h-4 text-red-400" />} 
                            />
                        </div>
                         <div className="pt-4">
                             <MetricRow label="Curriculum" value={school.intel.curriculum} result={'neutral'} icon={<BookOpen className="w-4 h-4 text-purple-400" />} />
                             <MetricRow label="Average Class Size" value={school.intel.classSize} result={comparisonResults.classSize} icon={<Building className="w-4 h-4 text-sky-400" />} />
                             <MetricRow label="Student-Teacher Ratio" value={school.intel.studentTeacherRatio} result={'neutral'} icon={<Users className="w-4 h-4 text-rose-400" />} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    return (
        <div className="container mx-auto px-4 md:px-6 py-12">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-center">Compare Schools</h1>
            <p className="text-muted-foreground mb-12 text-center">Select up to three schools for a side-by-side comparison of key data.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start mb-12">
                {selectedSchools.map((school, index) => (
                     <SchoolComparisonColumn 
                        key={school.id} 
                        school={school} 
                        index={index}
                        onSelect={(id) => handleSelectSchool(index, id)} 
                        selectedIds={selectedSchoolIds}
                        netSalary={netSalaries[index]}
                        onNetSalaryChange={(value) => handleNetSalaryChange(index, value)}
                    />
                ))}
            </div>

            <div className="mt-16 flex justify-center">
                 <LeopardfishComparisonInsights schools={selectedSchools} />
            </div>
        </div>
    );
}
