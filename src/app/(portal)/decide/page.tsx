"use client";

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    MapPin, Loader2, ArrowLeft, TrendingUp, ShieldAlert, Target, Zap,
    BookOpen, Activity, Wallet, Receipt, Globe2, Users, AlertTriangle,
    ExternalLink, Clock, Home, GraduationCap, BarChart3, Info, Scale, PlusCircle,
    ShieldCheck, Fingerprint, Lock // 🛰️ Added Lock
} from 'lucide-react';
// 🛰️ Added useUser to the import
import { useFirestore, useCollection, useMemoFirebase, useUser, setDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, doc, increment } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip as RadixTooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { canonicalCountry, FAMILY_PROFILES, getProfileByLabel, getCOLField, findCostOfLiving, RATES as BASE_RATES, getMacroRiskTier } from '@/lib/calculations';

const RATES: Record<string, number> = {};
Object.keys(BASE_RATES).forEach(k => {
    RATES[k] = BASE_RATES[k] / (BASE_RATES.USD || 1.27);
});
RATES.USD = 1.0;

const getCurrencyForCity = (city: string, country: string, colCode?: string) => {
    const c = (city || "").toLowerCase();
    const co = (country || "").toLowerCase();
    if (colCode && colCode !== 'USD') return colCode.toUpperCase();
    if (c.includes("prague") || co.includes("czech")) return "CZK";
    if (c.includes("dubai") || c.includes("abu dhabi") || co.includes("emirates")) return "AED";
    if (c.includes("london") || co.includes("united kingdom")) return "GBP";
    if (co.includes("saudi")) return "SAR";
    if (c.includes("doha") || co.includes("qatar")) return "QAR";
    if (co.includes("hong kong")) return "HKD";
    if (co.includes("singapore")) return "SGD";
    if (co.includes("china")) return "CNY";
    if (co.includes("thailand")) return "THB";
    if (co.includes("malaysia")) return "MYR";
    return colCode?.toUpperCase() || "USD";
};




