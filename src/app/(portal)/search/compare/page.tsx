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
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, db } from '@/firebase';
import { doc, increment, collection, Query } from 'firebase/firestore';

type ComparisonMetric = 'salary' | 'savings' | 'classSize' | 'monthlyCost' | 'yourSavings';
type ComparisonResult = 'best' | 'worst' | 'neutral';

const calculateMonthlyCost = (school: School): number => {
    const costOfLiving = school.costOfLiving || {};
    // Tactical Guard: Use optional chaining for deep intel properties
    const isProvided = school.intel?.housing?.provided || false;
    
    let adults = 1;
    let children = 0;

    switch (teacherProfile.familyStatus) {
        case 'Couple':
            adults = 2;
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
            break;
    }

    const foodCost = ( (Number(costOfLiving.food) || 0) * adults) + ( (Number(costOfLiving.food) || 0) * 0.5 * children);
    const transportCost = ( (Number(costOfLiving.transport) || 0) * adults) + ( (Number(costOfLiving.transport) || 0) * 0.3 * children);
    const mobileCost = (Number(costOfLiving.mobile) || 0) * adults;
    const diningSocialCost = (Number(costOfLiving.diningSocial) || 0) * adults;
    const uncoveredMedicalCost = ( (Number(costOfLiving.uncoveredMedical) || 0) * adults) + ( (Number(costOfLiving.uncoveredMedical) || 0) * 0.5 * children);
    
    const apartmentCost = isProvided ? 0 : ( Number(costOfLiving.monthlyRent1BR) || 0 );

    return (
      apartmentCost +
      foodCost +
      transportCost +
      (Number(costOfLiving.utilities) || 0) +
      (Number(costOfLiving.internet) || 0) +
      mobileCost +
      diningSocialCost +
      (Number(costOfLiving.vehicleInsuranceMaint) || 0) +
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

    const resultColor = result === 'best' ? 'text-green-400' : result === 'worst' ? 'text-red-400' : 'text-white';

    return (
        <div className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-[10px] font-black uppercase text-[#94a3b8] tracking-widest">{label}</span>
            </div>
            <div className={cn("flex items-center gap-2 text-sm font-black tracking-tighter text-right whitespace-nowrap", resultColor)}>
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
    
    // Protocol Check: Pass collection path directly to satisfy useCollection
    const { data: schools, isLoading: isLoadingSchools } = useCollection<School>('schools');
    
    const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
    const [netSalaries, setNetSalaries] = useState<string[]>(['', '', '']);
    
    useEffect(() => {
        if (firestore) {
            const counterRef = doc(firestore, 'app_metrics', 'page_views');
            setDocumentNonBlocking(counterRef, { comparisons_made: increment(1) });
        }
    }, [firestore]);
    
    useEffect(() => {
        if (schools && schools.length > 0 && selectedSchoolIds.length === 0) {
            const preferredSchools = schools
                .filter(school => (teacherProfile.preferredCountries || []).includes(school.country));
            const otherSchools = schools.filter(school => !(teacherProfile.preferredCountries || []).includes(school.country));
            const initialSchoolIds = [...new Set([...preferredSchools, ...otherSchools].map(s => s.id))].slice(0, 3);
            
            if (initialSchoolIds.length > 0) {
                setSelectedSchoolIds(initialSchoolIds);
            }
        }
    }, [schools, selectedSchoolIds.length]);

    const selectedSchools = useMemo(() => {
        if (!schools || selectedSchoolIds.length === 0) return [];
        return selectedSchoolIds
            .map(id => schools.find(s => s.id === id))
            .filter((s): s is School => !!s?.id);
    }, [selectedSchoolIds, schools]);

    const handleSelectSchool = (index: number, newSchoolId: string) => {
        const currentlySelectedIds = [...selectedSchoolIds];
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
                // Tactical Guard: String conversion to prevent split() failure
                const salaryStr = String(school.intel?.salary?.value || '0');
                const highEnd = salaryStr.includes(' - ') ? salaryStr.split(' - ')[1] : salaryStr;
                return parseInt(highEnd?.replace(/[^0-9]/g, '') || '0') || 0;
            case 'savings':
                const savingsVal = school.intel?.savingsPotential?.value ?? '—';
                if (savingsVal === 'V High') return 3;
                if (savingsVal === 'High') return 2;
                if (savingsVal === 'Moderate') return 1;
                return 0;
            case 'classSize':
                return Number(school.intel?.classSize) || 0;
            case 'monthlyCost':
                return calculateMonthlyCost(school) || 0;
            case 'yourSavings':
                const netSalary = parseFloat(netSalaries[index]) || 0;
                if (netSalary <= 0) return -Infinity; 
                return (netSalary / 12) - calculateMonthlyCost(school);
            default:
                return 0;
        }
    };
    
    const salaryComp = useMemo(() => compareThree('salary', true), [selectedSchools, netSalaries]);
    const savingsComp = useMemo(() => compareThree('savings', true), [selectedSchools, netSalaries]);
    const monthlyCostComp = useMemo(() => compareThree('monthlyCost', false), [selectedSchools, netSalaries]);
    const classSizeComp = useMemo(() => compareThree('classSize', false), [selectedSchools, netSalaries]);
    const yourSavingsComp = useMemo(() => compareThree('yourSavings', true), [selectedSchools, netSalaries]);

    function compareThree(metric: ComparisonMetric, higherIsBetter: boolean): ComparisonResult[] {
        if (selectedSchools.length < 2) return selectedSchools.map(() => 'neutral');
        
        const values = selectedSchools.map((school, i) => getNumericValue(school, metric, i));
        const sortedValues = [...values].sort((a, b) => higherIsBetter ? b - a : a - b);
        const bestValue = sortedValues[0];
        const worstValue = sortedValues[sortedValues.length - 1];

        if (bestValue === worstValue) return selectedSchools.map(() => 'neutral');

        return values.map(val => {
            if (val === bestValue) return 'best';
            if (val === worstValue) return 'worst';
            return 'neutral';
        });
    }

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
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase italic leading-none">3. Compare schools</h1>
                <p className="text-[#94a3b8] font-black uppercase text-[10px] tracking-[0.3em] opacity-60">Selection matrix for deployment.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start mb-12">
                {selectedSchools.map((school, index) => (
                     <div key={school.id} className="flex flex-col gap-4 items-center">
                        <div className="w-full max-w-sm">
                             <Select value={school.id} onValueChange={(val) => handleSelectSchool(index, val)}>
                                <SelectTrigger className="bg-[#020617]/50 border-white/10 h-11 rounded-sm text-white font-black uppercase text-[10px] tracking-widest">
                                    <SelectValue placeholder="Select target school" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1f2937] border-white/10">
                                    {schools.map(s => (
                                        <SelectItem key={s.id} value={s.id} className="font-bold text-xs uppercase text-white">
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                             </Select>
                        </div>

                        <div className="w-full max-w-sm space-y-2">
                            <Label className="text-[10px] font-black uppercase text-[#94a3b8] tracking-widest">Offered Net Salary (Annual)</Label>
                            <Input
                                value={netSalaries[index]}
                                onChange={(e) => handleNetSalaryChange(index, e.target.value)}
                                className="bg-[#020617]/50 border-white/10 rounded-sm h-11 text-right font-black text-white"
                            />
                        </div>

                        <Card className="bg-[#1f2937]/70 backdrop-blur-md border-white/10 overflow-hidden group w-full max-w-sm shadow-2xl">
                            <Link href={`/schools/${school.id}`} className="block">
                                <div className="relative aspect-video">
                                    <Image src={school.imageUrl || 'https://picsum.photos/seed/school/600/400'} alt={school.name} fill className="object-cover opacity-60 group-hover:scale-105 transition-transform" />
                                </div>
                                <CardHeader className="min-h-[7rem] border-b border-white/5">
                                    <CardTitle className="text-xl text-white font-black tracking-tighter uppercase">{school.name}</CardTitle>
                                     <div className="flex items-center text-[#94a3b8] text-[10px] font-black uppercase pt-1">
                                        <MapPin className="w-3 h-3 mr-1.5 text-[#f97316]" />
                                        <span>{school.location || school.city || "CLASSIFIED"}, {school.country}</span>
                                    </div>
                                </CardHeader>
                            </Link>
                            <CardContent className="p-4 md:p-6 pt-0 divide-y divide-white/10">
                                <MetricRow label="Salary Range" value={school.intel?.salary?.value ?? '—'} result={salaryComp[index]} icon={<DollarSign className="w-4 h-4 text-green-400" />} />
                                <MetricRow label="Savings Potential" value={school.intel?.savingsPotential?.value ?? '—'} result={savingsComp[index]} icon={<Sparkles className="w-4 h-4 text-amber-400" />} />
                                <MetricRow
                                    label="Monthly Savings"
                                    value={((parseFloat(netSalaries[index]) || 0) / 12) - calculateMonthlyCost(school)}
                                    result={yourSavingsComp[index]}
                                    format={(v) => v > -Infinity ? formatCurrency(v, 'USD') : '—'}
                                    icon={<PiggyBank className="w-4 h-4 text-green-500" />}
                                />
                                <MetricRow label="Housing" value={school.intel?.housing?.value ?? '—'} result="neutral" icon={<Home className="w-4 h-4 text-[#007FFF]" />} />
                                <MetricRow label="Curriculum" value={school.intel?.curriculum ?? '—'} result="neutral" icon={<BookOpen className="w-4 h-4 text-purple-400" />} />
                                <MetricRow label="Class Size" value={school.intel?.classSize ?? '—'} result={classSizeComp[index]} icon={<Building className="w-4 h-4 text-[#007FFF]" />} />
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