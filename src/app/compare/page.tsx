
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
import { cn, formatCurrency, categorizeInsurance } from '@/lib/utils';
import { MapPin, DollarSign, Sparkles, Home, HeartPulse, BookOpen, Building, Users, PiggyBank, Info, Loader2 } from 'lucide-react';
import { LeopardfishComparisonInsights } from '@/components/leopardfish-comparison-insights';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, increment, collection } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { getRentForFamily, getFamilyScalingMultiplier, type FamilyStatus } from '@/lib/rent-calculator';

type ComparisonMetric = 'salary' | 'savings' | 'classSize' | 'monthlyCost' | 'yourSavings';
type ComparisonResult = 'best' | 'worst' | 'neutral';

const calculateMonthlyCost = (school: School, status: FamilyStatus): number => {
    const { costOfLiving, intel } = school;
    const multiplier = getFamilyScalingMultiplier(status);
    const { rent } = getRentForFamily(costOfLiving, status);

    const foodCost = (costOfLiving.food || 0) * multiplier;
    const transportCost = (costOfLiving.transport || 0) * multiplier;
    const utilitiesCost = (costOfLiving.utilities || 0) * multiplier;
    const internetCost = (costOfLiving.internet || 0);
    const mobileCost = (costOfLiving.mobile || 0) * multiplier;
    const diningSocialCost = (costOfLiving.diningSocial || 0) * multiplier;
    const uncoveredMedicalCost = (costOfLiving.uncoveredMedical || 0) * multiplier;
    
    const apartmentCost = intel.housing.provided ? 0 : rent;
    const contingencyBuffer = 200; // Standard Leopardfish Intel safety margin

    return (
      apartmentCost +
      foodCost +
      transportCost +
      utilitiesCost +
      internetCost +
      mobileCost +
      diningSocialCost +
      (costOfLiving.vehicleInsuranceMaint || 0) +
      uncoveredMedicalCost +
      contingencyBuffer
    );
};

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
                        <TableCell className="py-2 text-[11px] font-bold px-3 text-white/90">Comprehensive</TableCell>
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

const MetricRow = ({ label, value, result, format, icon, helpContent }: {
    label: string;
    value: any;
    result: ComparisonResult;
    format?: (value: any) => string;
    icon: React.ReactNode;
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
            <PopoverContent className="w-80 glass border-primary/20 shadow-2xl" side="top">
                {helpContent}
            </PopoverContent>
        </Popover>
    ) : (
        <span className="text-sm text-muted-foreground">{label}</span>
    );

    return (
        <div className="flex justify-between items-center py-3 border-b border-white/5 last:border-0 h-14">
            <div className="flex items-center gap-2">
                {icon}
                {labelContent}
            </div>
            <div className={cn("flex items-center gap-2 text-base font-bold text-right whitespace-nowrap", resultColor(result))}>
                <span>{format ? format(value) : (value !== null ? value?.toString() : '—')}</span>
            </div>
        </div>
    );
};

