
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

    const foodCost = ((costOfLiving as any).food ?? 0) * adults + ((costOfLiving as any).food ?? 0) * 0.5 * children;
    const transportCost = ((costOfLiving as any).transport ?? 0) * adults + ((costOfLiving as any).transport ?? 0) * 0.3 * children;
    const mobileCost = ((costOfLiving as any).mobile ?? 0) * adults;
    const diningSocialCost = ((costOfLiving as any).diningSocial ?? 0) * adults;
    const uncoveredMedicalCost = ((costOfLiving as any).uncoveredMedical ?? 0) * adults + ((costOfLiving as any).uncoveredMedical ?? 0) * 0.5 * children;
    
    const isProvided = school.housingprovision?.toLowerCase().includes('provided') || (intel.housing && intel.housing.provided);
    const apartmentCost = isProvided ? 0 : ((costOfLiving as any).monthlyRent1BR ?? (costOfLiving as any).apartment ?? 0);

    return (
      apartmentCost +
      foodCost +
      transportCost +
      ((costOfLiving as any).utilities ?? 0) +
      ((costOfLiving as any).internet ?? 0) +
      mobileCost +
      diningSocialCost +
      ((costOfLiving as any).vehicleInsuranceMaint ?? 0) +
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

    if (!mounted) return <div className="h-12 w-full animate-pulse bg-white/5 rounded-sm mb-2" />;

    const resultColor = (result: ComparisonResult) => {
        if (result === 'best') return 'text-green-400';
        if (result === 'worst') return 'text-red-400';
        return 'text-white';
    };

    return (
        <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-[10px] text-muted-foreground font-black tracking-tighter uppercase">{label}</span>
            </div>
            <div className={cn("flex items-center gap-2 text-sm font-black tracking-tighter text-right whitespace-nowrap", resultColor(result))}>
                <span>{format ? (value !== null ? format(value) : '—') : (value?.toString() ?? '—')}</span>
                 {link && (
                    <Link href={link.href} aria-label={link.ariaLabel}>
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
        const salaryText = (school.finance || (school.intel && school.intel.salary.value)) || '';
        switch (metric) {
            case 'salary':
                return parseInt(salaryText.split(' - ')[1]?.replace('k', '000').replace('$', '') || '0') || 0;
            case 'savings':
                const savingsVal = (school as any).savingspotential || (school.intel && school.intel.savingsPotential.value);
                if (savingsVal === 'V High') return 3;
                if (savingsVal === 'High') return 2;
                if (savingsVal === 'Moderate') return 1;
                return 0;
            case 'classSize':
                return Number(school.classsize || (school.intel && school.intel.classSize)) || 0;
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

    const SchoolComparisonColumn = ({ school, index, onSelect, selectedIds, netSalary, onNetSalaryChange }: {
        school: School;
        index: number;
        onSelect: (id: string) => void;
        selectedIds: string[];
        netSalary: string;
        onNetSalaryChange: (value: string) => void;
    }) => {
        if (!school) return null;

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

        const name = school.schoolname || school.name || 'Unknown School';
        const city = school.city || school.location || null;
        const country = school.country || null;
        const finance = (school.finance || (school.intel && school.intel.salary.value)) || null;
        const savings = ((school as any).savingspotential || (school.intel && school.intel.savingsPotential.value)) || null;
        const housing = (school.housingprovision || (school.intel && school.intel.housing.value)) || null;
        const health = (school.healthcoverage || (school.intel && school.intel.healthInsurance)) || null;
        const curriculum = (school.curriculum || (school.intel && school.intel.curriculum)) || null;
        const classSizeValue = (school.classsize || (school.intel && school.intel.classSize)) || null;
        const ratio = (school.staffstudentratio || (school.intel && school.intel.studentTeacherRatio)) || null;

        return (
            <div className="flex flex-col gap-4 items-center">
                <div className="w-full max-w-sm">
                     <Select value={school.id} onValueChange={onSelect}>
                        <SelectTrigger className="bg-background/50 border-white/10 h-11 rounded-sm">
                            <SelectValue placeholder="Select a school" />
                        </SelectTrigger>
                        <SelectContent className="glass">
                            {schools?.map(s => (
                                <SelectItem key={s.id} value={s.id} disabled={selectedIds.includes(s.id) && s.id !== school.id}>
                                    {s.schoolname || s.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-full max-w-sm space-y-2">
                    <Label htmlFor={`net-salary-${index}`} className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Offered Net Salary (Annual)</Label>
                    <Input
                        id={`net-salary-${index}`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="e.g., 55000"
                        value={netSalary}
                        onChange={(e) => onNetSalaryChange(e.target.value)}
                        className="bg-background/50 border-white/10 rounded-sm h-11 text-right font-black text-white"
                    />
                </div>

                <Card className="bg-card/70 backdrop-blur-sm border-border overflow-hidden group w-full max-w-sm shadow-2xl">
                    <Link href={`/schools/${school.id}`} className="block">
                        <div className="relative aspect-video">
                            <Image src={school.imageUrl || 'https://picsum.photos/seed/school/600/400'} alt={name} fill style={{ objectFit: 'cover' }} data-ai-hint={school.imageHint} className="group-hover:scale-105 transition-transform duration-300 opacity-60" />
                        </div>
                        <CardHeader className="min-h-[8rem]">
                            <CardTitle className="text-xl group-hover:text-[#f97316] transition-colors line-clamp-2 text-white font-black tracking-tighter">{name}</CardTitle>
                             <div className="flex items-center text-muted-foreground text-[10px] font-black uppercase tracking-widest pt-1">
                                <MapPin className="w-3 h-3 mr-1.5 text-[#f97316]" />
                                <span>{city}, {country}</span>
                            </div>
                        </CardHeader>
                    </Link>
                    <CardContent className="p-4 md:p-6 pt-0 divide-y divide-border/50">
                        <div className="pt-4">
                             <MetricRow label="Salary Range" value={finance} result={comparisonResults.salary} icon={<DollarSign className="w-4 h-4 text-green-400" />} />
                             <MetricRow label="Savings Potential" value={savings} result={comparisonResults.savings} icon={<Sparkles className="w-4 h-4 text-amber-400" />} />
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
                             <MetricRow label="Housing" value={housing} result={'neutral'} icon={<Home className="w-4 h-4 text-[#007FFF]" />} />
                             <MetricRow 
                                label="Health Insurance" 
                                value={health} 
                                result={'neutral'} 
                                icon={<HeartPulse className="w-4 h-4 text-red-400" />} 
                            />
                        </div>
                         <div className="pt-4">
                             <MetricRow label="Curriculum" value={curriculum} result={'neutral'} icon={<BookOpen className="w-4 h-4 text-purple-400" />} />
                             <MetricRow label="Average Class Size" value={classSizeValue} result={comparisonResults.classSize} icon={<Building className="w-4 h-4 text-[#007FFF]" />} />
                             <MetricRow label="Student-Teacher Ratio" value={ratio} result={'neutral'} icon={<Users className="w-4 h-4 text-rose-400" />} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    if (isLoadingSchools || !schools) {
        return (
          <div className="container mx-auto flex justify-center items-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-[#f97316]" />
          </div>
        );
    }

    return (
        <div className="container mx-auto px-4 md:px-6 py-0">
            <div className="pt-4 mb-12 text-center">
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-2 text-white normal-case">3. Compare schools</h1>
              <p className="text-muted-foreground text-center max-w-2xl mx-auto font-black uppercase text-[10px] tracking-widest opacity-60 leading-relaxed">Select up to three schools for a side-by-side comparison of key tactical data.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start mb-12">
                {selectedSchools.map((school, index) => (
                     <SchoolComparisonColumn 
                        key={school?.id || index} 
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
                 <LeopardfishComparisonInsights schools={selectedSchools} netSalaries={netSalaries} />
            </div>
        </div>
    );
}
