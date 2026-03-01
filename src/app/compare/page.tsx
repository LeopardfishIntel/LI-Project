"use client";

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { teacherProfile } from '@/lib/mock-data';
import type { School } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';
import { MapPin, DollarSign, Sparkles, Home, HeartPulse, BookOpen, Building, Users, PiggyBank, Info, Loader2 } from 'lucide-react';
import { LeopardfishComparisonInsights } from '@/components/leopardfish-comparison-insights';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, increment, collection } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

    const foodCost = (costOfLiving.food || 0) * adults + (costOfLiving.food || 0) * 0.5 * children;
    const transportCost = (costOfLiving.transport || 0) * adults + (costOfLiving.transport || 0) * 0.3 * children;
    const mobileCost = (costOfLiving.mobile || 0) * adults;
    const diningSocialCost = (costOfLiving.diningSocial || 0) * adults;
    const uncoveredMedicalCost = (costOfLiving.uncoveredMedical || 0) * adults + (costOfLiving.uncoveredMedical || 0) * 0.5 * children;
    
    const rent1BR = costOfLiving.monthlyRent1BR || (costOfLiving as any).apartment || 0;
    const apartmentCost = intel.housing.provided ? 0 : rent1BR;

    return (
      apartmentCost +
      foodCost +
      transportCost +
      (costOfLiving.utilities || 0) +
      (costOfLiving.internet || 0) +
      mobileCost +
      diningSocialCost +
      (costOfLiving.vehicleInsuranceMaint || 0) +
      uncoveredMedicalCost
    );
};

const HealthInsuranceHelp = () => (
    <div className="space-y-3">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Insurance classification</h4>
        <div className="border border-white/10 rounded-sm overflow-hidden bg-background/50">
            <Table>
                <TableHeader className="bg-white/5">
                    <TableRow className="hover:bg-transparent border-b-white/10">
                        <TableHead className="h-8 text-[9px] font-black uppercase text-white px-3">Tier</TableHead>
                        <TableHead className="h-8 text-[9px] font-black uppercase text-white px-3">One word</TableHead>
                        <TableHead className="h-8 text-[9px] font-black uppercase text-white px-3">Best for...</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow className="hover:bg-transparent border-b-white/5">
                        <TableCell className="py-2 text-[11px] font-bold px-3 text-white/90">Basic</TableCell>
                        <TableCell className="py-2 text-[11px] px-3 text-muted-foreground italic">Essential</TableCell>
                        <TableCell className="py-2 text-[10px] px-3 leading-tight text-muted-foreground">The "Just in case" safety net.</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-transparent border-b-white/5">
                        <TableCell className="py-2 text-[11px] font-bold px-3 text-white/90">Comprehensive</TableCell>
                        <TableCell className="py-2 text-[11px] px-3 text-muted-foreground italic">Balanced</TableCell>
                        <TableCell className="py-2 text-[10px] px-3 leading-tight text-muted-foreground">Total peace of mind for daily life.</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-transparent border-0">
                        <TableCell className="py-2 text-[11px] font-bold px-3 text-white/90">Premium</TableCell>
                        <TableCell className="py-2 text-[11px] px-3 text-muted-foreground italic">Elite</TableCell>
                        <TableCell className="py-2 text-[10px] px-3 leading-tight text-muted-foreground">VIP access and proactive wellness.</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    </div>
);

