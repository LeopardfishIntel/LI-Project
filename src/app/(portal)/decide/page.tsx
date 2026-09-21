"use client";

import { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    MapPin, Loader2, ArrowLeft, TrendingUp, ShieldAlert, Target, Zap,
    BookOpen, Activity, Wallet, Receipt, Globe2, Users, AlertTriangle,
    ExternalLink, Clock, Home, GraduationCap, BarChart3, Info, Scale, PlusCircle,
    ShieldCheck, Fingerprint, Lock, Camera
} from 'lucide-react';
// 🛰️ Added useUser to the import
import { useFirestore, useCollection, useMemoFirebase, useUser, setDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, doc, increment, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import type { TeacherProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip as RadixTooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { canonicalCountry, FAMILY_PROFILES, getProfileByLabel, getCOLField, findCostOfLiving, RATES as BASE_RATES, getMacroRiskTier, isHousingProvided, getZoneLocationWeights, getInflationRate } from '@/lib/calculations';
import { openMethodologyModal } from '@/components/methodology-modal';
import { checkIsAdmin } from '@/lib/auth/admin';

const RATES: Record<string, number> = {};
Object.keys(BASE_RATES).forEach(k => {
    RATES[k] = BASE_RATES[k] / (BASE_RATES.USD || 1.27);
});
RATES.USD = 1.0;

const getCurrencyForCity = (city: string, country: string, colCode?: string) => {
    const c = (city || "").toLowerCase();
    const co = (country || "").toLowerCase();
    if (colCode && colCode !== 'USD') return colCode.toUpperCase();
    if (co.includes("bahrain") || c.includes("riffa") || c.includes("manama")) return "BHD";
    if (c.includes("prague") || co.includes("czech")) return "CZK";
    if (c.includes("dubai") || c.includes("abu dhabi") || co.includes("emirates")) return "AED";
    if (c.includes("london") || co.includes("united kingdom")) return "GBP";
    if (co.includes("saudi")) return "SAR";
    if (c.includes("doha") || co.includes("qatar")) return "QAR";
    if (co.includes("kuwait")) return "KWD";
    if (co.includes("oman") || c.includes("muscat")) return "OMR";
    if (co.includes("jordan") || c.includes("amman")) return "JOD";
    if (co.includes("egypt") || c.includes("cairo")) return "EGP";
    if (co.includes("switzerland") || co.includes("swiss")) return "CHF";
    if (co.includes("austria") || co.includes("belgium") || co.includes("germany") || co.includes("spain") || co.includes("france") || co.includes("netherlands") || co.includes("portugal") || co.includes("italy")) return "EUR";
    if (co.includes("hong kong")) return "HKD";
    if (co.includes("singapore")) return "SGD";
    if (co.includes("china")) return "CNY";
    if (co.includes("thailand")) return "THB";
    if (co.includes("malaysia")) return "MYR";
    if (co.includes("japan")) return "JPY";
    if (co.includes("korea")) return "KRW";
    if (co.includes("vietnam")) return "VND";
    if (co.includes("indonesia")) return "IDR";
    if (co.includes("brazil")) return "BRL";
    if (co.includes("mexico")) return "MXN";
    return colCode?.toUpperCase() || "USD";
};

const HOUSEHOLD_OPTIONS = FAMILY_PROFILES.map(p => p.value);
const BONUS_REGISTRY: Record<string, number> = {
  "austria": 2 / 12,       // +16.67% (14-month statutory payroll cycle)
  "portugal": 2 / 12,      // +16.67% (14-month statutory payroll cycle)
  "spain": 2 / 12,         // +16.67% (14-month statutory payroll cycle)
  "greece": 2 / 12,        // +16.67% (14-month statutory payroll cycle)
  "peru": 2 / 12,          // +16.67% (July & December Gratifications)
  "ecuador": 2 / 12,       // +16.67% (Decimo Tercer & Cuarto)
  "belgium": 1.92 / 12,    // +16.0% (13th + 92% of 14th)
  "italy": 1 / 12,         // +8.33% (13th month standard)
  "argentina": 1 / 12,     // +8.33% (S.A.C. Sueldo Anual Complementario)
  "brazil": 1 / 12,        // +8.33% (13th month Décimo Terceiro)
  "mexico": 1 / 12,        // +8.33% (Aguinaldo 13th month)
  "germany": 1 / 12,       // +8.33% (Weihnachtsgeld holiday/13th)
  "netherlands": 1 / 12,   // +8.33% (13th month / Vakantiegeld)
  "china": 1 / 12,         // +8.33% (CNY 13th month bonus)
  "philippines": 1 / 12,   // +8.33% (Statutory 13th month)
  "indonesia": 1 / 12,     // +8.33% (THR Religious Holiday Allowance)
  "bolivia": 1 / 12,       // +8.33% (Aguinaldo 13th month)
  "south africa": 1 / 12,  // +8.33% (13th month Christmas bonus)
  "angola": 1 / 12         // +8.33% (13th month statutory allowance)
};

function getBonusPctForCountry(rawCountry: string): number {
  if (!rawCountry) return 0;
  const c = canonicalCountry(rawCountry);
  for (const [k, v] of Object.entries(BONUS_REGISTRY)) {
    if (c.includes(k) || k.includes(c)) return v;
  }
  return 0;
}
const noSpinners = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
const normalize = (str: string) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, '').trim();

function shortenSchoolName(name: string): string {
    if (!name) return "";
    let s = String(name).trim();
    if (s.length <= 18) return s;
    s = s.replace(/\bInternational School\b/gi, "Int'l Sch.")
         .replace(/\bInternational\b/gi, "Int'l")
         .replace(/\bSchool\b/gi, "Sch.")
         .replace(/\bCollege\b/gi, "Coll.")
         .replace(/\bAcademy\b/gi, "Acad.")
         .replace(/\bElementary\b/gi, "Elem.")
         .replace(/\bSecondary\b/gi, "Sec.")
         .replace(/\bHigh School\b/gi, "HS")
         .replace(/\bBritish\b/gi, "Brit.")
         .replace(/\bSaint\b/gi, "St.");
    return s;
}

function shortenHousingProvision(provision: string): string {
    if (!provision) return "Not Included";
    const raw = String(provision).trim();
    const l = raw.toLowerCase();
    
    if (l.includes("provided") || l.includes("furnished") || l.includes("accommodation")) {
        let type = "";
        if (l.includes("villa") || l.includes("house")) type = "Villa";
        else if (l.includes("apartment") || l.includes("flat")) type = "Flat";
        
        if (l.includes("allowance")) {
            return type ? `Provided (${type}) / Allowance` : "Provided / Allowance";
        }
        return type ? `Provided (${type})` : "Provided";
    }
    
    if (l.includes("allowance")) return "Housing Allowance";
    if (l.includes("subsidis") || l.includes("subsidiz")) return "Subsidised";
    if (l.includes("none") || l.includes("not")) return "Not Included";
    
    return raw.length > 22 ? `${raw.slice(0, 22)}...` : raw;
}
function getSchoolField(school: any, keys: string[]) {
    if (!school) return null;
    const schoolKeyMap = new Map<string, string>();
    for (const k of Object.keys(school)) {
        schoolKeyMap.set(k.toLowerCase().trim(), k);
    }
    for (const key of keys) {
        const found = schoolKeyMap.get(key.toLowerCase().trim());
        if (found !== undefined && school[found] !== null && school[found] !== undefined && school[found] !== "") {
            return school[found];
        }
    }
    return null;
}

function getLocalSalaryForSchool(school: any, currency: string, currentRates: Record<string, number>): string {
    if (!school) return "0";
    const rawVal = getSchoolField(school, [
      'expectedSalary5Years', 'salary5YearsExp', 'startingSalary', 'salaryrange', 'monthlySalary',
      'salary', 'netbase', 'netmonthlyusd', 'salaryrangeusd', 'startingSalaryBA', 'startingSalaryMA'
    ]);
    const raw = (rawVal && rawVal !== "undefined" && rawVal !== "null") ? String(rawVal).trim() : "";
    
    const fallbackUSD = 4200;
    const gbpRate = currentRates[currency] || 1.0;
    const usdRate = currentRates['USD'] || 1.27;
    const fallbackLocal = Math.round((fallbackUSD / usdRate) * gbpRate);
    
    if (!raw || raw === "0") return fallbackLocal.toString();

    // Sanitize commas, trailing decimal cents, and k notation
    const cleanRaw = raw
      .replace(/,/g, '')
      .replace(/\.\d+/g, '')
      .replace(/(\d+)\s*k\b/gi, '$1000');

    const matches = cleanRaw.match(/\d+/g);
    if (!matches || matches.length === 0) return fallbackLocal.toString();

    // Filter out small auxiliary numbers like 14 in '14 times/year'
    const numbers = matches.map(Number).filter(n => n > 50 || matches.length === 1);
    if (numbers.length === 0) return fallbackLocal.toString();

    const isSingleOrStarting = /starting|expected|5year|entry/i.test(
      String(getSchoolField(school, ['expectedSalary5Years', 'salary5YearsExp', 'startingSalary', 'startingSalaryBA', 'startingSalaryMA']) || '')
    );
    let med = (numbers.length > 1 && !isSingleOrStarting) ? (numbers[0] + numbers[1]) / 2 : numbers[0];
    if (isNaN(med) || med <= 0) med = fallbackUSD;

    const lower = raw.toLowerCase();
    const isUSD = /\b(usd|us\$)\b|\$/i.test(raw) || school?.salaryCurrency === "USD" || Boolean(school?.startingSalaryUsd) || Boolean(school?.expectedSalaryNetUsd);

    const isExplicitAnnual = /year|annual|\/yr|\/year|gross\/yr|\/annum|p\.a\.|times\/year|month payroll/i.test(lower);
    const isExplicitMonthly = /month|monthly|\/\s*mo|\bmo\b/i.test(lower);
    const is14Month = /14-month|14 times/i.test(lower);
    const monthsPerYear = is14Month ? 14 : 12;

    const highValCurrencies = ['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD', 'SGD', 'NZD', 'AED', 'SAR', 'QAR', 'BHD', 'KWD', 'OMR'];
    const isHighVal = highValCurrencies.includes(currency) || isUSD;
    const isAnnualVal = isHighVal ? med >= 10000 : med >= 120000;

    let monthly = med;
    if ((isExplicitAnnual || isAnnualVal) && !isExplicitMonthly) {
        monthly = Math.round(monthly / monthsPerYear);
    }

    if (isUSD && currency !== "USD") {
        monthly = Math.round((monthly / usdRate) * gbpRate);
    }

    return monthly.toString();
}


// --- UI COMPONENTS ---

const Tooltip = ({ text, children }: { text: string, children: React.ReactNode }) => (
    <TooltipProvider delayDuration={100}>
        <RadixTooltip>
            <TooltipTrigger asChild>
                {children}
            </TooltipTrigger>
            <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2 max-w-xs shadow-xl z-50">
                {text}
            </TooltipContent>
        </RadixTooltip>
    </TooltipProvider>
);

const ScoreBadge = ({ label, score, color = "#007FFF" }: { label: string, score: string | number, color?: string }) => (
    <div className="flex flex-col border-l border-white/10 pl-3">
        <span className="font-bold text-slate-500 leading-none mb-1 text-[9px]">{label}</span>
        <span className="font-black italic tracking-tighter leading-none text-lg" style={{ color }}>{score}</span>
    </div>
);

// --- STAFFROOM REALITY ENGINE ---

const getStaffroomBrief = (country: string) => {
    const c = country.toLowerCase();
    // Regional Unrest Logic
    const isAlert = c.includes("jordan") || c.includes("lebanon") || c.includes("israel") || c.includes("palestine") || c.includes("ukraine") || c.includes("qatar") || c.includes("uae") || c.includes("saudi arabia");

    if (c.includes("qatar") || c.includes("uae") || c.includes("saudi arabia")) return {
        isAlert,
        text: "The Gulf remains safe for staff, but you'll feel the regional tension as a definite 'background hum' at the moment. Daily life is seamless, but it's a bubble—you'll find the social dynamics strictly managed and the local political landscape is something you keep an eye on, even if it rarely affects your front door."
    };
    if (c.includes("jordan")) return {
        isAlert,
        text: "You'll feel the regional tension here more than most. It's safe enough, but protests are regular and the social atmosphere is quite closed-off compared to Europe. Don't expect things to work like they do back home—a massive amount of patience with the local systems is a requirement here."
    };
    if (c.includes("hong kong")) return {
        isAlert,
        text: "Schools are elite, but you're trading space and quiet for an intense, transactional urban life. You will notice the political shifts in the city vibe, and it is becoming increasingly expensive. It's a high-pressure bubble that doesn't slow down for anyone."
    };
    if (c.includes("greece")) return {
        isAlert: false,
        text: "Athens is fantastic for the culture, but the bureaucracy is a daily grind. You'll have to deal with occasional strikes or economic hiccups that make simple banking or transport a headache. It's a move you make for the human pace of life, not for logistical efficiency."
    };

    return {
        isAlert: false,
        text: "Safe enough for a secure routine, provided you keep your wits about you in the busy areas. Most staff find the transition is a bit of a grind logistically at first, but it settles into a predictable day-to-day work environment once the initial paperwork is sorted."
    };
};

const getLifestyleVibe = (city: string, workload: number) => {
    if (workload > 52) return `Intensity alert: This is a high-performance campus. Expect to be very busy during term.`;
    if (workload < 44) return `Lifestyle focus: A more human pace here; plenty of energy left for ${city} on weekends.`;
    return `Balanced vibe: A typical international setup where work is heavy but manageable.`;
};

const calculateWorkload = (school: any) => {
    let hours = 42;
    const prestige = parseFloat(school.academicscore || "7.0");
    const contact = parseInt(school.noncontacttime || "20");
    if (prestige > 9.0) hours += 8;
    if ((school.curriculum || "").toLowerCase().includes('ib')) hours += 5;
    if (contact < 18) hours += 5;
    return hours;
};

const generateDetailedConclusion = (ranked: any[]) => {
    return [
        `Strategic comparison requires active targets to generate a final analytical briefing.`
    ];
};

import { generateDecideBriefing } from '@/ai/flows/decide-briefing-flow';
import { logTelemetryEvent } from '@/lib/telemetry';

function DecideContent() {
    const router = useRouter();
    const firestore = useFirestore();
    const searchParams = useSearchParams();

    // 🎯 TACTICAL IDENTITY GRAB
    const { user, customId, isAdmin } = useUser();

    const [mounted, setMounted] = useState(false);

    const [schools, setSchools] = useState<any[]>([]);
    const [colData, setColData] = useState<any[]>([]);
    const [transportIntel, setTransportIntel] = useState<any[]>([]);
    const [apiLoading, setApiLoading] = useState(true);

    const { data: exchangeRates } = useDoc<any>(useMemoFirebase(() => (mounted && firestore ? doc(firestore, 'system', 'exchange_rates') : null), [firestore, mounted]));

    const teacherDocRef = useMemo(() => (user && firestore ? doc(firestore, 'teachers', user.uid) : null), [user, firestore]);
    const { data: teacherProfile } = useDoc<TeacherProfile>(teacherDocRef);
    const effectiveAdmin = checkIsAdmin(user, teacherProfile, customId, isAdmin);
    const allowance = effectiveAdmin ? 1000 : (teacherProfile?.evaluations_allowance ?? 20);
    const used = teacherProfile?.evaluations_used ?? 0;
    const isPro = teacherProfile?.tier === 'pro' || effectiveAdmin;
    const remainingEvaluations = Math.max(0, allowance - used);
    const isOverLimit = !effectiveAdmin && !isPro && !!user && (used >= allowance);

    useEffect(() => {
        if (!mounted) return;
        setApiLoading(true);
        fetch('/api/decide-data')
            .then(res => res.json())
            .then(data => {
                if (data.schools) setSchools(data.schools);
                if (data.colData) setColData(data.colData);
                if (data.transportIntel) setTransportIntel(data.transportIntel);
            })
            .catch(err => console.error("Error loading decide data:", err))
            .finally(() => setApiLoading(false));
    }, [mounted]);

    const currentRates = useMemo(() => ({ ...RATES, ...(exchangeRates?.usdBase || {}) }), [exchangeRates]);

    const [selectedIds, setSelectedIds] = useState<string[]>(['', '', '']);
    const [selectedCountries, setSelectedCountries] = useState<string[]>(['', '', '']);
    const [familyStatus, setFamilyStatus] = useState("single");
    const [netSalaries, setNetSalaries] = useState<string[]>(['', '', '']);
    const [manualSalaries, setManualSalaries] = useState<boolean[]>([false, false, false]);
    const [adjustments, setAdjustments] = useState(Array(3).fill({ second: '', other: '', home: '' }));
    const [benchmark, setBenchmark] = useState("GBP");
    const [cardLifestyles, setCardLifestyles] = useState<("Budget" | "Balanced" | "Luxury")[]>(["Balanced", "Balanced", "Balanced"]);

    const [isUnlocked, setIsUnlocked] = useState(false);
    const [aiBriefing, setAiBriefing] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const comparisonCanvasRef = useRef<HTMLDivElement>(null);

    const handleExportImage = async () => {
        if (!comparisonCanvasRef.current) return;
        setIsExporting(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(comparisonCanvasRef.current, {
                background: '#020617',
                backgroundColor: '#020617',
                scale: 2, // 2x high-resolution crisp retina capture
                useCORS: true,
                logging: false,
                scrollX: 0,
                scrollY: 0,
            } as any);
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().split('T')[0];
            link.download = `Leopardfish-Compare-Matrix-${timestamp}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Failed to export comparison image:', err);
        } finally {
            setIsExporting(false);
        }
    };

    const hasCountedInitialRef = useRef(false);

    // Initial 3 schools consumption on first load
    useEffect(() => {
        if (!hasCountedInitialRef.current && user && firestore && teacherProfile && !isPro) {
            const activeCount = selectedIds.filter(Boolean).length;
            if (activeCount > 0) {
                hasCountedInitialRef.current = true;
                const teacherDoc = doc(firestore, 'teachers', user.uid);
                updateDoc(teacherDoc, {
                    evaluations_used: increment(activeCount),
                    daily_evaluations_used: increment(activeCount),
                }).catch(err => console.warn('Could not increment decide initial load evaluations:', err));
            }
        }
    }, [user, firestore, teacherProfile, selectedIds, isPro]);

    // 🎯 RE-CALCULATION TRIGGER (Reacts to ColData / school selection arrival)
    useEffect(() => {
        if (schools.length === 0 || colData.length === 0 || !mounted) return;

        let changed = false;
        const nextSalaries = [...netSalaries];
        const nextCountries = [...selectedCountries];
        const nextManual = [...manualSalaries];

        selectedIds.forEach((id, index) => {
            if (!id) return;

            const school = schools.find((s: any) => s.id === id);
            if (!school) return;

            const sCity = String(getSchoolField(school, ['city', 'town', 'location']) || '');
            const sCountry = String(getSchoolField(school, ['country', 'region']) || '');
            const col = findCostOfLiving(sCity, sCountry, colData);

            const cCode = getCurrencyForCity(sCity, sCountry, col?.currencyCode);

            const localSalary = getLocalSalaryForSchool(school, cCode, currentRates);
            const currentVal = nextSalaries[index];
            const isZeroOrInvalid = !currentVal || currentVal === "0" || currentVal === "0.00" || parseFloat(currentVal) === 0;

            if (isZeroOrInvalid || (!manualSalaries[index] && currentVal !== localSalary)) {
                nextSalaries[index] = localSalary;
                if (isZeroOrInvalid) {
                    nextManual[index] = false;
                }
                changed = true;
            }
            if (nextCountries[index] !== school.country) {
                nextCountries[index] = school.country;
                changed = true;
            }
        });

        if (changed) {
            setNetSalaries(nextSalaries);
            setSelectedCountries(nextCountries);
            setManualSalaries(nextManual);
        }
    }, [schools, colData, selectedIds, manualSalaries, netSalaries, mounted, currentRates]);

    useEffect(() => { setMounted(true); }, []);

    const availableCountries = useMemo(() => (!schools ? [] : Array.from(new Set(schools.map((s: any) => s.country))).filter(Boolean).sort()), [schools]);

    // --- WORKSPACE LOGIC (Memory + Dubai Shift) ---
    useEffect(() => {
        if (mounted && (schools?.length ?? 0) > 0 && colData) {
            const urlIds = searchParams.get('ids')?.split(',').filter(Boolean) || [];
            const savedIds = JSON.parse(localStorage.getItem('lf_ids_v15') || '["", "", ""]');

            let finalIds = [...savedIds];
            if (urlIds.length > 0) {
                const uniqueNew = urlIds.filter(id => !savedIds.includes(id));
                finalIds = [...uniqueNew, ...savedIds].slice(0, 3);

                // 🕵️ RIVAL AUTO-LOAD: If only one target provided, find a rival in the same city
                if (urlIds.length === 1) {
                    const primary = schools.find((s: any) => s.id === urlIds[0]);
                    if (primary) {
                        const rival = schools.find((s: any) => s.city === primary.city && s.id !== primary.id);
                        if (rival && !finalIds.includes(rival.id)) {
                            finalIds[1] = rival.id;
                        }
                    }
                }
            }

            setSelectedIds(finalIds);
            setSelectedCountries(finalIds.map(id => schools.find((s: any) => s.id === id)?.country || ''));

            const savedNet = JSON.parse(localStorage.getItem('lf_net_v15') || '["", "", ""]');
            const savedManual = JSON.parse(localStorage.getItem('lf_manual_v15') || '[false, false, false]');
            const savedAdj = localStorage.getItem('lf_adj_v15');
            const savedFam = localStorage.getItem('lf_fam_v15');

            if (savedFam) {
                const matched = getProfileByLabel(savedFam);
                setFamilyStatus(matched.value);
            }
            if (savedAdj) setAdjustments(JSON.parse(savedAdj));

            const finalSalaries = [...savedNet];
            const finalManual = [...savedManual];

            finalIds.forEach((id, idx) => {
                const isZero = !finalSalaries[idx] || finalSalaries[idx] === "0" || parseFloat(finalSalaries[idx]) === 0;
                if (isZero) {
                    finalManual[idx] = false;
                }
                if (id && !finalManual[idx]) {
                    const s = schools.find((item: any) => item.id === id);
                    if (!s) return;
                    const sCity = String(getSchoolField(s, ['city', 'town', 'location']) || '');
                    const sCountry = String(getSchoolField(s, ['country', 'region']) || '');
                    const col = findCostOfLiving(sCity, sCountry, colData);
                    const cCode = getCurrencyForCity(sCity, sCountry, col?.currencyCode);

                    finalSalaries[idx] = getLocalSalaryForSchool(s, cCode, currentRates);
                }
            });

            setManualSalaries(finalManual);
            setNetSalaries(finalSalaries);
        }
    }, [mounted, schools, colData, searchParams, currentRates]);

    useEffect(() => {
        if (mounted && selectedIds.some(id => id !== '')) {
            localStorage.setItem('lf_net_v15', JSON.stringify(netSalaries));
            localStorage.setItem('lf_manual_v15', JSON.stringify(manualSalaries));
            localStorage.setItem('lf_adj_v15', JSON.stringify(adjustments));
            localStorage.setItem('lf_fam_v15', familyStatus);
            localStorage.setItem('lf_ids_v15', JSON.stringify(selectedIds));
        }
    }, [netSalaries, manualSalaries, adjustments, familyStatus, selectedIds, mounted]);

    const handleSchoolSelect = (val: string, index: number) => {
        if (!val || val === selectedIds[index]) return;

        if (isOverLimit) {
            window.dispatchEvent(new CustomEvent('lfi:open-intel-modal'));
            return;
        }

        const nextIds = [...selectedIds]; nextIds[index] = val; setSelectedIds(nextIds);

        // Deduct 1 point per school load/swap
        if (user && firestore && !isPro) {
            const teacherDoc = doc(firestore, 'teachers', user.uid);
            updateDoc(teacherDoc, {
                evaluations_used: increment(1),
                daily_evaluations_used: increment(1),
            }).catch(err => console.warn('Could not increment decide school selection evaluations:', err));
        }

        const school = schools?.find((s: any) => s.id === val);
        if (school) {
            const sCity = String(getSchoolField(school, ['city', 'town', 'location']) || '');
            const sCountry = String(getSchoolField(school, ['country', 'region']) || '');
            const col = findCostOfLiving(sCity, sCountry, colData);
            const cCode = getCurrencyForCity(sCity, sCountry, col?.currencyCode);

            // 🎯 MEDIAN SALARY LOGIC (Midpoint of Range)
            // Reset manual flag on new selection to allow median auto-fill
            const nextM = [...manualSalaries];
            nextM[index] = false;
            setManualSalaries(nextM);

            const nextSalaries = [...netSalaries];
            nextSalaries[index] = getLocalSalaryForSchool(school, cCode, currentRates);
            setNetSalaries(nextSalaries);

            const nextCountries = [...selectedCountries]; nextCountries[index] = school.country; setSelectedCountries(nextCountries);
        }
        setIsUnlocked(false); // Relock on school change
    };

    const handleUnlockIntelligence = async () => {
        const activeData = shootoutMatrix.filter((d): d is NonNullable<typeof d> => d !== null);
        if (activeData.length < 2) return;

        setIsGenerating(true);
        try {
            const briefing = await generateDecideBriefing({
                familyStatus,
                benchmarkCurrency: benchmark,
                topPickId,
                schools: activeData.map(d => ({
                    id: d.school.id,
                    name: d.school.schoolname,
                    country: d.school.country,
                    city: d.school.city,
                    salary: `${d.currency} ${Math.round(d.totalLocalIn).toLocaleString()}`,
                    surplus: `${d.currency} ${Math.round(d.surplusLocal).toLocaleString()}`,
                    savingsRate: d.savingsRate,
                    workload: d.workload,
                    curriculum: d.school.curriculum || "International",
                    academicScore: d.schoolScore,
                    housing: d.school.housingprovision || "Standard",
                    matchScore: d.matchPercentage,
                }))
            });
            setAiBriefing(briefing);
            setIsUnlocked(true);

            // 🛰️ ANALYTICS UPLINK: Increment comparison counter via Server Action
            logTelemetryEvent('comparison_made', {
                benchmarkCurrency: benchmark,
                familyStatus,
                user_email: user?.email
            });
        } catch (e) {
            console.error("AI Briefing failed:", e);
        } finally {
            setIsGenerating(false);
        }
    };

    const shootoutMatrix = useMemo(() => {
        if (!schools || !colData) return [];

        // 🛠️ INTELLIGENT SCALING UTILITY
        const getVal = (data: any, key: string, mult: number) => {
            if (!data) return 0;
            if (typeof data === 'object') {
                if (data[key]) return parseFloat(data[key]) || 0;
                return (parseFloat(data.single || data.base || 0) || 0) * mult;
            }
            return (parseFloat(data) || 0) * mult;
        };

        return selectedIds.map((id, index) => {
            const school = schools.find((s: any) => s?.id === id);
            if (!school) return null;

            // 🛡️ REGIONAL AVERAGE FALLBACK
            const sCity = String(getSchoolField(school, ['city', 'town', 'location']) || '').toLowerCase().trim();
            const sCountry = canonicalCountry(String(getSchoolField(school, ['country', 'region']) || ''));

            let col = findCostOfLiving(sCity, sCountry, colData);
            if (!col && sCity) col = colData.find((c: any) => normalize(c.city || c.city_name) === "regional average" && normalize(c.country || c.country_name) === normalize(sCountry));

            const currency = getCurrencyForCity(sCity, sCountry, col?.currencyCode);
            const rate = currentRates[currency] || 1.0;
            const salaryIn = parseFloat(netSalaries[index]) || 0;
            const bonusKey = String(getSchoolField(school, ['country', 'region']) || '').toLowerCase();
            const bonusPct = getBonusPctForCountry(bonusKey);
            const bonusAmount = salaryIn * bonusPct;
            const otherIncome = parseFloat(adjustments[index].other) || 0;
            const totalLocalIn = salaryIn + bonusAmount + otherIncome;

            // 🏠 DYNAMIC HOUSING ENGINE
            const provision = String(getSchoolField(school, ['housingprovision', 'housing', 'accommodation']) || '');
            const profile = getProfileByLabel(familyStatus);
            const pKey = profile.pKey;
            const scalar = profile.scalar;
            const personCount = profile.personCount;

            const { rentWeight, diningWeight } = getZoneLocationWeights(school);

            const rentKey = pKey === 'single' ? 'rent1br' : ((pKey === 'family2Children' || pKey === 'family3PlusChildren') ? 'rent3br' : 'rent2br');
            const rawRentUSD = parseFloat(getCOLField(col, [rentKey]) || getCOLField(col, ['rent1br']) || "1450");

            let finalRentUSD = rawRentUSD * rentWeight;
            let housingNote = "Housing is not included in this package";
            if (isHousingProvided(provision, school?.intel?.housing?.provided)) {
                finalRentUSD = 0;
                housingNote = "Housing provided by school";
            } else if (provision.toLowerCase().includes("allowance")) {
                housingNote = "Housing allowance is included in the salary shown";
            } else if (provision.toLowerCase().includes("subsidised")) {
                finalRentUSD = rawRentUSD * 0.5 * rentWeight;
                housingNote = "Subsidised housing applied";
            }

            // 📊 GRANULAR COST SCALING
            const mode = cardLifestyles[index] || "Balanced";
            const rentMult = mode === "Budget" ? 0.8 : (mode === "Luxury" ? 1.3 : 1.0);
            if (finalRentUSD > 0) finalRentUSD *= rentMult;

            const rentLocal = finalRentUSD * rate;
            const groceryMult = mode === "Budget" ? 0.9 : (mode === "Luxury" ? 1.1 : 1.0);
            const groceryLocal = getVal(getCOLField(col, ['groceries', 'food', 'groceriesIndex']), pKey, scalar) * rate * groceryMult;
            const utilityLocal = getVal(getCOLField(col, ['utilities', 'bills', 'utilitiesMonthly']), pKey, scalar * 0.8) * rate;
            const connectivityLocal = (getVal(getCOLField(col, ['internet', 'net', 'internetMonthly']), pKey, 1) + (getVal(getCOLField(col, ['mobilePhone', 'mobile', 'sim']), pKey, 1) * personCount)) * rate;

            // 🛰️ NEW TRANSPORT INTEL REDIRECTION
            const slugify = (str: string) => (str || "")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/[\s-]+/g, '-')
                .replace(/^-+|-+$/g, '');

            const countrySlug = slugify(sCountry);
            const citySlug = slugify(sCity);
            const expectedId = citySlug ? `${countrySlug}-${citySlug}` : countrySlug;

            let tIntel = transportIntel?.find((t: any) => t.id === expectedId);
            if (!tIntel && transportIntel) {
                tIntel = transportIntel.find((t: any) => t.id === countrySlug);
            }
            if (!tIntel && transportIntel) {
                tIntel = transportIntel.find((t: any) => t.id.startsWith(countrySlug + '-'));
            }

            const transportKey = pKey;
            const transportMap = tIntel?.publicTransport || col?.transport?.publicTransport || col?.publicTransport || col?.transport;
            const transportVal = (typeof transportMap === 'object' && transportMap !== null) ? (transportMap[transportKey] || 0) : (parseFloat(String(transportMap)) || 0);
            const transportLocal = transportVal * rate;

            const lifestyleMult = mode === "Budget" ? 0.6 : (mode === "Luxury" ? 1.8 : 1.0);
            const socialLocal = getVal(getCOLField(col, ['diningSocial', 'social', 'dining']), pKey, scalar) * rate * lifestyleMult * diningWeight;
            const manualLocal = parseFloat(adjustments[index].home) || 0;

            const totalLocalCost = rentLocal + groceryLocal + utilityLocal + connectivityLocal + transportLocal + socialLocal + manualLocal;
            const surplusLocal = totalLocalIn - totalLocalCost;
            const workload = calculateWorkload(school);
            const rawSafety = parseFloat(String(getSchoolField(school, ['citysafety', 'safety']) || "7.2")) * 10;

            const healthVal = String(getSchoolField(school, ['healthcoverage', 'healthcare', 'medical']) || school.healthcoverage || "").toLowerCase();
            const flightVal = String(getSchoolField(school, ['travelBenefit', 'annualflights', 'flights']) || school.travelBenefit || "").toLowerCase();
            const tuitionVal = String(getSchoolField(school, ['tuitionBenefit', 'tuition', 'education']) || school.tuitionBenefit || "").toLowerCase();

            let benefitsBonus = 0;
            if (healthVal.includes('full') || healthVal.includes('comprehensive') || healthVal.includes('private') || healthVal.includes('family') || healthVal.includes('provided')) benefitsBonus += 2;
            if (flightVal.includes('annual') || flightVal.includes('school-funded') || flightVal.includes('flights') || flightVal.includes('provided')) benefitsBonus += 2;
            if (tuitionVal.includes('100%') || tuitionVal.includes('full') || tuitionVal.includes('remission') || tuitionVal.includes('discount')) benefitsBonus += 2;

            const riskTier = getMacroRiskTier(currency);
            const salaryRawStr = String(school?.salaryRange || school?.salary || "").toLowerCase();
            const isUsdPeggedContract = salaryRawStr.includes("usd") || salaryRawStr.includes("peg") || String(provision).toLowerCase().includes("usd");
            
            // Currency volatility risk penalty: if local currency is Tier 3 (high inflation) and contract is NOT USD-pegged, reduce financial weight
            const currencyRiskFactor = (riskTier === 3 && !isUsdPeggedContract) ? 0.70 : 1.0;

            const finW = ((surplusLocal / rate / 2500 * 100 + 35) * 0.4) * currencyRiskFactor;
            const careerW = parseFloat(String(getSchoolField(school, ['academicscore', 'score']) || "7.5")) * 10 * 0.3;
            const lifestyleW = (rawSafety * 0.2) - (workload > 50 ? (workload - 50) * 2 : 0);
            const workW = (100 - workload) * 0.1;

            const matchScore = Math.round(Math.max(15, Math.min(99, finW + careerW + lifestyleW + workW + benefitsBonus)));

            return {
                school, surplusLocal, totalLocalIn, totalLocalCost, currency, rate, matchPercentage: matchScore, workload, housingNote, provision,
                salaryIn, bonusPct, bonusAmount, otherIncome,
                countryScore: (rawSafety / 10).toFixed(1), schoolScore: (careerW / 3).toFixed(1),
                surplusUSD: surplusLocal / rate, savingsRate: totalLocalIn > 0 ? Math.round((surplusLocal / totalLocalIn) * 100) : 0,
                surplusBenchmark: (surplusLocal / rate) * (currentRates[benchmark] || (benchmark === 'EUR' ? 0.93 : benchmark === 'USD' ? 1.0 : 0.79)),
                savings2Year: surplusLocal * 24,
                costs: {
                    rent: rentLocal,
                    groceries: groceryLocal,
                    utilities: utilityLocal,
                    connectivity: connectivityLocal,
                    transport: transportLocal,
                    social: socialLocal
                },
                benefits: {
                    flights: getSchoolField(school, ['travelBenefit', 'annualflights', 'flights']) || "Annual Flights",
                    healthcare: getSchoolField(school, ['healthcoverage', 'healthcare', 'medical']) || "Private Health Cover",
                    tuition: getSchoolField(school, ['tuitionBenefit', 'tuition', 'educationAllowance']) || "Tuition Support",
                    gratuity: getSchoolField(school, ['endofservicegratuity', 'gratuity', 'bonus']) || "Statutory"
                },
                purchasingPower: col?.localPurchasingPowerIndex || "N/A"
            };
        });
    }, [selectedIds, schools, colData, netSalaries, adjustments, familyStatus, benchmark, cardLifestyles, currentRates]);

    const ranked = useMemo(() => shootoutMatrix.filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => b.matchPercentage - a.matchPercentage), [shootoutMatrix]);
    const topPickId = ranked[0]?.school.id;
    const detailedConclusion = useMemo(() => generateDetailedConclusion(ranked), [ranked]);

    const maxIncomeSubLines = useMemo(() => {
        return Math.max(0, ...shootoutMatrix.map(d => {
            if (!d) return 0;
            let count = 0;
            if (d.bonusPct > 0) count++;
            if (d.otherIncome !== 0) count++;
            return count;
        }));
    }, [shootoutMatrix]);

    if (!mounted || apiLoading) return <div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-[#d95f02] size-10" /></div>;

    if (!user) {
        return (
            <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-6 md:p-12 selection:bg-[#d95f02] flex items-center justify-center">
                <div className="max-w-xl w-full text-center space-y-6 bg-[#0b1224] border border-amber-500/30 p-8 md:p-12 rounded-sm shadow-2xl relative">
                    <div className="size-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-400">
                        <Lock className="size-8" />
                    </div>
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-black uppercase tracking-widest">
                            🔒 GUEST PREVIEW MODE
                        </div>
                        <h2 className="text-3xl font-black uppercase tracking-tight text-white italic">
                            Compare & Decide Multi-Offer Matrix
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                            Sign up free with your verified international teaching background to compare side-by-side packages, surplus potential, and flight/housing benefits across up to 3 schools with your 25 daily evaluations.
                        </p>
                    </div>
                    <div className="pt-2">
                        <Link
                            href="/signup"
                            className="inline-flex items-center justify-center gap-2 py-3.5 px-8 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white font-black uppercase text-xs tracking-wider rounded-sm shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            <Zap className="size-4" />
                            Claim 25 Free Evaluations & Unlock Compare →
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-6 md:p-8 selection:bg-[#d95f02]">
            <div className="max-w-7xl mx-auto space-y-4">

                <header className="mb-4 border-b border-white/5 pb-3">
                    {/* ROW 1: Title + Controls */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                            <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] font-black text-[#007FFF] uppercase tracking-[0.2em] hover:text-white transition-colors mb-1"><ArrowLeft className="size-3" /> Back</button>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-[#d95f02] italic uppercase leading-none">Compare & Decide</h1>
                            <p className="mt-2 text-xs text-slate-400 font-medium max-w-xl">
                                Currencies are standardised to allow international comparison. For Local currency analysis please see the <span className="cursor-pointer text-[#007FFF] hover:underline" onClick={() => router.push('/financial-forecaster')}>Evaluate a School</span> page.
                            </p>
                        </div>

                        <div className="flex flex-col md:flex-row items-stretch gap-2 w-full md:w-auto">
                            {/* 👥 HOUSEHOLD */}
                            <div className="py-1 px-3 bg-[#d95f02]/5 border border-[#d95f02]/30 rounded-sm flex items-center gap-3 h-[52px]">
                                <div className="size-7 bg-[#d95f02]/10 rounded-full flex items-center justify-center border border-[#d95f02]/20 shrink-0">
                                    <Users className="size-3.5 text-[#d95f02]" />
                                </div>
                                <div className="flex flex-col justify-center min-w-[140px]">
                                    <Label className="text-[8px] font-black uppercase text-slate-500 tracking-[0.1em] italic leading-none mb-0.5">Household</Label>
                                    <Select value={familyStatus} onValueChange={setFamilyStatus}>
                                        <SelectTrigger className="bg-transparent border-none h-4 text-white font-black text-[13px] focus:ring-0 p-0 w-full italic leading-none"><SelectValue placeholder="Status" /></SelectTrigger>
                                        <SelectContent className="bg-[#1f2937] border-white/10 text-white font-bold text-[11px]">{FAMILY_PROFILES.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* 💱 BENCHMARK CURRENCY */}
                            <div className="py-1 px-3 bg-white/[0.03] border border-white/10 rounded-sm flex items-center gap-3 h-[52px]">
                                <div className="flex flex-col justify-center">
                                    <Label className="text-[8px] font-black uppercase text-slate-500 tracking-[0.1em] italic leading-none mb-1.5">Benchmark</Label>
                                    <div className="flex bg-black/40 rounded-sm p-0.5 border border-white/5">
                                        {(['GBP', 'USD', 'EUR'] as const).map((cur) => (
                                            <button
                                                key={cur}
                                                onClick={() => setBenchmark(cur)}
                                                className={cn(
                                                    "px-4 py-1 text-[10px] font-black rounded-sm transition-all uppercase italic",
                                                    benchmark === cur ? "bg-[#007FFF] text-white shadow-lg" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                                                )}
                                            >
                                                {cur}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 📸 EXPORT IMAGE BUTTON */}
                            <button
                                type="button"
                                onClick={handleExportImage}
                                disabled={isExporting}
                                className="py-1 px-4 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 hover:border-teal-500/50 text-teal-300 rounded-sm flex items-center justify-center gap-2 h-[52px] font-black text-[11px] uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                                title="Download clean high-res PNG of this 3-column analysis"
                            >
                                {isExporting ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin text-teal-400" />
                                        <span>Exporting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Camera className="size-4 text-teal-400" />
                                        <span>📸 Export Image</span>
                                    </>
                                )}
                            </button>

                        </div>
                    </div>


                </header>

                {/* 🎨 COMPARISON CANVAS (Target for Image Export & Screenshots) */}
                <div ref={comparisonCanvasRef} className="space-y-4 pt-1 bg-[#020617] p-2 sm:p-3 rounded-sm">
                    {/* ⚡ IN-CANVAS BRAND WATERMARK (Renders in all screenshots and exported images) */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#0b1224] border border-white/10 rounded-sm shadow-md">
                        <div className="flex items-center gap-2.5">
                            <div className="size-6 bg-[#d95f02] rounded-sm flex items-center justify-center font-black text-white text-xs shadow-sm shrink-0">
                                ⚡
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black tracking-wider text-white uppercase">LEOPARDFISH INTEL</span>
                                <span className="text-slate-600 font-normal">|</span>
                                <span className="text-xs font-black tracking-wider text-[#d95f02] uppercase">COMPARE &amp; DECIDE</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-400">
                            <span>Benchmark: <strong className="text-teal-400 font-mono">{benchmark}</strong></span>
                            <span className="text-slate-700">•</span>
                            <span>Household: <strong className="text-slate-200">{FAMILY_PROFILES.find(p => p.value === familyStatus)?.label || familyStatus}</strong></span>
                            <span className="text-slate-700 hidden sm:inline">•</span>
                            <span className="text-slate-400 font-mono hidden sm:inline">leopardfishintel.com</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="space-y-3 bg-[#0b1224]/80 p-3 border border-[#007FFF]/40 rounded-sm shadow-2xl flex flex-col transition-all hover:border-[#007FFF]/60">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1"><Label className="text-[10px] font-black text-slate-500 flex items-center gap-1.5 uppercase tracking-widest"><Globe2 className="size-3 text-[#007FFF]" /> Country</Label>
                                    <Select value={selectedCountries[i]} onValueChange={(val) => { const nC = [...selectedCountries]; nC[i] = val; setSelectedCountries(nC); }}>
                                        <SelectTrigger className="bg-black/40 border-white/10 h-8 text-white font-black text-[11px]"><SelectValue placeholder="Location" /></SelectTrigger>
                                        <SelectContent className="bg-[#1f2937] border-white/10 text-white font-bold text-[11px]">{availableCountries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1"><Label className="text-[10px] font-black text-slate-500 flex items-center gap-1.5 uppercase tracking-widest"><Target className="size-3 text-[#d95f02]" /> Target</Label>
                                    <Select disabled={!selectedCountries[i]} value={selectedIds[i]} onValueChange={(val) => handleSchoolSelect(val, i)}>
                                        <SelectTrigger className="bg-black/40 border-white/10 h-8 text-white font-black text-[11px]"><SelectValue placeholder="Institution" /></SelectTrigger>
                                        <SelectContent className="bg-[#1f2937] border-white/10 text-white font-bold text-[11px]">{(schools || []).filter((s: any) => s.country === selectedCountries[i]).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.schoolname}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3 h-9">
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Label className="text-[11px] font-black text-slate-400 italic tracking-tighter leading-none">
                                        Monthly income ({shootoutMatrix[i]?.currency || 'Local'})
                                    </Label>
                                    {selectedIds[i] && (
                                        <Tooltip text={(() => {
                                            const school = schools?.find((s: any) => s.id === selectedIds[i]);
                                            const bonusKey = String(getSchoolField(school, ['country', 'region']) || '').toLowerCase();
                                            const bonusPct = getBonusPctForCountry(bonusKey);
                                            let baseMsg = !manualSalaries[i] 
                                                ? "Estimated base median salary for this school." 
                                                : "User-overridden base salary.";
                                            if (bonusPct > 0) {
                                                baseMsg += ` Mandatory regional bonuses (+${(bonusPct * 100).toFixed(1)}%) are amortized into Total Monthly Income below.`;
                                            }
                                            return baseMsg;
                                        })()}>
                                            <Info className="size-3.5 cursor-help text-slate-400" />
                                        </Tooltip>
                                    )}
                                </div>
                                <Input
                                    type="number"
                                    value={netSalaries[i]}
                                    placeholder="0"
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const next = [...netSalaries]; next[i] = val; setNetSalaries(next);
                                        const isZero = !val || val === "0" || val === "0.00" || parseFloat(val) === 0;
                                        const nextM = [...manualSalaries]; nextM[i] = !isZero; setManualSalaries(nextM);
                                    }}
                                    className={cn(
                                        "bg-black/40 h-7 w-28 text-right font-black text-[12px] pr-2 rounded-sm",
                                        !manualSalaries[i] && selectedIds[i] ? "text-slate-400 border-white/5" : "text-white border-white/20",
                                        noSpinners
                                    )}
                                />
                            </div>
                        </div>
                    ))}
                </div>



                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    {shootoutMatrix.map((data, idx) => (
                        <div key={`card-${idx}`} className={cn(
                            "bg-[#0b1224]/50 border transition-all duration-500 p-6 space-y-3 flex flex-col relative min-h-[760px]",
                            "border-[#d95f02]/40",
                            data?.school.id === topPickId && "border-[#d95f02] ring-2 ring-[#d95f02] ring-offset-4 ring-offset-[#020617] shadow-[0_0_40px_rgba(249,115,22,0.1)]"
                        )}>
                            {data ? (
                                <>
                                    <div className="flex flex-col gap-1">
                                        <div className="h-9 flex items-center pt-1 overflow-hidden">
                                            <h2 className="text-base md:text-[21px] font-black text-[#d95f02] italic tracking-tighter leading-none whitespace-nowrap truncate w-full" title={data.school.schoolname}>
                                                {shortenSchoolName(data.school.schoolname)}
                                            </h2>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 mt-1 h-6">
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded-full border border-white/5 shrink-0"><Clock className="size-3 text-[#007FFF]" /> ~{data.workload} hrs/wk</span>
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded-full border border-white/5 shrink-0 max-w-[220px]" title={data.school.housingprovision}>
                                                <Home className="size-3 text-[#d95f02] shrink-0" />
                                                <span className="truncate">{shortenHousingProvision(data.school.housingprovision)}</span>
                                            </span>
                                        </div>
                                    </div>



                                    {/* ⚡ CARD-SPECIFIC LIFESTYLE SELECTOR */}
                                    <div className="mt-2 p-1.5 bg-white/5 border border-white/5 rounded-sm flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <Tooltip text="Stress test your savings. Switch between Budget (modest digs & supermarket basics), Balanced (comfy flat & Friday pub pints), or Luxury (swanky pad & dining out).">
                                                <span className="text-[9px] font-black uppercase text-slate-500 italic tracking-wider cursor-help border-b border-dotted border-slate-500 flex items-center gap-1">
                                                    Lifestyle Mode <Info className="size-2.5 text-sky-400 inline" />
                                                </span>
                                            </Tooltip>
                                        </div>
                                        <div className="flex bg-black/40 p-0.5 rounded-sm border border-white/5">
                                            {(['Budget', 'Balanced', 'Luxury'] as const).map((mode) => (
                                                <button
                                                    key={mode}
                                                    onClick={() => {
                                                        const next = [...cardLifestyles];
                                                        next[idx] = mode;
                                                        setCardLifestyles(next);
                                                    }}
                                                    className={cn(
                                                        "px-3 py-1 text-[8px] font-black uppercase tracking-wider transition-all italic",
                                                        cardLifestyles[idx] === mode ? "bg-slate-300 text-slate-950 shadow-[0_0_10px_rgba(148,163,184,0.1)]" : "text-slate-500 hover:text-slate-300"
                                                    )}
                                                >
                                                    {mode}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 🎯 CARD-SPECIFIC ADJUSTMENTS */}
                                    <div className="grid grid-cols-2 gap-2 mt-1 p-2 bg-white/[0.02] border border-white/5 rounded-sm">
                                        <div className="space-y-1">
                                            <Tooltip text="Including tutoring, investments, or allowances.">
                                                <Label className="text-[11px] font-black text-slate-500 italic tracking-tighter">Other income +</Label>
                                            </Tooltip>
                                            <Input 
                                                type="number" 
                                                value={adjustments[idx]?.other === '0' ? '' : (adjustments[idx]?.other || '')} 
                                                placeholder="0"
                                                onChange={(e) => { 
                                                    const next = [...adjustments]; 
                                                    next[idx] = { ...next[idx], other: e.target.value }; 
                                                    setAdjustments(next); 
                                                }} 
                                                className={cn("bg-black/40 border-white/5 h-8 text-right font-black text-slate-300 placeholder:text-slate-500 text-[13px]", noSpinners)} 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Tooltip text="Mortgages back home, student loans, or credit commitments.">
                                                <Label className="text-[11px] font-black text-slate-500 italic tracking-tighter">Home Commitments -</Label>
                                            </Tooltip>
                                            <Input 
                                                type="number" 
                                                value={adjustments[idx]?.home === '0' ? '' : (adjustments[idx]?.home || '')} 
                                                placeholder="0"
                                                onChange={(e) => { 
                                                    const next = [...adjustments]; 
                                                    next[idx] = { ...next[idx], home: e.target.value }; 
                                                    setAdjustments(next); 
                                                }} 
                                                className={cn("bg-black/40 border-white/5 h-8 text-right font-black text-slate-300 placeholder:text-slate-500 text-[13px]", noSpinners)} 
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-1.5 py-4 h-14 mt-2 border-y border-white/5">
                                        <ScoreBadge label="Match" score={`${data.matchPercentage}%`} color="#d95f02" />
                                        <ScoreBadge label="Safety" score={data.countryScore} color="#e2e8f0" />
                                        <ScoreBadge label="School" score={data.schoolScore} color="#e2e8f0" />
                                        <div className="flex flex-col items-center justify-center p-2 bg-white/5 border border-white/10 rounded-sm">
                                            <span className="text-[7px] font-black uppercase text-slate-500 mb-1 leading-none">Validation</span>
                                            {data.school.validated === "Verified" ? (
                                                <Tooltip text="School-Certified: The institution has formally ratified these contract provisions as accurate.">
                                                    <ShieldCheck className="size-[14px] text-emerald-400" strokeWidth={3} />
                                                </Tooltip>
                                            ) : (
                                                <Tooltip text="Leopardfish Indexed: This data represents our proprietary data for this school/region.">
                                                    <div className="px-1.5 bg-white/5 border border-white/10 rounded text-[9px] font-black text-slate-400 tracking-widest leading-relaxed">LFI</div>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </div>

                                    {/* 📊 GRANULAR COST BREAKDOWN */}
                                    <div className="space-y-1.5 p-4 bg-black/40 rounded-sm border border-white/5">
                                        <div className="flex justify-between items-center text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 border-b border-white/5 pb-2">
                                            <span>Financial Dossier</span>
                                            <span>{data.currency}</span>
                                        </div>
                                        <div className="space-y-1.5 text-[11px] font-bold">
                                            <div className={cn(
                                                "p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-sm mb-3 flex flex-col justify-between transition-all",
                                                maxIncomeSubLines === 1 && "min-h-[72px]",
                                                maxIncomeSubLines === 2 && "min-h-[92px]"
                                            )}>
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-emerald-400 uppercase text-[9px] font-black tracking-widest">Total Monthly Income</span>
                                                        {data.bonusPct > 0 && (
                                                            <Tooltip text={data.bonusPct >= 0.15
                                                                ? "Includes mandatory 13th and 14th month salary payments (amortized monthly: +16.6%)."
                                                                : `Includes 13th month salary payment (amortized monthly: +${(data.bonusPct * 100).toFixed(1)}%).`}>
                                                                <Info className="size-3 text-emerald-400/80 cursor-help hover:text-emerald-300 transition-colors" />
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                    <span className="text-emerald-400 text-base font-black italic">{data.currency} {Math.round(data.totalLocalIn).toLocaleString()}</span>
                                                </div>
                                                {(data.bonusPct > 0 || data.otherIncome !== 0) && (
                                                    <div className="pt-1.5 mt-1 border-t border-emerald-500/20 text-[10px] space-y-0.5 font-medium text-emerald-300/80">
                                                        {data.bonusPct > 0 && (
                                                            <div className="flex justify-between">
                                                                <span>Base ({data.currency} {Math.round(data.salaryIn).toLocaleString()}) + 13th/14th Month (+{(data.bonusPct * 100).toFixed(1)}%):</span>
                                                                <span className="font-bold">+{data.currency} {Math.round(data.bonusAmount).toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                        {data.otherIncome !== 0 && (
                                                            <div className="flex justify-between">
                                                                <span>{data.bonusPct === 0 ? `Base (${data.currency} ${Math.round(data.salaryIn).toLocaleString()}) + Other Income:` : "Other Income / Adjustments:"}</span>
                                                                <span className="font-bold">{data.otherIncome > 0 ? `+${data.currency} ${Math.round(data.otherIncome).toLocaleString()}` : `${data.currency} ${Math.round(data.otherIncome).toLocaleString()}`}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex justify-between text-slate-400 px-1">
                                                <Tooltip text={`Estimated rent based on specific household profile.${cardLifestyles[idx] !== "Balanced" ? ` (${cardLifestyles[idx]} Mode: ${cardLifestyles[idx] === "Budget" ? "-20%" : "+30%"})` : ""}`}>
                                                    <span className="cursor-help border-b border-dotted border-slate-500">Accommodation</span>
                                                </Tooltip>
                                                <span className="text-white font-black">{data.currency} {Math.round(data.costs.rent).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-400 px-1">
                                                <Tooltip text={`Estimated grocery and food budget.${cardLifestyles[idx] !== "Balanced" ? ` (${cardLifestyles[idx]} Mode: ${cardLifestyles[idx] === "Budget" ? "-10%" : "+10%"})` : ""}`}>
                                                    <span className="cursor-help border-b border-dotted border-slate-500">Groceries</span>
                                                </Tooltip>
                                                <span className="text-white font-black">{data.currency} {Math.round(data.costs.groceries).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-400 px-1"><span>Utilities & Net</span><span className="text-white font-black">{data.currency} {Math.round(data.costs.utilities + data.costs.connectivity).toLocaleString()}</span></div>
                                            <div className="flex justify-between text-slate-400 px-1"><span>Transport</span><span className="text-white font-black">{data.currency} {Math.round(data.costs.transport).toLocaleString()}</span></div>
                                            <div className="flex justify-between text-slate-400 px-1 border-b border-white/5 pb-2">
                                                <Tooltip text={`Discretionary leisure, dining, and socialising budget.${cardLifestyles[idx] !== "Balanced" ? ` (${cardLifestyles[idx]} Mode: ${cardLifestyles[idx] === "Budget" ? "-40%" : "+80%"})` : ""}`}>
                                                    <span className="cursor-help border-b border-dotted border-slate-500">Social & Other</span>
                                                </Tooltip>
                                                <span className="text-white font-black">{data.currency} {Math.round(data.costs.social).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="pt-2 flex justify-between items-center px-1">
                                            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Total Monthly Outgoings</span>
                                            <span className="text-sm font-black text-rose-400 tabular-nums">{data.currency} {Math.round(data.totalLocalCost).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-1 flex-grow">
                                        <div className="flex justify-between items-center px-1">
                                            <div className="space-y-0.5">
                                                <span className="text-[10px] font-bold text-[#007FFF] italic">Net monthly surplus</span>
                                                <p className="text-[9px] font-bold text-emerald-400/80 italic leading-none">{data.housingNote}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className={cn("text-sm font-black italic tracking-tighter tabular-nums whitespace-nowrap", data.surplusLocal > 0 ? "text-emerald-400" : "text-rose-400")}>
                                                    {data.currency} {Math.round(data.surplusLocal).toLocaleString()}
                                                </div>
                                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                                                    {benchmark} {Math.round(data.surplusBenchmark).toLocaleString()} /mo
                                                </div>
                                            </div>
                                        </div>

                                        {/* 💰 2-YEAR WEALTH POT */}
                                        <div className={cn("p-3.5 border rounded-sm flex flex-col gap-2 justify-center", data.savings2Year > 0 ? "bg-[#d95f02]/10 border-[#d95f02]/30" : "bg-rose-500/10 border-rose-500/50")}>
                                            <div className="flex items-center justify-between">
                                                <p className={cn("text-[12px] font-black uppercase tracking-wider italic leading-none", data.savings2Year > 0 ? "text-[#f5f5f5]" : "text-rose-500")} >2-Year Bankable Pot</p>
                                                <p className={cn("text-[14px] font-black italic tabular-nums leading-none", data.savings2Year > 0 ? "text-emerald-400" : "text-rose-500")}>{data.currency} {Math.round(data.savings2Year).toLocaleString()}</p>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <p className="text-[12px] font-bold text-slate-400 italic leading-none">Projected assets at contract end.</p>
                                                <p className="text-[12px] font-bold text-slate-400 leading-none">{benchmark} {Math.round((data.savings2Year / data.rate) * (currentRates[benchmark] || (benchmark === 'EUR' ? 0.93 : benchmark === 'USD' ? 1.0 : 0.79))).toLocaleString()}</p>
                                            </div>
                                        </div>

                                        {/* 💱 Currency stability advisory to guide teachers through local currency quirks */}
                                        {(() => {
                                            const riskLevel = getMacroRiskTier(data.currency);
                                            const infRate = getInflationRate(data.school?.country || data.school || data.currency);
                                            switch (riskLevel) {
                                                case 1:
                                                    return (
                                                        <div className="mt-2.5 flex justify-center items-center">
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-sky-500/10 border border-sky-500/20 rounded-full text-[9px] font-bold text-sky-400">
                                                                <Globe2 className="size-3 text-sky-400 shrink-0" />
                                                                <span>Free-Floating ({data.currency}) • Inflation {infRate}</span>
                                                            </span>
                                                        </div>
                                                    );
                                                case 2:
                                                    return (
                                                        <div className="mt-2.5 flex justify-center items-center">
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-bold text-emerald-400">
                                                                <Lock className="size-3 text-emerald-400 shrink-0" />
                                                                <span>USD Pegged ({data.currency}) • Inflation {infRate}</span>
                                                            </span>
                                                        </div>
                                                    );
                                                case 3:
                                                    return (
                                                        <div className="mt-2.5 flex justify-center items-center">
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/15 border border-rose-500/30 rounded-full text-[10px] font-black uppercase text-rose-400 tracking-wider shadow-sm animate-pulse">
                                                                <AlertTriangle className="size-3 text-rose-400 shrink-0" />
                                                                <span>Currency Alert — Inflation {infRate}</span>
                                                            </span>
                                                        </div>
                                                    );
                                                default:
                                                    return null;
                                            }
                                        })()}

                                        {isUnlocked && aiBriefing?.perSchoolBriefs?.[data.school.id] && (
                                            <div className="p-3 bg-sky-500/5 border border-sky-500/20 rounded-sm italic text-[11px] text-slate-300 leading-relaxed mt-2 select-text">
                                                <p className="text-[8px] font-black text-sky-400 uppercase tracking-widest mb-1 not-italic flex items-center gap-1">
                                                    <Zap className="size-2 text-[#d95f02]" /> Location Intelligence Brief
                                                </p>
                                                "{aiBriefing.perSchoolBriefs[data.school.id]}"
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="h-full min-h-[500px] flex flex-col items-center justify-center p-12 text-center space-y-4">
                                    <div className="p-4 bg-white/5 rounded-full border border-dashed border-white/10">
                                        <PlusCircle className="size-8 text-slate-700" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Target selection required</p>
                                        <p className="text-[10px] text-slate-500 italic leading-relaxed">Choose a location to begin your financial and lifestyle analysis.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* ⚖️ FINANCIAL MICRO-DISCLAIMER (COMPRESSED TO 2 LINES) */}
                <div className="mt-4 p-3 bg-white/[0.02] border border-white/5 rounded-sm text-[9.5px] sm:text-[10px] text-slate-400 italic leading-tight space-y-0.5">
                    <p className="text-left">*Indicative model based on OECD baselines and mid-payscale assumptions.</p>
                    <p className="flex items-center justify-between gap-1 text-left">
                        <span>Individual savings vary.</span>
                        <button
                            type="button"
                            onClick={() => openMethodologyModal()}
                            className="text-teal-400 hover:text-teal-300 hover:underline not-italic font-bold shrink-0 cursor-pointer bg-transparent border-0 p-0"
                        >
                            View Methodology &rarr;
                        </button>
                    </p>
                </div>



                {/* 🏆 STRATEGIC DECISION SUMMARY */}
                {ranked.length > 0 && (
                    <div className="mt-6 p-6 bg-[#0b1224]/90 border border-white/10 rounded-sm space-y-5 shadow-2xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                            <div className="flex items-center gap-2.5">
                                <Zap className="size-4 text-[#d95f02]" />
                                <h3 className="text-xs font-black uppercase tracking-[0.25em] text-[#d95f02]">
                                    Strategic Executive Summary
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-white/5 px-3 py-1.5 rounded-sm border border-white/10 flex items-center gap-1.5">
                                    <span>Top Choice:</span>
                                    <span className="text-emerald-400 font-black italic">{ranked[0].school.schoolname || ranked[0].school.schoolName || ranked[0].school.name}</span>
                                    <span className="text-[#d95f02] font-black italic">({ranked[0].matchPercentage}% Match)</span>
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {ranked.map((item, idx) => {
                                const isWinner = idx === 0;
                                const sName = item.school.schoolname || item.school.schoolName || item.school.name || "School";
                                const isProvided = isHousingProvided(item.provision, item.school?.intel?.housing?.provided);
                                const surplusFormatted = Math.round(item.surplusLocal).toLocaleString();
                                const academicRating = String(getSchoolField(item.school, ['academicscore', 'score']) || '8.5');
                                const safetyRating = item.countryScore || '7.5';

                                const cityLoc = String(item.school.city || item.school.location || item.school.country || "the region");
                                const curr = String(item.school.curriculum || "International").trim();
                                const workScore = item.workload <= 45 ? "manageable contact hours" : "balanced teaching workload";
                                const risk = getMacroRiskTier(item.currency);
                                const rawSal = String(item.school.salaryRange || item.school.salary || "").toLowerCase();
                                const isPegged = rawSal.includes("usd") || rawSal.includes("peg") || String(item.provision).toLowerCase().includes("usd");

                                const perksList: string[] = [];
                                if (isProvided) perksList.push("zero-cost school housing");
                                if (item.benefits?.healthcare && !String(item.benefits.healthcare).toLowerCase().includes("standard")) perksList.push("private medical cover");
                                if (item.benefits?.flights && !String(item.benefits.flights).toLowerCase().includes("check")) perksList.push("annual flight benefits");
                                if (item.benefits?.tuition && !String(item.benefits.tuition).toLowerCase().includes("check")) perksList.push("dependent tuition support");

                                const perksStr = perksList.length > 0 ? perksList.join(", ") : "competitive expat benefits";

                                let summaryText = "";
                                if (isWinner) {
                                    if (isProvided) {
                                        summaryText = `${sName} is our overall top recommendation for international educators. Having ${perksStr} completely eliminates relocation housing stress, enabling maximum disposable savings. Combined with supportive SLT leadership, ${workScore}, and a strong staffroom community, contract renewal rates here are exceptionally high.`;
                                    } else {
                                        summaryText = `${sName} stands out as our top recommendation overall. It delivers exceptional financial upside alongside a respected ${curr} academic reputation in ${cityLoc}. Teachers report excellent staffroom morale, supportive leadership continuity, and strong contract retention.`;
                                    }
                                } else if (isProvided) {
                                    summaryText = `A standout choice featuring ${perksStr}. Free accommodation makes settling into ${cityLoc} seamless, while a collaborative department structure and ${workScore} support high teacher retention and contract extensions.`;
                                } else if (parseFloat(academicRating) >= 8.8) {
                                    summaryText = `A prestigious ${curr} institution situated in ${cityLoc}. Highly regarded for student engagement, academic outcomes, and ${perksStr}, it offers an ideal environment for long-term professional growth and steady staff retention.`;
                                } else {
                                    summaryText = `A solid international option in ${cityLoc} offering ${perksStr}. Teachers benefit from a supportive staffroom culture, ${workScore}, and a very comfortable expat lifestyle with reliable contract stability.`;
                                }

                                const healthLabel = item.benefits.healthcare && String(item.benefits.healthcare).length < 22 ? String(item.benefits.healthcare) : "Private Medical";
                                const flightLabel = item.benefits.flights && String(item.benefits.flights).length < 22 ? String(item.benefits.flights) : "Annual Flights";
                                const tuitionLabel = item.benefits.tuition && String(item.benefits.tuition).length < 22 ? String(item.benefits.tuition) : "Tuition Support";

                                return (
                                    <div 
                                        key={item.school.id || idx}
                                        className={cn(
                                            "p-4 rounded-sm border flex flex-col justify-between transition-all relative overflow-hidden",
                                            isWinner 
                                                ? "bg-emerald-500/[0.04] border-emerald-500/30 shadow-lg shadow-emerald-950/20" 
                                                : "bg-white/[0.02] border-white/10 hover:border-white/15"
                                        )}
                                    >
                                        {/* Top Section */}
                                        <div className="space-y-2.5 flex-grow pb-4">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className={cn(
                                                    "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-sm border shrink-0",
                                                    isWinner 
                                                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" 
                                                        : "bg-white/5 text-slate-400 border-white/10"
                                                )}>
                                                    {isWinner ? "🏆 Best Choice" : `Option #${idx + 1}`}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {(() => {
                                                        const riskLevel = getMacroRiskTier(item.currency);
                                                        const infRate = getInflationRate(item.school?.country || item.school || item.currency);
                                                        if (riskLevel === 3) {
                                                            return (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/15 border border-rose-500/30 rounded-full text-[8px] font-black uppercase text-rose-400 tracking-wider animate-pulse">
                                                                    <AlertTriangle className="size-2.5 text-rose-400 shrink-0" />
                                                                    <span>Inflation {infRate}</span>
                                                                </span>
                                                            );
                                                        }
                                                        if (riskLevel === 2) {
                                                            return (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-sky-500/10 border border-sky-500/20 rounded-full text-[8px] font-bold text-sky-400">
                                                                    <Lock className="size-2 text-sky-400 shrink-0" />
                                                                    <span>USD Pegged ({infRate})</span>
                                                                </span>
                                                            );
                                                        }
                                                        return (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-full text-[8px] font-bold text-slate-400">
                                                                <Globe2 className="size-2 text-slate-400 shrink-0" />
                                                                <span>Inf {infRate}</span>
                                                            </span>
                                                        );
                                                    })()}
                                                    <span className={cn("text-xs font-black italic tracking-tight shrink-0", isWinner ? "text-emerald-400" : "text-slate-300")}>
                                                        {item.matchPercentage}% Match
                                                    </span>
                                                </div>
                                            </div>

                                            <h4 className={cn("text-sm font-black italic tracking-tight leading-none whitespace-nowrap truncate w-full", isWinner ? "text-white" : "text-slate-200")} title={sName}>
                                                {shortenSchoolName(sName)}
                                            </h4>

                                            <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                                <strong className={isWinner ? "text-emerald-400 font-bold" : "text-slate-200 font-bold"}>
                                                    {isWinner ? "Why it wins: " : "Why it works: "}
                                                </strong>
                                                {summaryText}
                                            </p>
                                        </div>

                                        {/* Pinned Bottom Container (Benefit Pills + Footer) */}
                                        <div className="mt-auto space-y-3">
                                            <div className="flex flex-wrap items-center justify-center gap-1.5 min-h-[26px]">
                                                <span className={cn(
                                                    "text-[9px] font-bold px-2 py-0.5 rounded-sm border",
                                                    isWinner ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-white/5 border-white/10 text-slate-300"
                                                )}>
                                                    {healthLabel}
                                                </span>
                                                <span className={cn(
                                                    "text-[9px] font-bold px-2 py-0.5 rounded-sm border",
                                                    isWinner ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-white/5 border-white/10 text-slate-300"
                                                )}>
                                                    {flightLabel}
                                                </span>
                                                {item.benefits.tuition && (
                                                    <span className={cn(
                                                        "text-[9px] font-bold px-2 py-0.5 rounded-sm border",
                                                        isWinner ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-white/5 border-white/10 text-slate-300"
                                                    )}>
                                                        {tuitionLabel}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                                                <span>
                                                    Surplus: <strong className={cn(
                                                        item.surplusLocal < 0 
                                                            ? "text-rose-400" 
                                                            : isWinner 
                                                                ? "text-emerald-400" 
                                                                : "text-slate-200"
                                                    )}>{item.currency} {surplusFormatted}</strong>
                                                </span>
                                                <span>
                                                    Housing: <strong className={cn(
                                                        isWinner 
                                                            ? (isProvided ? "text-emerald-400" : "text-emerald-300/80") 
                                                            : "text-slate-200"
                                                    )}>{isProvided ? `Provided (${item.currency} 0)` : "Allowance"}</strong>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
}



export default function DecidePage() {
    return <Suspense fallback={null}><DecideContent /></Suspense>;
}