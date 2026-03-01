
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
import { MapPin, DollarSign, Home, HeartPulse, BookOpen, Building, Users, PiggyBank, Loader2 } from 'lucide-react';
import { LeopardfishComparisonInsights } from '@/components/leopardfish-comparison-insights';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, increment, collection } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { getRentForFamily, getFamilyScalingMultiplier, type FamilyStatus } from '@/lib/rent-calculator';

type ComparisonMetric = 'salary' | 'savings' | 'classSize' | 'monthlyCost' | 'yourSavings';
type ComparisonResult = 'best' | 'worst' | 'neutral';

const calculateMonthlyCostUSD = (school: School, status: FamilyStatus): number => {
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
    const contingencyBuffer = 200;

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
    <div className="space-y-3 p-1 text-left">
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

const MetricRow = ({ label, value, result, format, icon, helpContent }: {
    label: string;
    value: any;
    result: ComparisonResult;
    format?: (value: any) => any;
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
                {format ? format(value) : (value !== null && value !== undefined ? value : '—')}
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

    const currency = COUNTRY_TO_CURRENCY[school.country] || 'USD';
    const rate = CONVERSION_RATES[currency] || 1;

    const costsLocal = useMemo(() => {
        const costsUSD = calculateMonthlyCostUSD(school, familyStatus);
        return costsUSD * rate;
    }, [school, familyStatus, rate]);

    const trueNetSavingsLocal = useMemo(() => {
        const parsedSalaryLocal = parseFloat(netSalary) || 0;
        if (parsedSalaryLocal <= 0) return null;
        return parsedSalaryLocal - costsLocal;
    }, [netSalary, costsLocal]);

    const trueNetSavingsUSD = useMemo(() => {
        return trueNetSavingsLocal !== null ? trueNetSavingsLocal / rate : null;
    }, [trueNetSavingsLocal, rate]);

    const trueNetSavingsGBP = useMemo(() => {
        return trueNetSavingsUSD !== null ? trueNetSavingsUSD * CONVERSION_RATES['GBP'] : null;
    }, [trueNetSavingsUSD]);

    const totalIncomeLocal = useMemo(() => {
        const parsedSalaryLocal = parseFloat(netSalary) || 0;
        return parsedSalaryLocal > 0 ? parsedSalaryLocal : null;
    }, [netSalary]);

    const familyLabel = {
        single: 'Single',
        couple: 'Couple',
        family: 'Family 2+1',
        family2: 'Family 2+2'
    }[familyStatus];

    const savingsResult = trueNetSavingsLocal !== null && trueNetSavingsLocal >= 0 ? 'best' : 'worst';

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
                    <Label htmlFor={`net-salary-${index}`} className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Total net salary & benefits (monthly) ({currency})</Label>
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
                        <Image src={school.imageUrl} alt={school.name} fill style={{ objectFit: 'cover' }} className="group-hover:scale-105 transition-transform duration-300" data-ai-hint={school.imageHint} />
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
                    <div className="space-y-0 border-b border-white/5 mb-6">
                         <MetricRow 
                            label="Total income" 
                            value={totalIncomeLocal} 
                            result={'best'} 
                            format={(v) => v !== null ? formatCurrency(v, currency) : '—'} 
                            icon={<DollarSign className="w-4 h-4 text-green-400" />} 
                        />
                         <MetricRow
                            label={`Est. costs (${familyLabel})`}
                            value={costsLocal}
                            result={'worst'} 
                            format={(v) => formatCurrency(v, currency)}
                            icon={<DollarSign className="w-4 h-4 text-red-400" />}
                        />
                         <MetricRow
                                label="True net savings"
                                value={trueNetSavingsLocal}
                                result={savingsResult}
                                format={(v) => v !== null ? formatCurrency(v, currency) : '—'}
                                icon={<PiggyBank className="w-4 h-4 text-green-500" />}
                            />
                         {trueNetSavingsUSD !== null && (
                            <MetricRow
                                label="or"
                                value={
                                    <div className="flex items-center gap-2 text-[11px] font-black opacity-90">
                                        <span>{formatCurrency(trueNetSavingsUSD, 'USD')}</span>
                                        <span className="w-px h-3 bg-white/10" />
                                        <span>{formatCurrency(trueNetSavingsGBP || 0, 'GBP')}</span>
                                    </div>
                                }
                                result={savingsResult}
                                icon={<div className="w-4" />}
                            />
                         )}
                         <MetricRow label="Housing" value={school.intel.housing.value} result={'neutral'} icon={<Home className="w-4 h-4 text-blue-400" />} />
                         <MetricRow 
                            label="Health insurance" 
                            value={categorizeInsurance(school.intel.healthInsurance)} 
                            result={'neutral'} 
                            icon={<HeartPulse className="w-4 h-4 text-red-400" />} 
                            helpContent={<HealthInsuranceHelp />}
                        />
                    </div>
                     <div className="pt-0">
                         <MetricRow label="Curriculum" value={school.intel.curriculum} result={'neutral'} icon={<BookOpen className="w-4 h-4 text-purple-400" />} />
                         <MetricRow label="Average class size" value={school.intel.classSize} result={comparisonResults.classSize} icon={<Building className="w-4 h-4 text-sky-400" />} />
                         <MetricRow label="Student-teacher ratio" value={school.intel.studentTeacherRatio} result={'neutral'} icon={<Users className="w-4 h-4 text-rose-400" />} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

const CONVERSION_RATES: Record<string, number> = {
  USD: 1,
  GBP: 0.78,
  EUR: 0.92,
  AED: 3.67,
  QAR: 3.64,
  SAR: 3.75,
  SGD: 1.34,
  CHF: 0.88,
  JPY: 150,
  THB: 35,
  CNY: 7.2,
  KRW: 1350,
  HKD: 7.8,
  MYR: 4.7,
  VND: 25000,
  CZK: 23.5,
  AUD: 1.52,
  CAD: 1.36,
  ZAR: 18.4,
  NZD: 1.66,
};

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  'Japan': 'JPY',
  'UAE': 'AED',
  'Switzerland': 'CHF',
  'Singapore': 'SGD',
  'South Korea': 'KRW',
  'United Kingdom': 'GBP',
  'Netherlands': 'EUR',
  'USA': 'USD',
  'Czech Republic': 'CZK',
  'Thailand': 'THB',
  'Vietnam': 'VND',
  'China': 'CNY',
  'Qatar': 'QAR',
  'Saudi Arabia': 'SAR',
  'Hong Kong': 'HKD',
  'Malaysia': 'MYR',
  'Spain': 'EUR',
  'Italy': 'EUR',
  'Germany': 'EUR',
  'France': 'EUR',
  'Australia': 'AUD',
  'Canada': 'CAD',
  'South Africa': 'ZAR',
  'New Zealand': 'NZD',
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
        setFamilyStatuses([status, status, status]);
    };
    
    const getNumericValueUSD = (school: School, metric: ComparisonMetric, index: number) => {
        const status = familyStatuses[index];
        const currency = COUNTRY_TO_CURRENCY[school.country] || 'USD';
        const rate = CONVERSION_RATES[currency] || 1;

        switch (metric) {
            case 'salary': {
                const val = school.intel.salary.value || '';
                const numbers = val.match(/\d+/g)?.map(Number);
                if (!numbers) return 0;
                const scale = val.toLowerCase().includes('k') ? 1000 : 1;
                if (numbers.length >= 2) {
                    return ((numbers[0] + numbers[1]) / 2) * scale;
                }
                return numbers[0] * scale;
            }
            case 'savings':
                if (school.intel.savingsPotential.value === 'V High') return 3;
                if (school.intel.savingsPotential.value === 'High') return 2;
                if (school.intel.savingsPotential.value === 'Moderate') return 1;
                return 0;
            case 'classSize':
                return school.intel.classSize;
            case 'monthlyCost':
                return calculateMonthlyCostUSD(school, status);
            case 'yourSavings': {
                const monthlyIncomeLocal = parseFloat(netSalaries[index]) || 0;
                if (monthlyIncomeLocal <= 0) return -Infinity;
                const monthlyIncomeUSD = monthlyIncomeLocal / rate;
                return monthlyIncomeUSD - calculateMonthlyCostUSD(school, status);
            }
            default:
                return 0;
        }
    };
    
    const compareThree = (metric: ComparisonMetric, higherIsBetter: boolean): ComparisonResult[] => {
        if (selectedSchools.length < 2) return selectedSchools.map(() => 'neutral');
        const values = selectedSchools.map((school, i) => getNumericValueUSD(school, metric, i));
        
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