const MetricRow = ({ label, value, result, format, icon, link, helpContent }: {
    label: string;
    value: any;
    result: ComparisonResult;
    format?: (value: any) => string;
    icon: React.ReactNode;
    link?: { href: string; ariaLabel: string; };
    helpContent?: React.ReactNode;
}) => {
    const resultColor = (result: ComparisonResult) => {
        if (result === 'best') return 'text-green-400';
        if (result === 'worst') return 'text-red-400';
        return 'text-primary-foreground';
    };

    const labelContent = helpContent ? (
        <Popover>
            <PopoverTrigger asChild>
                <button className="text-sm text-muted-foreground border-b border-dotted border-muted-foreground/50 cursor-help hover:text-primary transition-colors text-left">
                    {label}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 glass border-primary/20" side="top">
                {helpContent}
            </PopoverContent>
        </Popover>
    ) : (
        <span className="text-sm text-muted-foreground">{label}</span>
    );

    return (
        <div className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-2">
                {icon}
                {labelContent}
            </div>
            <div className={cn("flex items-center gap-2 text-base font-bold text-right whitespace-nowrap", resultColor(result))}>
                <span>{format ? format(value) : (value?.toString() || '—')}</span>
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
    const firestore = useFirestore();
    const schoolsQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'schools') : null),
        [firestore]
    );
    const { data: schools, isLoading: isLoadingSchools } = useCollection<School>(schoolsQuery);
    
    const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
    const [netSalaries, setNetSalaries] = useState<string[]>(['', '', '']);
    
    useEffect(() => {
        if (firestore) {
            const counterRef = doc(firestore, 'app_metrics', 'page_views');
            setDocumentNonBlocking(counterRef, { comparisons_made: increment(1) }, { merge: true });
        }
    }, [firestore]);
    
    useEffect(() => {
        if (schools && schools.length > 0 && selectedSchoolIds.length === 0) {
            const preferredSchools = schools
                .filter(school => teacherProfile.preferredCountries.includes(school.country));
            const otherSchools = schools.filter(school => !teacherProfile.preferredCountries.includes(school.country));
            const initialSchoolIds = [...new Set([...preferredSchools, ...otherSchools].map(s => s.id))].slice(0, 3);
            
            if (initialSchoolIds.length > 0) {
                setSelectedSchoolIds(initialSchoolIds);
            }
        }
    }, [schools, selectedSchoolIds.length]);

    const selectedSchools = useMemo(() => {
        if (!schools || selectedSchoolIds.length === 0) return [];
        return selectedSchoolIds.map(id => schools.find(s => s.id === id)).filter(Boolean) as School[];
    }, [selectedSchoolIds, schools]);

    const handleNetSalaryChange = (index: number, value: string) => {
        const newSalaries = [...netSalaries];
        newSalaries[index] = value;
        setNetSalaries(newSalaries);
    };
    
    const getNumericValue = (school: School, metric: ComparisonMetric, index: number) => {
        switch (metric) {
            case 'salary': {
                const val = school.intel.salary.value || '';
                const numbers = val.match(/\d+/g)?.map(Number);
                if (!numbers) return 0;
                const scale = val.toLowerCase().includes('k') ? 1000 : 1;
                const highValue = Math.max(...numbers);
                return highValue * scale;
            }
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
                if (netSalary <= 0) return -Infinity;
                return (netSalary / 12) - calculateMonthlyCost(school);
            default:
                return 0;
        }
    };
    
    const compareThree = (metric: ComparisonMetric, higherIsBetter: boolean): ComparisonResult[] => {
        if (selectedSchools.length < 2) return selectedSchools.map(() => 'neutral');
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
            <div className="flex flex-col gap-4 items-center h-full">
                <div className="w-full max-w-sm">
                     <Select value={school.id} onValueChange={onSelect}>
                        <SelectTrigger className="bg-background/50 border-white/10 rounded-sm">
                            <SelectValue placeholder="Select a school" />
                        </SelectTrigger>
                        <SelectContent className="glass">
                            {schools?.map(s => (
                                <SelectItem key={s.id} value={s.id} disabled={selectedIds.includes(s.id) && s.id !== school.id}>
                                    {s.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-full max-w-sm space-y-2">
                    <Label htmlFor={`net-salary-${index}`} className="text-sm font-bold text-muted-foreground">Offered net salary (annual)</Label>
                    <Input
                        id={`net-salary-${index}`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="e.g., 55000"
                        value={netSalary}
                        onChange={(e) => onNetSalaryChange(e.target.value)}
                        className="bg-background/50 border-white/10 rounded-sm h-11 text-right font-bold"
                    />
                </div>

                <Card className="bg-card/70 backdrop-blur-sm border-border overflow-hidden group w-full max-w-sm flex flex-col h-full">
                    <Link href={`/schools/${school.id}`} className="block">
                        <div className="relative aspect-video">
                            <Image src={school.imageUrl} alt={school.name} fill objectFit="cover" data-ai-hint={school.imageHint} className="group-hover:scale-105 transition-transform duration-300" />
                        </div>
                        <CardHeader className="min-h-[100px] flex flex-col justify-center">
                            <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-2 leading-tight">{school.name}</CardTitle>
                             <div className="flex items-center text-muted-foreground text-sm pt-1">
                                <MapPin className="w-4 h-4 mr-1.5" />
                                <span>{school.location}, {school.country}</span>
                            </div>
                        </CardHeader>
                    </Link>
                    <CardContent className="p-4 md:p-6 pt-0 flex-grow">
                        <div className="space-y-0">
                             <MetricRow label="Salary range" value={school.intel.salary.value} result={comparisonResults.salary} icon={<DollarSign className="w-4 h-4 text-green-400" />} />
                             <MetricRow label="Savings potential" value={school.intel.savingsPotential.value} result={comparisonResults.savings} icon={<Sparkles className="w-4 h-4 text-amber-400" />} />
                             <MetricRow
                                    label="Your est. monthly savings"
                                    value={yourMonthlySavings !== null ? yourMonthlySavings : null}
                                    result={comparisonResults.yourSavings}
                                    format={(v) => v !== null ? formatCurrency(v, 'USD') : '—'}
                                    icon={<PiggyBank className="w-4 h-4 text-green-500" />}
                                />
                             <MetricRow
                                label={`Est. costs (${teacherProfile.familyStatus})`}
                                value={calculateMonthlyCost(school)}
                                result={comparisonResults.monthlyCost}
                                format={(v) => formatCurrency(v, 'USD')}
                                icon={<DollarSign className="w-4 h-4 text-red-400" />}
                            />
                             <MetricRow label="Housing" value={school.intel.housing.value} result={'neutral'} icon={<Home className="w-4 h-4 text-blue-400" />} />
                             <MetricRow 
                                label="Health insurance" 
                                value={school.intel.healthInsurance} 
                                result={'neutral'} 
                                icon={<HeartPulse className="w-4 h-4 text-red-400" />} 
                                helpContent={<HealthInsuranceHelp />}
                            />
                        </div>
                         <div className="pt-6">
                             <MetricRow label="Curriculum" value={school.intel.curriculum} result={'neutral'} icon={<BookOpen className="w-4 h-4 text-purple-400" />} />
                             <MetricRow label="Average class size" value={school.intel.classSize} result={comparisonResults.classSize} icon={<Building className="w-4 h-4 text-sky-400" />} />
                             <MetricRow label="Student-teacher ratio" value={school.intel.studentTeacherRatio} result={'neutral'} icon={<Users className="w-4 h-4 text-rose-400" />} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    if (isLoadingSchools || !schools) {
        return (
          <div className="container mx-auto flex justify-center items-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        );
    }

    return (
        <div className="container mx-auto px-4 md:px-6 py-12">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-center normal-case">3. Compare schools</h1>
            <p className="text-muted-foreground mb-12 text-center">Select up to three schools for a side-by-side comparison of key data.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-12">
                {selectedSchools.map((school, index) => (
                     <SchoolComparisonColumn 
                        key={school.id} 
                        school={school} 
                        index={index}
                        onSelect={(id) => {
                            const currentlySelectedIds = [...selectedSchoolIds];
                            const alreadySelectedIndex = currentlySelectedIds.indexOf(id);
                            if (alreadySelectedIndex > -1) {
                                currentlySelectedIds[alreadySelectedIndex] = currentlySelectedIds[index];
                            }
                            currentlySelectedIds[index] = id;
                            setSelectedSchoolIds(currentlySelectedIds);
                        }} 
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