const HOUSEHOLD_OPTIONS = FAMILY_PROFILES.map(p => p.value);
const BONUS_REGISTRY: Record<string, number> = { "austria": 0.166, "germany": 0.083, "china": 0.083, "spain": 0.166, "japan": 0.166, "belgium": 0.166 };
const noSpinners = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
const normalize = (str: string) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, '').trim();

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
    const [adjustments, setAdjustments] = useState(Array(3).fill({ second: '0', other: '0', home: '0' }));
    const [benchmark, setBenchmark] = useState("GBP");
    const [cardLifestyles, setCardLifestyles] = useState<("Budget" | "Balanced" | "Luxury")[]>(["Balanced", "Balanced", "Balanced"]);

    const [isUnlocked, setIsUnlocked] = useState(false);
    const [aiBriefing, setAiBriefing] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // 🎯 RE-CALCULATION TRIGGER (Reacts to ColData arrival)
    useEffect(() => {
        if (schools.length === 0 || colData.length === 0 || !mounted) return;

        let changed = false;
        const nextSalaries = [...netSalaries];
        const nextCountries = [...selectedCountries];

        selectedIds.forEach((id, index) => {
            if (!id || manualSalaries[index]) return;

            const school = schools.find((s: any) => s.id === id);
            if (!school) return;

            const sCity = String(getSchoolField(school, ['city', 'town', 'location']) || '');
            const sCountry = String(getSchoolField(school, ['country', 'region']) || '');
            const col = findCostOfLiving(sCity, sCountry, colData);

            const cCode = getCurrencyForCity(sCity, sCountry, col?.currencyCode);
            const rate = currentRates[cCode] || 1.0;

            const cleanRange = (school.salaryRange || "").replace(/,/g, '').replace(/\.\d+/g, '');
            const range = cleanRange.match(/\d+/g);
            const usdMed = range ? (range.length > 1 ? (parseFloat(range[0]) + parseFloat(range[1])) / 2 : parseFloat(range[0])) : 4500;

            const localSalary = Math.round(usdMed * rate).toString();
            if (nextSalaries[index] !== localSalary) {
                nextSalaries[index] = localSalary;
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
        }
    }, [schools, colData, selectedIds, manualSalaries, mounted, currentRates]);

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
            setManualSalaries(savedManual);

            const finalSalaries = [...savedNet];
            finalIds.forEach((id, idx) => {
                if (id && !savedManual[idx]) {
                    const s = schools.find((item: any) => item.id === id);
                    if (!s) return;
                    const sCity = String(getSchoolField(s, ['city', 'town', 'location']) || '');
                    const sCountry = String(getSchoolField(s, ['country', 'region']) || '');
                    const col = findCostOfLiving(sCity, sCountry, colData);
                    const cCode = getCurrencyForCity(sCity, sCountry, col?.currencyCode);
                    const rate = currentRates[cCode] || 1.0;

                    const cleanRange = (s.salaryRange || "").replace(/,/g, '').replace(/\.\d+/g, '');
                    const range = cleanRange.match(/\d+/g);
                    const usdMed = range ? (range.length > 1 ? (parseFloat(range[0]) + parseFloat(range[1])) / 2 : parseFloat(range[0])) : 4500;

                    finalSalaries[idx] = Math.round(usdMed * rate).toString();
                }
            });
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
        const nextIds = [...selectedIds]; nextIds[index] = val; setSelectedIds(nextIds);
        const school = schools?.find((s: any) => s.id === val);
        if (school) {
            const sCity = String(getSchoolField(school, ['city', 'town', 'location']) || '');
            const sCountry = String(getSchoolField(school, ['country', 'region']) || '');
            const col = findCostOfLiving(sCity, sCountry, colData);
            const cCode = getCurrencyForCity(sCity, sCountry, col?.currencyCode);
            const rate = currentRates[cCode] || 1.0;

            // 🎯 MEDIAN SALARY LOGIC (Midpoint of Range)
            const cleanRange = (school.salaryRange || "").replace(/,/g, '').replace(/\.\d+/g, '');
            const range = cleanRange.match(/\d+/g);
            const usdMed = range ? (range.length > 1 ? (parseFloat(range[0]) + parseFloat(range[1])) / 2 : parseFloat(range[0])) : 4500;

            // Reset manual flag on new selection to allow median auto-fill
            const nextM = [...manualSalaries];
            nextM[index] = false;
            setManualSalaries(nextM);

            const nextSalaries = [...netSalaries];
            // Ensure we are actually multiplying by the rate for the correct currency
            nextSalaries[index] = Math.round(usdMed * rate).toString();
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
            const totalLocalIn = salaryIn + (salaryIn * (BONUS_REGISTRY[bonusKey] ?? 0)) + (parseFloat(adjustments[index].other) || 0);

            // 🏠 DYNAMIC HOUSING ENGINE
            const provision = String(getSchoolField(school, ['housingprovision', 'housing', 'accommodation']) || '').toLowerCase();
            const profile = getProfileByLabel(familyStatus);
            const pKey = profile.pKey;
            const scalar = profile.scalar;
            const personCount = profile.personCount;

            const rentKey = pKey === 'single' ? 'rent1br' : ((pKey === 'family2Children' || pKey === 'family3PlusChildren') ? 'rent3br' : 'rent2br');
            const rawRentUSD = parseFloat(getCOLField(col, [rentKey]) || getCOLField(col, ['rent1br']) || "1450");

            let finalRentUSD = rawRentUSD;
            let housingNote = "Housing is not included in this package";
            if (provision.includes("provided")) { finalRentUSD = 0; housingNote = "Housing provided by school"; }
            else if (provision.includes("subsidised")) { finalRentUSD = rawRentUSD * 0.5; housingNote = "Subsidised housing applied"; }

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
            const socialLocal = getVal(getCOLField(col, ['diningSocial', 'social', 'dining']), pKey, scalar) * rate * lifestyleMult;
            const manualLocal = parseFloat(adjustments[index].home) || 0;

            const totalLocalCost = rentLocal + groceryLocal + utilityLocal + connectivityLocal + transportLocal + socialLocal + manualLocal;
            const surplusLocal = totalLocalIn - totalLocalCost;
            const workload = calculateWorkload(school);
            const rawSafety = parseFloat(String(getSchoolField(school, ['citysafety', 'safety']) || "7.2")) * 10;

            const finW = (surplusLocal / rate / 2500 * 100 + 35) * 0.4;
            const careerW = parseFloat(String(getSchoolField(school, ['academicscore', 'score']) || "7.5")) * 10 * 0.3;
            const lifestyleW = (rawSafety * 0.2) - (workload > 50 ? (workload - 50) * 2 : 0);
            const workW = (100 - workload) * 0.1;

            const matchScore = Math.round(Math.max(15, Math.min(99, finW + careerW + lifestyleW + workW)));

            return {
                school, surplusLocal, totalLocalIn, totalLocalCost, currency, rate, matchPercentage: matchScore, workload, housingNote, provision,
                countryScore: (rawSafety / 10).toFixed(1), schoolScore: (careerW / 3).toFixed(1),
                surplusUSD: surplusLocal / rate, savingsRate: totalLocalIn > 0 ? Math.round((surplusLocal / totalLocalIn) * 100) : 0,
                surplusBenchmark: (surplusLocal / rate) * (currentRates[benchmark] || 0.79),
                savings3Year: surplusLocal * 36,
                costs: {
                    rent: rentLocal,
                    groceries: groceryLocal,
                    utilities: utilityLocal,
                    connectivity: connectivityLocal,
                    transport: transportLocal,
                    social: socialLocal
                },
                benefits: {
                    flights: getSchoolField(school, ['annualflights', 'flights']) || "Check Contract",
                    healthcare: getSchoolField(school, ['healthcare', 'medical']) || "Standard",
                    gratuity: getSchoolField(school, ['endofservicegratuity', 'gratuity', 'bonus']) || "Statutory"
                },
                purchasingPower: col?.localPurchasingPowerIndex || "N/A"
            };
        });
    }, [selectedIds, schools, colData, netSalaries, adjustments, familyStatus, benchmark, cardLifestyles, currentRates]);

    const ranked = useMemo(() => shootoutMatrix.filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => b.matchPercentage - a.matchPercentage), [shootoutMatrix]);
    const topPickId = ranked[0]?.school.id;
    const detailedConclusion = useMemo(() => generateDetailedConclusion(ranked), [ranked]);

    if (!mounted || apiLoading) return <div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-[#d95f02] size-10" /></div>;

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
                                        {(['GBP', 'USD'] as const).map((cur) => (
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

                        </div>
                    </div>


                </header>

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
                                        <Tooltip text={!manualSalaries[i] 
                                            ? "This is the estimated median salary for this school. You can override it by typing in a different amount." 
                                            : "You have overridden the estimated median salary. Clear this input to revert to the default median."}>
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
                                        const nextM = [...manualSalaries]; nextM[i] = val !== ""; setManualSalaries(nextM);
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
                                        <div className="h-[72px] flex items-start pt-1">
                                            <h2 className="text-[17px] md:text-[28px] font-black text-[#d95f02] italic tracking-tighter leading-tight line-clamp-2">{data.school.schoolname}</h2>
                                        </div>
                                        <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 mt-1 h-6">
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded-full border border-white/5"><Clock className="size-3 text-[#007FFF]" /> ~{data.workload} hrs/wk</span>
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded-full border border-white/5"><Home className="size-3 text-[#d95f02]" /> {data.school.housingprovision}</span>
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
                                                value={adjustments[idx].other} 
                                                placeholder="0"
                                                onChange={(e) => { 
                                                    const next = [...adjustments]; 
                                                    next[idx] = { ...next[idx], other: e.target.value }; 
                                                    setAdjustments(next); 
                                                }} 
                                                className={cn("bg-black/40 border-white/5 h-8 text-right font-black text-white text-[13px]", noSpinners)} 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Tooltip text="Mortgages back home, student loans, or credit commitments.">
                                                <Label className="text-[11px] font-black text-slate-500 italic tracking-tighter">Home Commitments -</Label>
                                            </Tooltip>
                                            <Input 
                                                type="number" 
                                                value={adjustments[idx].home} 
                                                placeholder="0"
                                                onChange={(e) => { 
                                                    const next = [...adjustments]; 
                                                    next[idx] = { ...next[idx], home: e.target.value }; 
                                                    setAdjustments(next); 
                                                }} 
                                                className={cn("bg-black/40 border-white/5 h-8 text-right font-black text-white text-[13px]", noSpinners)} 
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-1.5 py-4 h-14 mt-2 border-y border-white/5">
                                        <ScoreBadge label="Match" score={`${data.matchPercentage}%`} color="#d95f02" />
                                        <ScoreBadge label="Country" score={data.countryScore} color="#e2e8f0" />
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
                                            <div className="flex justify-between items-center p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-sm mb-3">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-emerald-400 uppercase text-[9px] font-black tracking-widest">Total Monthly Income</span>
                                                    {(() => {
                                                        const bonusKey = String(getSchoolField(data.school, ['country', 'region']) || '').toLowerCase();
                                                        const bonusPct = BONUS_REGISTRY[bonusKey] ?? 0;
                                                        if (bonusPct > 0) {
                                                            const tooltipText = bonusKey === 'austria' || bonusKey === 'spain' || bonusKey === 'japan' || bonusKey === 'belgium'
                                                                ? "Includes mandatory 13th and 14th month salary payments (amortized monthly: +16.6%)."
                                                                : `Includes 13th month salary payment (amortized monthly: +${(bonusPct * 100).toFixed(1)}%).`;
                                                            return (
                                                                <Tooltip text={tooltipText}>
                                                                    <Info className="size-3 text-emerald-400/80 cursor-help hover:text-emerald-300 transition-colors" />
                                                                </Tooltip>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                                <span className="text-emerald-400 text-base font-black italic">{Math.round(data.totalLocalIn).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-400 px-1">
                                                <Tooltip text={`Estimated rent based on specific household profile.${cardLifestyles[idx] !== "Balanced" ? ` (${cardLifestyles[idx]} Mode: ${cardLifestyles[idx] === "Budget" ? "-20%" : "+30%"})` : ""}`}>
                                                    <span className="cursor-help border-b border-dotted border-slate-500">Accommodation</span>
                                                </Tooltip>
                                                <span className="text-white font-black">{Math.round(data.costs.rent).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-400 px-1">
                                                <Tooltip text={`Estimated grocery and food budget.${cardLifestyles[idx] !== "Balanced" ? ` (${cardLifestyles[idx]} Mode: ${cardLifestyles[idx] === "Budget" ? "-10%" : "+10%"})` : ""}`}>
                                                    <span className="cursor-help border-b border-dotted border-slate-500">Groceries</span>
                                                </Tooltip>
                                                <span className="text-white font-black">{Math.round(data.costs.groceries).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-400 px-1"><span>Utilities & Net</span><span className="text-white font-black">{Math.round(data.costs.utilities + data.costs.connectivity).toLocaleString()}</span></div>
                                            <div className="flex justify-between text-slate-400 px-1"><span>Transport</span><span className="text-white font-black">{Math.round(data.costs.transport).toLocaleString()}</span></div>
                                            <div className="flex justify-between text-slate-400 px-1 border-b border-white/5 pb-2">
                                                <Tooltip text={`Discretionary leisure, dining, and socialising budget.${cardLifestyles[idx] !== "Balanced" ? ` (${cardLifestyles[idx]} Mode: ${cardLifestyles[idx] === "Budget" ? "-40%" : "+80%"})` : ""}`}>
                                                    <span className="cursor-help border-b border-dotted border-slate-500">Social & Other</span>
                                                </Tooltip>
                                                <span className="text-white font-black">{Math.round(data.costs.social).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="pt-2 flex justify-between items-center px-1">
                                            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Total Monthly Outgoings</span>
                                            <span className="text-sm font-black text-rose-400 tabular-nums">{Math.round(data.totalLocalCost).toLocaleString()}</span>
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

                                        {/* 💰 3-YEAR WEALTH POT */}
                                        <div className={cn("p-3.5 border rounded-sm flex flex-col gap-2 justify-center", data.savings3Year > 0 ? "bg-[#d95f02]/10 border-[#d95f02]/30" : "bg-rose-500/10 border-rose-500/50")}>
                                            <div className="flex items-center justify-between">
                                                <p className={cn("text-[12px] font-black uppercase tracking-wider italic leading-none", data.savings3Year > 0 ? "text-[#f5f5f5]" : "text-rose-500")} >3-Year Bankable Pot</p>
                                                <p className={cn("text-[14px] font-black italic tabular-nums leading-none", data.savings3Year > 0 ? "text-emerald-400" : "text-rose-500")}>{data.currency} {Math.round(data.savings3Year).toLocaleString()}</p>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <p className="text-[12px] font-bold text-slate-400 italic leading-none">Projected assets at contract end.</p>
                                                <p className="text-[12px] font-bold text-slate-400 leading-none">{benchmark} {Math.round((data.savings3Year / data.rate) * (currentRates[benchmark] || 0.79)).toLocaleString()}</p>
                                            </div>
                                        </div>

                                        {/* 💱 Currency stability advisory to guide teachers through local currency quirks */}
                                        {(() => {
                                            const riskLevel = getMacroRiskTier(data.currency);
                                            switch (riskLevel) {
                                                case 1:
                                                    return (
                                                        <p className="text-[11px] text-slate-300 font-medium leading-relaxed mt-1">
                                                            Note: {data.currency} is a free-floating currency. These estimates use live conversion rates. Your actual savings will shift slightly up or down with standard exchange rate changes.
                                                        </p>
                                                    );
                                                case 2:
                                                    return (
                                                        <p className="text-[11px] text-slate-300 font-medium leading-relaxed mt-1">
                                                            Note: {data.currency} is pegged to the US Dollar. Because this currency is locked to the USD, your savings will follow US exchange rate trends. If the Pound gets stronger, your converted savings total will shrink.
                                                        </p>
                                                    );
                                                case 3:
                                                    return (
                                                        <p className="text-[11px] text-rose-400/90 font-semibold leading-relaxed mt-1">
                                                            Note: {data.currency} is a highly volatile currency. Local currency contracts here are risky due to high inflation. To protect your savings, you should request a contract pegged to a stable currency like USD or EUR.
                                                        </p>
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

                {/* 🎯 Always Visible: Match % Explainer */}
                <div className="flex items-start gap-3 mt-6 p-4 bg-white/[0.02] border border-white/10 rounded-sm">
                    <Target className="size-4 text-[#d95f02] shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1.5">How the top pick is decided</p>
                        <p className="text-[12px] text-slate-100 font-semibold leading-normal">The winner is the highest overall Match %. Surplus, academic rep, city safety and workload are all weighted equally.</p>
                    </div>
                </div>

                {/* TOP PICK CTA — compact strip */}
                {!isUnlocked ? (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-4 p-4 bg-[#d95f02]/5 border border-dashed border-[#d95f02]/20 rounded-sm">
                        <p className="text-xs text-slate-400 font-bold">Ready for the deep dive? Access our custom location intelligence briefings for your chosen locations.</p>
                        <button
                            onClick={handleUnlockIntelligence}
                            disabled={isGenerating || ranked.length < 2}
                            className="shrink-0 px-6 py-3 border border-[#d95f02] bg-black text-[#f5f5f5] font-black normal-case tracking-wide text-sm hover:bg-[#d95f02] transition-all disabled:opacity-50 whitespace-nowrap"
                        >
                            {isGenerating ? <span className="flex items-center gap-2"><Loader2 className="animate-spin size-4" /> Compiling...</span> : 'Request Intelligence Briefing'}
                        </button>
                    </div>
                ) : (
                    <div className="lg:col-span-3 bg-[#d95f02]/5 border border-[#d95f02]/20 p-12 rounded-sm relative overflow-hidden flex flex-col items-center animate-in zoom-in-95 duration-700">
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.12] pointer-events-none select-none overflow-hidden z-0">
                            <span className="text-[60px] md:text-[80px] font-black tracking-[0.2em] rotate-[-20deg] whitespace-nowrap text-white text-center">leopardfish intel</span>
                        </div>
                        <div className="relative z-10 space-y-8 w-full max-w-5xl">
                            <div className="flex justify-between items-center">
                                <h3 className="text-[12px] font-black text-[#d95f02] uppercase tracking-[0.4em] flex items-center gap-2"><Zap className="size-4" /> Leopardfish intel conclusion</h3>
                                <button onClick={() => setIsUnlocked(false)} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">Relock Briefing</button>
                            </div>
                            <div className="text-[16px] font-medium italic tracking-tight text-slate-300 leading-relaxed space-y-6">
                                {aiBriefing?.conclusion.map((para: string, pIdx: number) => <p key={pIdx}>{para}</p>)}
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-sm">
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 italic">Strategic Pick</p>
                                    <p className="text-white font-bold">{aiBriefing?.topPickReason}</p>
                                </div>
                                <p className="not-italic font-bold text-slate-500 text-[11px] mt-6 tracking-widest uppercase pt-4 border-t border-white/5">Evaluation: March 2026</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const getSchoolField = (school: any, keys: string[]) => {
    if (!school) return null;
    const foundKey = Object.keys(school).find(k => keys.includes(k.toLowerCase().trim()));
    return foundKey ? school[foundKey] : null;
};

export default function DecidePage() {
    return <Suspense fallback={null}><DecideContent /></Suspense>;
}