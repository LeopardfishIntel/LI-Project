
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

type ComparisonMetric = 'salary' | 'savings' | 'classSize' | 'monthlyCost' | 'yourSavings';
type ComparisonResult = 'best' | 'worst' | 'neutral';

const calculateMonthlyCost = (school: School): number => {
    const costOfLiving = school.costOfLiving || {};
    const intel = school.intel || { housing: { provided: false } };
    
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
    
    const isProvided = intel.housing?.provided || false;
    const apartmentCost = isProvided ? 0 : (costOfLiving.monthlyRent1BR || (costOfLiving as any).apartment || 0);

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

const MetricRow = ({ label, value, result, format, icon, link }: {
    label: string;
    value: any;
    result: ComparisonResult;
    format?: (value: any) => string;
    icon: React.ReactNode;
    link?: { href: string; ariaLabel: string; };
}) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    if (!mounted) {
        return <div className="h-10 w-full animate-pulse bg-white/5 rounded-sm mb-2" />;
    }

    const resultColor = (result: ComparisonResult) => {
        if (result === 'best') return 'text-green-400';
        if (result === 'worst') return 'text-red-400';
        return 'text-white';
    };

    return (
        <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-[10px] font-black uppercase text-[#94a3b8] tracking-widest">{label}</span>
            </div>
            <div className={cn("flex items-center gap-2 text-sm font-black tracking-tighter text-right whitespace-nowrap", resultColor(result))}>
                <span>{format ? format(value) : (value?.toString() ?? '—')}</span>
                 {link && (
                    <Link href={link.href} aria-label={link.ariaLabel} className="transition-transform hover:scale-110">
                        <Info className="w-4 h-4 text-[#007FFF] hover:text-sky-300" />
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
        if (!school) return 0;
        switch (metric) {
            case 'salary':
                return parseInt(school.intel.salary.value.split(' - ')[1]?.replace('k', '000').replace('$', '') || '0') || 0;
            case 'savings':
                const savingsVal = school.intel.savingsPotential.value;
                if (savingsVal === 'V High') return 3;
                if (savingsVal === 'High') return 2;
                if (savingsVal === 'Moderate') return 1;
                return 0;
            case 'classSize':
                return school.intel.classSize || 0;
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
        
        if (values.every(v => v === values[0])) return selectedSchools.map(() => 'neutral');

        const sortedValues = [...values].sort((a, b) => higherIsBetter ? b - a : a - b);
        const bestValue = sortedValues[0];
        const worstValue = sortedValues[sortedValues.length - 1];

        if (bestValue === worstValue) return selectedSchools.map(() => 'neutral');

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

    if (isLoadingSchools || !schools) {
        return (
          <div className="container mx-auto flex justify-center items-center h-screen bg-[#020617]">
            <Loader2 className="h-8 w-8 animate-spin text-[#f97316]" />
          </div>
        );
    }

    return (
        <div className="container mx-auto px-4 md:px-6 py-12 bg-[#020617]">
            <div className="mb-16 text-center space-y-4">
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase leading-none text-center">3. Compare schools</h1>
                <p className="text-[#94a3b8] font-black uppercase text-[10px] tracking-[0.3em] opacity-60 text-center">Selection matrix for multiple offers.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start mb-12">
                {selectedSchools.map((school, index) => (
                     <div key={school.id} className="flex flex-col gap-4 items-center">
                        <div className="w-full max-w-sm">
                             <Select value={school.id} onValueChange={(val) => handleSelectSchool(index, val)}>
                                <SelectTrigger className="bg-[#020617]/50 border-white/10 h-11 rounded-sm text-white font-black uppercase text-[10px] tracking-widest">
                                    <SelectValue placeholder="Select a school" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1f2937]/90 backdrop-blur-md border-white/10">
                                    {schools?.map(s => (
                                        <SelectItem key={s.id} value={s.id} disabled={selectedSchoolIds.includes(s.id) && s.id !== school.id} className="font-bold text-xs uppercase">
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="w-full max-w-sm space-y-2">
                            <Label className="text-[10px] font-black uppercase text-[#94a3b8] tracking-widest">Offered Net Salary (Annual)</Label>
                            <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="e.g., 55000"
                                value={netSalaries[index]}
                                onChange={(e) => handleNetSalaryChange(index, e.target.value)}
                                className="bg-[#020617]/50 border-white/10 rounded-sm h-11 text-right font-black text-white selection:bg-[#f97316]/30"
                            />
                        </div>

                        <Card className="bg-[#1f2937]/70 backdrop-blur-md border-white/10 overflow-hidden group w-full max-w-sm shadow-2xl">
                            <Link href={`/schools/${school.id}`} className="block">
                                <div className="relative aspect-video">
                                    <Image src={school.imageUrl} alt={school.name} fill style={{ objectFit: 'cover' }} data-ai-hint={school.imageHint} className="group-hover:scale-105 transition-transform duration-300 opacity-60" />
                                </div>
                                <CardHeader className="min-h-[8rem] border-b border-white/5">
                                    <CardTitle className="text-xl group-hover:text-[#f97316] transition-colors line-clamp-2 text-white font-black tracking-tighter uppercase">{school.name}</CardTitle>
                                     <div className="flex items-center text-[#94a3b8] text-[10px] font-black uppercase tracking-widest pt-1">
                                        <MapPin className="w-3 h-3 mr-1.5 text-[#f97316]" />
                                        <span>{school.location}, {school.country}</span>
                                    </div>
                                </CardHeader>
                            </Link>
                            <CardContent className="p-4 md:p-6 pt-0 divide-y divide-white/10">
                                <div className="pt-4">
                                     <MetricRow label="Salary Range" value={school.intel.salary.value} result={salaryComp[index]} icon={<DollarSign className="w-4 h-4 text-green-400" />} />
                                     <MetricRow label="Savings Potential" value={school.intel.savingsPotential.value} result={savingsComp[index]} icon={<Sparkles className="w-4 h-4 text-amber-400" />} />
                                     <MetricRow
                                        label="Your Est. Monthly Savings"
                                        value={(parseFloat(netSalaries[index]) / 12) - calculateMonthlyCost(school)}
                                        result={yourSavingsComp[index]}
                                        format={(v) => v > -Infinity ? formatCurrency(v, 'USD') : '—'}
                                        icon={<PiggyBank className="w-4 h-4 text-green-500" />}
                                    />
                                     <MetricRow
                                        label={`Est. Monthly Costs`}
                                        value={calculateMonthlyCost(school)}
                                        result={monthlyCostComp[index]}
                                        format={(v) => formatCurrency(v, 'USD')}
                                        icon={<DollarSign className="w-4 h-4 text-red-400" />}
                                        link={{ href: '/prepare', ariaLabel: 'View preparation briefing' }}
                                    />
                                     <MetricRow label="Housing" value={school.intel.housing.value} result={'neutral'} icon={<Home className="w-4 h-4 text-[#007FFF]" />} />
                                     <MetricRow label="Health Insurance" value={school.intel.healthInsurance} result={'neutral'} icon={<HeartPulse className="w-4 h-4 text-red-400" />} />
                                </div>
                                 <div className="pt-4">
                                     <MetricRow label="Curriculum" value={school.intel.curriculum} result={'neutral'} icon={<BookOpen className="w-4 h-4 text-purple-400" />} />
                                     <MetricRow label="Average Class Size" value={school.intel.classSize} result={classSizeComp[index]} icon={<Building className="w-4 h-4 text-[#007FFF]" />} />
                                     <MetricRow label="Student-Teacher Ratio" value={school.intel.studentTeacherRatio} result={'neutral'} icon={<Users className="w-4 h-4 text-rose-400" />} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>

            <div className="mt-16 flex justify-center w-full">
                 <LeopardfishComparisonInsights schools={selectedSchools} netSalaries={netSalaries} />
            </div>
        </div>
    );
}