function SchoolComparisonColumn({ 
    school, 
    index, 
    onSelect, 
    selectedIds, 
    netSalary, 
    onNetSalaryChange,
    familyStatus,
    onFamilyStatusChange,
    schools,
    comparisonResults
}: {
    school: School;
    index: number;
    onSelect: (id: string) => void;
    selectedIds: string[];
    netSalary: string;
    onNetSalaryChange: (value: string) => void;
    familyStatus: FamilyStatus;
    onFamilyStatusChange: (status: FamilyStatus) => void;
    schools: School[] | null;
    comparisonResults: Record<string, ComparisonResult>;
}) {
    const [glowActive, setGlowActive] = useState(true);
    const [timerStarted, setTimerStarted] = useState(false);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        
        if (netSalary && !timerStarted) {
            setTimerStarted(true);
            timeout = setTimeout(() => {
                setGlowActive(false);
            }, 10000);
        }

        if (!netSalary) {
            setGlowActive(true);
            setTimerStarted(false);
        }

        return () => clearTimeout(timeout);
    }, [netSalary, timerStarted]);

    const trueNetSavings = useMemo(() => {
        const parsedSalary = parseFloat(netSalary) || 0;
        if (parsedSalary <= 0) return null;
        return parsedSalary - calculateMonthlyCost(school, familyStatus);
    }, [netSalary, school, familyStatus]);

    const familyLabel = {
        single: 'Single',
        couple: 'Couple',
        family: 'Family 2+1',
        family2: 'Family 2+2'
    }[familyStatus];

    return (
        <div className="flex flex-col gap-4 items-center h-full">
            <div className="w-full max-w-sm">
                 <Select value={school.id} onValueChange={onSelect}>
                    <SelectTrigger className="bg-background/50 border-white/10 rounded-sm h-11">
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

            <div className="w-full max-w-sm space-y-4">
                <div className="space-y-2">
                    <Label htmlFor={`net-salary-${index}`} className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Total net salary & benefits (monthly)</Label>
                    <Input
                        id={`net-salary-${index}`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={15}
                        placeholder="e.g., 5000"
                        value={netSalary}
                        onChange={(e) => onNetSalaryChange(e.target.value)}
                        className={cn(
                            "bg-background/50 border-white/10 rounded-sm h-11 text-right font-bold transition-all duration-500",
                            glowActive && "animate-glow animate-glitch border-primary/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                        )}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Family scaling</Label>
                    <Select value={familyStatus} onValueChange={(v) => onFamilyStatusChange(v as FamilyStatus)}>
                        <SelectTrigger className="bg-background/50 border-white/10 rounded-sm h-11 text-sm font-bold">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass">
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="couple">Couple</SelectItem>
                            <SelectItem value="family">Family 2+1</SelectItem>
                            <SelectItem value="family2">Family 2+2</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card className="bg-card/70 backdrop-blur-sm border-border overflow-hidden group w-full max-w-sm flex flex-col h-full shadow-lg">
                <Link href={`/schools/${school.id}`} className="block">
                    <div className="relative aspect-video">
                        <Image src={school.imageUrl} alt={school.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" data-ai-hint={school.imageHint} />
                    </div>
                    <CardHeader className="min-h-[100px] flex flex-col justify-center">
                        <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-2 leading-tight font-black">{school.name}</CardTitle>
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
                                label="True net savings"
                                value={trueNetSavings !== null ? trueNetSavings : null}
                                result={comparisonResults.yourSavings}
                                format={(v) => v !== null ? formatCurrency(v, 'USD') : '—'}
                                icon={<PiggyBank className="w-4 h-4 text-green-500" />}
                            />
                         <MetricRow
                            label={`Est. costs (${familyLabel})`}
                            value={calculateMonthlyCost(school, familyStatus)}
                            result={comparisonResults.monthlyCost}
                            format={(v) => formatCurrency(v, 'USD')}
                            icon={<DollarSign className="w-4 h-4 text-red-400" />}
                        />
                         <MetricRow label="Housing" value={school.intel.housing.value} result={'neutral'} icon={<Home className="w-4 h-4 text-blue-400" />} />
                         <MetricRow 
                            label="Health insurance" 
                            value={categorizeInsurance(school.intel.healthInsurance)} 
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
}

export default function ComparePage() {
    const firestore = useFirestore();
    const schoolsQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'schools') : null),
        [firestore]
    );
    const { data: schools, isLoading: isLoadingSchools } = useCollection<School>(schoolsQuery);
    
    const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
    const [netSalaries, setNetSalaries] = useState<string[]>(['', '', '']);
    const [familyStatuses, setFamilyStatuses] = useState<FamilyStatus[]>(['single', 'single', 'single']);
    
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
        const cleanedValue = value.replace(/\D/g, '');
        const newSalaries = [...netSalaries];
        newSalaries[index] = cleanedValue;
        setNetSalaries(newSalaries);
    };

    const handleFamilyStatusChange = (index: number, status: FamilyStatus) => {
        // Synchronise household profile across all tactical dossiers
        setFamilyStatuses([status, status, status]);
    };
    
    const getNumericValue = (school: School, metric: ComparisonMetric, index: number) => {
        const status = familyStatuses[index];
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
                return calculateMonthlyCost(school, status);
            case 'yourSavings':
                const monthlyIncome = parseFloat(netSalaries[index]) || 0;
                if (monthlyIncome <= 0) return -Infinity;
                return monthlyIncome - calculateMonthlyCost(school, status);
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
                        onSelect={(id) => handleSelectSchool(index, id)} 
                        selectedIds={selectedSchoolIds}
                        netSalary={netSalaries[index]}
                        onNetSalaryChange={(value) => handleNetSalaryChange(index, value)}
                        familyStatus={familyStatuses[index]}
                        onFamilyStatusChange={(status) => handleFamilyStatusChange(index, status)}
                        schools={schools}
                        comparisonResults={{
                            salary: salaryComp[index],
                            savings: savingsComp[index],
                            monthlyCost: monthlyCostComp[index],
                            classSize: classSizeComp[index],
                            yourSavings: yourSavingsComp[index],
                        }}
                    />
                ))}
            </div>

            <div className="mt-16 flex justify-center">
                 <LeopardfishComparisonInsights schools={selectedSchools} />
            </div>
        </div>
    );
}
