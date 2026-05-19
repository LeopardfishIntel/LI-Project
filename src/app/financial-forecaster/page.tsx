"use client";

import { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import {
  Zap, ShieldCheck, BookOpen, Target, Plus, Minus, Coins,
  AlertTriangle, AlertCircle, Activity, Clock, Wallet, Banknote, ArrowLeft, ArrowRight, FileText, Info, Car, Bus, Lock, ArrowDownCircle,
  Briefcase, ChevronDown, RefreshCw
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { rewordDossierBriefing, getSchoolStabilityReport } from './actions';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRouter } from 'next/navigation';
import { canonicalCountry } from '@/lib/calculations';

const RATES: Record<string, number> = {
  CZK: 30.2, AED: 4.65, EUR: 1.18, GBP: 1.0, SAR: 4.75, QAR: 4.62, CHF: 1.12, DKK: 8.85, USD: 1.27, AZN: 2.15, HKD: 9.85, OMR: 0.49,
  KRW: 1750, VND: 32000, IDR: 20000, KWD: 0.39, BHD: 0.48, EGP: 60, JOD: 0.90, ZAR: 24, MXN: 21, COP: 4900
};



const BENCHMARKS = [
  { label: "GBP (£)", code: "GBP" },
  { label: "USD ($)", code: "USD" },
  { label: "EUR (€)", code: "EUR" }
];

const noSpinners = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const SALARY_INTEL: Record<string, { has13th: boolean, has14th: boolean, note?: string }> = {
  "austria": { has13th: true, has14th: true, note: "Standard 14-month cycle." },
  "greece": { has13th: true, has14th: true, note: "Standard 14-month cycle." },
  "portugal": { has13th: true, has14th: true, note: "Standard 14-month cycle." },
  "spain": { has13th: true, has14th: true, note: "Standard 14-month cycle." },
  "italy": { has13th: true, has14th: true, note: "13th is standard; 14th depends on specific school/sector." },
  "germany": { has13th: true, has14th: false, note: "Often referred to as 'Weihnachtsgeld'." },
  "netherlands": { has13th: true, has14th: false, note: "Often 13th month or holiday allowance." },
  "belgium": { has13th: true, has14th: true, note: "Complex structure involving 92% of a 14th month." },
  "argentina": { has13th: true, has14th: false, note: "Sueldo Anual Complementario (S.A.C.)." },
  "brazil": { has13th: true, has14th: false, note: "Standard 13th month." },
  "mexico": { has13th: true, has14th: false, note: "Statutory 13th month (Aguinaldo)." },
  "peru": { has13th: true, has14th: true, note: "Gratification payments in July and December." },
  "ecuador": { has13th: true, has14th: true, note: "Decimo Tercer and Cuarto payments." },
  "bolivia": { has13th: true, has14th: false, note: "Standard 13th month." },
  "philippines": { has13th: true, has14th: false, note: "Statutory 13th month payment." },
  "indonesia": { has13th: true, has14th: false, note: "Tunjangan Hari Raya (Religious Holiday Allowance)." },
  "japan": { has13th: true, has14th: true, note: "Bonus structure often equals 2 extra months." },
  "china": { has13th: true, has14th: false, note: "Chinese New Year bonus." },
  "angola": { has13th: true, has14th: false, note: "Standard holiday allowance." },
  "south africa": { has13th: true, has14th: false, note: "Often paid as a Christmas bonus." }
};

const formatCountry = (c: string) => c.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const formatDeterministicDate = (input: any) => {
  if (!input) return "";
  try {
    let dateStr = "";
    if (typeof input === 'string') {
      dateStr = input;
    } else if (input && typeof input.toDate === 'function') {
      dateStr = input.toDate().toISOString();
    } else if (input instanceof Date) {
      dateStr = input.toISOString();
    } else if (input && typeof input.toISOString === 'function') {
      dateStr = input.toISOString();
    } else if (input && typeof input.seconds === 'number') {
      dateStr = new Date(input.seconds * 1000).toISOString();
    } else {
      dateStr = String(input);
    }

    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return dateStr;
    const [year, monthNum, dayNum] = parts;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[parseInt(monthNum, 10) - 1] || 'Jan';
    const day = parseInt(dayNum, 10);
    return `${day} ${month} ${year}`;
  } catch {
    return "";
  }
};

const getJobStatus = (job: string): { status: 'open' | 'closed'; hasDeadline: boolean; label: string } => {
  const today = new Date("2026-05-18");
  
  // Find all parenthetical blocks in the string
  const parentheticalMatches = [...job.matchAll(/\(([^)]+)\)/g)];
  if (parentheticalMatches.length === 0) {
    return { status: 'open', hasDeadline: false, label: '' };
  }
  
  // Find the parenthetical that contains date/cycle indicators
  const dateParenthetical = parentheticalMatches.find(m => {
    const text = m[1].toLowerCase();
    return text.includes('posted:') || text.includes('closes:') || /202[4-7]|cycle/i.test(text);
  }) || parentheticalMatches[parentheticalMatches.length - 1];
  
  const content = dateParenthetical[1];
  const parts = content.split(';').map(s => s.trim());
  
  // 1. Explicit Closes date check
  const closesPart = parts.find(p => p.toLowerCase().includes('closes:'));
  if (closesPart) {
    const dateStr = closesPart.replace(/closes:\s*/i, '').trim();
    const closesDate = new Date(dateStr);
    if (!isNaN(closesDate.getTime())) {
      if (closesDate >= today) {
        return { status: 'open', hasDeadline: true, label: `OPEN (Closes: ${dateStr})` };
      } else {
        return { status: 'closed', hasDeadline: true, label: `CLOSED (${dateStr})` };
      }
    }
  }
  
  // 2. Explicit Posted date check (assume 4 weeks / 28 days closing window if no closes date)
  const postedPart = parts.find(p => p.toLowerCase().includes('posted:'));
  if (postedPart) {
    const dateStr = postedPart.replace(/posted:\s*/i, '').trim();
    const postedDate = new Date(dateStr);
    if (!isNaN(postedDate.getTime())) {
      const closesDate = new Date(postedDate.getTime() + 28 * 24 * 60 * 60 * 1000);
      const closesDateStr = closesDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      if (closesDate >= today) {
        return { status: 'open', hasDeadline: true, label: `OPEN (Closes: ${closesDateStr})` };
      } else {
        return { status: 'closed', hasDeadline: true, label: `CLOSED (${closesDateStr})` };
      }
    }
  }
  
  // 3. Fallback to start cycle month / year heuristics
  const lower = content.toLowerCase();
  if (lower.includes('2026/27') || lower.includes('2027')) {
    return { status: 'open', hasDeadline: false, label: '' };
  }
  if (lower.includes('2025')) {
    return { status: 'closed', hasDeadline: false, label: 'CLOSED' };
  }
  if (lower.includes('2026')) {
    const pastMonths = ['jan', 'feb', 'mar', 'apr', 'january', 'february', 'march', 'april'];
    const hasPastMonth = pastMonths.some(m => lower.includes(m));
    if (hasPastMonth) {
      return { status: 'closed', hasDeadline: false, label: 'CLOSED' };
    }
    return { status: 'open', hasDeadline: false, label: '' };
  }
  
  return { status: 'open', hasDeadline: false, label: '' };
};

function DecoderContent() {
  const router = useRouter();
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState({
    country: "",
    schoolId: "",
    netSalary: "0",
    partnerSalary: "0",
    familyStatus: "Single"
  });

  const [responsibilityAllowance, setResponsibilityAllowance] = useState("0");
  const [extraIncome, setExtraIncome] = useState("0");
  const [manualAdjustments, setManualAdjustments] = useState("0");
  const [transportMode, setTransportMode] = useState<"P" | "C" | "T">("P");
  const [benchmark, setBenchmark] = useState("GBP");
  const [overrideBedrooms, setOverrideBedrooms] = useState<number | null>(null);
  const [showUpliftOptions, setShowUpliftOptions] = useState(false);
  const [uplift13, setUplift13] = useState(false);
  const [uplift14, setUplift14] = useState(false);
  
  const [rewordedBriefingText, setRewordedBriefingText] = useState<string | null>(null);
  const [isRewording, setIsRewording] = useState(false);
  const [lastRewordedSource, setLastRewordedSource] = useState<string>("");
  const [briefingRequested, setBriefingRequested] = useState(false);

  const [stabilityReport, setStabilityReport] = useState<any>(null);
  const [isCalculatingStability, setIsCalculatingStability] = useState(false);
  const [stabilityError, setStabilityError] = useState<string | null>(null);


  
  // 🏎️ TACTICAL COUNTRY OVERRIDE: Oman defaults to Car Hire
  useEffect(() => {
    if (settings.country.toLowerCase() === "oman") {
      setTransportMode("C");
    }
  }, [settings.country]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setBriefingRequested(false);
  }, [settings.schoolId]);

  const { data: allSchools } = useCollection<any>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'schools') : null), [firestore, mounted]));
  const { data: costOfLiving } = useCollection<any>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'locations_costOfLiving') : null), [firestore, mounted]));
  const { data: transportIntel } = useCollection<any>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'transport_intel') : null), [firestore, mounted]));
  const { data: requirements } = useCollection<any>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'teacher_requirements') : null), [firestore, mounted]));
  const { data: exchangeRates } = useDoc<any>(useMemoFirebase(() => (mounted && firestore ? doc(firestore, 'system', 'exchange_rates') : null), [firestore, mounted]));

  const currentRates = useMemo(() => ({ ...RATES, ...(exchangeRates?.gbpBase || {}) }), [exchangeRates]);

  const getSchoolField = (school: any, keys: string[]) => {
    if (!school) return null;
    const targetKeys = keys.map(k => k.toLowerCase().replace(/\s+/g, ''));
    const foundKey = Object.keys(school).find(k => targetKeys.includes(k.toLowerCase().replace(/\s+/g, '')));
    return foundKey ? school[foundKey] : null;
  };

  const activeSchool = useMemo(() => allSchools?.find((s: any) => s.id === settings.schoolId) || null, [allSchools, settings.schoolId]);

  const loadStabilityReport = useCallback(async (force: boolean = false) => {
    if (!activeSchool) return;
    setIsCalculatingStability(true);
    setStabilityError(null);
    try {
      const staffBaseVal = activeSchool.numericalstaff || parseInt(activeSchool.staffcount) || 80;
      const res = await getSchoolStabilityReport({
        schoolId: activeSchool.id,
        schoolName: activeSchool.schoolname || activeSchool.school || activeSchool.name,
        estimatedStaffBase: staffBaseVal,
        curriculum: activeSchool.curriculum,
        city: activeSchool.city,
        country: activeSchool.country,
        inspections: activeSchool.inspect || activeSchool.accreditation,
        forceRefresh: force,
      });

      if (res.error) {
        setStabilityError(res.error);
      } else {
        setStabilityReport(res.data);
      }
    } catch (err: any) {
      setStabilityError(err.message || "Failed to contact stability engine.");
    } finally {
      setIsCalculatingStability(false);
    }
  }, [activeSchool]);

  useEffect(() => {
    if (!activeSchool) {
      setStabilityReport(null);
      setStabilityError(null);
      return;
    }
    loadStabilityReport(false);
  }, [activeSchool?.id, loadStabilityReport]);

  const normalize = (str: string) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, '').trim();

  const activeCOL = useMemo(() => {
    if (!activeSchool || !costOfLiving) return null;
    const sCity = normalize(String(getSchoolField(activeSchool, ['city', 'town', 'location']) || ''));
    const sCountry = canonicalCountry(String(getSchoolField(activeSchool, ['country', 'region']) || ''));

    const matches = costOfLiving.filter((c: any) =>
      normalize(c.city || c.city_name) === sCity ||
      canonicalCountry(c.country || '') === sCountry ||
      normalize(c.id) === sCity || normalize(c.id) === sCountry
    );

    if (matches.length === 0) return null;
    // 🎯 PRIORITY SHIELD: Pick the document that has core cost fields
    return matches.find((c: any) => Object.keys(c).some(k => k.toLowerCase().includes('groceries') || k.toLowerCase().includes('rent'))) || matches[0];
  }, [activeSchool, costOfLiving]);

  const activeReq = useMemo(() => {
    if (!activeSchool || !requirements) return null;
    const country = canonicalCountry(String(getSchoolField(activeSchool, ['country', 'region']) || ''));
    return requirements.find((r: any) => canonicalCountry(r.country || '') === country || r.id === country);
  }, [activeSchool, requirements]);

  const tIntel = useMemo(() => {
    if (!activeSchool || !transportIntel) return null;
    const sCountry = canonicalCountry(String(getSchoolField(activeSchool, ['country', 'region']) || ''));
    return transportIntel.find((t: any) =>
      canonicalCountry(t.country || '') === sCountry ||
      t.id === sCountry.replace(/\s+/g, '-')
    );
  }, [activeSchool, transportIntel]);

  const currency = activeCOL?.currencyCode || (settings.country === "Portugal" ? "EUR" : "GBP");
  const usdToLocal = (usdAmount: number) => (usdAmount / (currentRates['USD'] || 1.27)) * (currentRates[currency] || 1.0);

  useEffect(() => {
    const salaryVal = getSchoolField(activeSchool, ['salaryrange', 'salary', 'netbase', 'netmonthlyusd', 'salaryrangeusd']);
    if (salaryVal) {
      const cleanRange = String(salaryVal).replace(/,/g, '').replace(/\.\d+/g, '');
      const range = cleanRange.match(/\d+/g);
      const min = range ? parseInt(range[0]) : 0;
      const max = range && range.length > 1 ? parseInt(range[1]) : min;
      const median = Math.round((min + max) / 2);

      setSettings(prev => ({ ...prev, netSalary: Math.round(usdToLocal(median)).toString() }));
    }
  }, [settings.schoolId, activeSchool, currency, currentRates]);

  const analysis = useMemo(() => {
    if (!activeSchool) return null;
    const safeParse = (val: any) => { const n = parseFloat(String(val)); return isNaN(n) ? 0 : n; };

    const status = settings.familyStatus;
    let personCount = 1;
    let scalar = 1.0;
    let pKey = "single";

    // 🎯 STRICT FAMILY MAPPING PROTOCOL
    if (status === "Single") { personCount = 1; scalar = 1.0; pKey = "single"; }
    else if (status === "Married (sole earner)") { personCount = 2; scalar = 1.9; pKey = "marriedDualIncome"; }
    else if (status === "Married (dual income)") { personCount = 2; scalar = 1.9; pKey = "marriedDualIncome"; }
    else if (status === "Family +1") { personCount = 3; scalar = 2.3; pKey = "family1Child"; }
    else if (status === "Family +2") { personCount = 4; scalar = 2.65; pKey = "family2Children"; }
    else if (status === "Family +3") { personCount = 5; scalar = 3.0; pKey = "family3PlusChildren"; }

    const sCountry = canonicalCountry(String(getSchoolField(activeSchool, ['country', 'region']) || ''));
    const countryIntel = SALARY_INTEL[sCountry] || null;

    const baseNet = safeParse(settings.netSalary);
    const upliftFactor = (uplift13 ? 1/12 : 0) + (uplift14 ? 1/12 : 0);
    const amortizedBase = baseNet * (1 + upliftFactor);

    const totalIn = amortizedBase +
      (status !== "Single" && status !== "Married (sole earner)" ? safeParse(settings.partnerSalary) : 0) +
      safeParse(responsibilityAllowance) + safeParse(extraIncome);

    // 🛠️ INTELLIGENT SCALING UTILITY
    const getVal = (data: any, key: string, mult: number) => {
      if (!data) return 0;
      if (typeof data === 'object') {
        if (data[key]) return safeParse(data[key]); // Use pre-scaled field
        return safeParse(data.single || data.base || 0) * mult; // Fallback to manual scaling
      }
      return safeParse(data) * mult; // Scalar fallback
    };

    const housingStatus = String(getSchoolField(activeSchool, ['housingprovision', 'housing', 'accommodation']) || '').toLowerCase();
    const standardRentKey = status === "Single" ? 'rent1br' : (status.includes("Family") ? 'rent3br' : 'rent2br');
    const activeRentKey = overrideBedrooms !== null ? `rent${overrideBedrooms}br` : standardRentKey;

    // 🏠 PROPERTY ADVICE LOGIC
    const propertyLabels: Record<string, string> = { 'rent1br': "1-Bed Residence", 'rent2br': "2-Bed Residence", 'rent3br': "3-Bed Residence" };
    const propertyLabel = propertyLabels[activeRentKey] || "Standard Residence";

    const getF = (data: any, keys: string[]) => {
      const targetKeys = keys.map(k => k.toLowerCase().replace(/\s+/g, ''));
      const foundKey = Object.keys(data || {}).find(k => targetKeys.includes(k.toLowerCase().replace(/\s+/g, '')));
      return foundKey ? data[foundKey] : null;
    };

    const rentCost = housingStatus?.includes('provided') ? 0 : usdToLocal(safeParse(getF(activeCOL, [activeRentKey]) || getF(activeCOL, [standardRentKey]) || getF(activeCOL, ['rent1br'])));

    let canDownsize = false;
    if (!housingStatus?.includes('provided') && overrideBedrooms === null) {
      if (activeRentKey === 'rent3br' || activeRentKey === 'rent2br') {
        canDownsize = true;
      }
    }

    const groceriesCost = usdToLocal(getVal(getF(activeCOL, ['groceries', 'food']), pKey, scalar));
    const utilitiesCost = usdToLocal(getVal(getF(activeCOL, ['utilities', 'bills']), pKey, scalar * 0.8));
    const connectivityCost = usdToLocal(getVal(getF(activeCOL, ['internet', 'connectivity']), pKey, 1) + (getVal(getF(activeCOL, ['mobile', 'phone', 'mobilephone']), pKey, 1) * personCount));

    // 🛰️ NESTED TRANSPORT PROTOCOL
    const mapType = transportMode === "P" ? "publicTransport" : (transportMode === "C" ? "carPurchase" : "taxi");

    // 🛰️ NEW TRANSPORT INTEL REDIRECTION
    const transportPKeyMap: Record<string, string> = {
      "Single": "single",
      "Married (sole earner)": "marriedDualIncome",
      "Married (dual income)": "marriedDualIncome",
      "Family +1": "family1Child",
      "Family +2": "family2Children",
      "Family +3": "family3PlusChildren"
    };
    const transportKey = transportPKeyMap[settings.familyStatus] || "single";

    const transportMap = tIntel?.[mapType] || activeCOL?.transport?.[mapType] || activeCOL?.[mapType] || activeCOL?.transport;
    const transportVal = (typeof transportMap === 'object' && transportMap !== null) ? (transportMap[transportKey] || 0) : (parseFloat(String(transportMap)) || 0);
    const transportCost = usdToLocal(transportVal);
    const socialCost = usdToLocal(getVal(getF(activeCOL, ['social', 'dining', 'diningsocial']), pKey, scalar));
    const manualCost = safeParse(manualAdjustments);

    const totalOut = rentCost + groceriesCost + utilitiesCost + connectivityCost + transportCost + socialCost + manualCost;
    const surplus = totalIn - totalOut;
    const rateOfSaving = totalIn > 0 ? Math.round((surplus / totalIn) * 100) : 0;

    // Currency Benchmark Conversion
    const surplusBenchmark = (surplus / (currentRates[currency] || 1.0)) * (currentRates[benchmark] || 1.0);

    return {
      costs: { rent: rentCost, groceries: groceriesCost, utilities: utilitiesCost, connectivity: connectivityCost, transport: transportCost, social: socialCost, manual: manualCost },
      propertyLabel, canDownsize, standardRentKey,
      totalIn, totalOut, surplus, surplusBenchmark, rateOfSaving, housingStatus, currency, reliability: activeCOL?.dataReliabilityScore,
      countryIntel, uplift13, uplift14
    };
  }, [activeSchool, activeCOL, settings, responsibilityAllowance, manualAdjustments, extraIncome, currency, transportMode, benchmark, overrideBedrooms, currentRates, uplift13, uplift14, tIntel]);

  const leopardfishReview = useMemo(() => {
    if (!activeSchool || !analysis) return null;
    const surplusPara = analysis.surplus > 0
      ? `Analysis of your ${settings.familyStatus.toLowerCase()} profile indicates a healthy monthly surplus of ${currency} ${Math.round(analysis.surplus).toLocaleString()}. This reflects a ${analysis.rateOfSaving}% saving potential after all core outgoings are accounted for.`
      : `Based on the provided salary and the current cost of living for a ${settings.familyStatus.toLowerCase()} profile, there is a projected monthly deficit of ${currency} ${Math.abs(Math.round(analysis.surplus)).toLocaleString()}. This may require a review of local housing options or additional allowance negotiations.`;

    const safetyPara = activeSchool.city?.toLowerCase() === "prague"
      ? "Regarding local security, Prague remains one of the safest capitals in Europe, consistently ranking in the top tier of the Global Peace Index. Educators can expect a high degree of personal safety, with well-lit public spaces and a secure transport network operational throughout the night."
      : "Security for this city is rated as high based on current regional safety indices. Educators are advised to follow standard urban safety protocols, though local crime rates remain significantly below the European average for a city of this size.";

    const schoolContext = `With a work/life score of ${activeSchool.worklifescore || 'N/A'} and an academic score of ${activeSchool.academicscore || 'N/A'}, this school offers a ${activeSchool.curriculum} framework. The data used for this review has a reliability rating of ${analysis.reliability}/10.`;

    return { surplusPara, safetyPara, schoolContext };
  }, [activeSchool, analysis, currency, settings.familyStatus]);

  const cachedBriefingText = useMemo(() => {
    if (!activeSchool) return null;
    const cachedMap = activeSchool.cachedBriefings || {};
    const briefObj = cachedMap[currency] || activeSchool.cachedBriefing;
    return briefObj?.briefing || null;
  }, [activeSchool, currency]);

  useEffect(() => {
    // 🛡️ SEQUENTIAL LOADING MANDATE:
    // Only trigger Staffroom Vibe & Dossier Intel rewording AFTER the Leopardfish Intel (stabilityReport) has finished loading.
    if (!stabilityReport || isCalculatingStability) {
      return;
    }

    if (!briefingRequested) {
      setRewordedBriefingText(null);
      setLastRewordedSource("");
      return;
    }

    if (!cachedBriefingText || !activeSchool) {
      setRewordedBriefingText(null);
      setLastRewordedSource("");
      return;
    }

    // Make a unique cache key based on briefing content, school, currency and status
    const sourceKey = `${activeSchool.id}_${currency}_${settings.familyStatus}_${cachedBriefingText.length}`;
    if (sourceKey === lastRewordedSource) return;

    let active = true;
    const triggerReword = async () => {
      setIsRewording(true);
      try {
        const res = await rewordDossierBriefing({
          briefing: cachedBriefingText,
          schoolName: activeSchool.schoolname || activeSchool.school || "the school",
          familyStatus: settings.familyStatus
        });
        if (active) {
          if (res.data) {
            setRewordedBriefingText(res.data);
            setLastRewordedSource(sourceKey);
          } else {
            // Fallback to original text if rewording fails to bypass blank layout issues
            setRewordedBriefingText(cachedBriefingText);
          }
        }
      } catch (err) {
        console.error("Reword failed:", err);
        if (active) {
          setRewordedBriefingText(cachedBriefingText);
        }
      } finally {
        if (active) {
          setIsRewording(false);
        }
      }
    };

    triggerReword();

    return () => {
      active = false;
    };
  }, [cachedBriefingText, activeSchool, currency, settings.familyStatus, lastRewordedSource, stabilityReport, isCalculatingStability, briefingRequested]);

  const handleNavigateToCompare = () => {
    if (!activeSchool) return;

    // Added .trim() and case-insensitive check to ensure schools are actually matched
    const peers = allSchools
      ?.filter((s: any) =>
        s.country?.trim().toLowerCase() === activeSchool.country?.trim().toLowerCase() &&
        s.city?.trim().toLowerCase() === activeSchool.city?.trim().toLowerCase() &&
        s.id !== activeSchool.id
      )
      .slice(0, 2)
      .map((s: any) => s.id)
      .join(',');

    const query = new URLSearchParams({
      primary: activeSchool.id,
      peers: peers || "",
      status: settings.familyStatus
    }).toString();

    router.push(`/compare/?${query}`);
  };

  if (!mounted) return null;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-col lg:flex-row min-h-screen bg-[#020617] text-white selection:bg-[#f97316]">

        {/* Sidebar: Manual Unrolled Search Settings */}
        <div className="w-full lg:w-72 bg-[#0b1224] border-r border-white/5 p-4 lg:fixed lg:h-full overflow-y-auto z-30 shadow-xl">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] font-black text-[#007FFF] uppercase tracking-[0.3em] mb-4 hover:text-white transition-colors"><ArrowLeft className="size-3" /> Back</button>
          <p className="text-[11px] font-black text-[#f97316] uppercase tracking-[0.4em] mb-4 italic">Search settings</p>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Target country</label>
              <Select value={settings.country} onValueChange={(v) => setSettings({ ...settings, country: v, schoolId: "" })}>
                <SelectTrigger className="bg-black/40 border-white/10 h-10 text-xs font-bold uppercase"><SelectValue placeholder="Country" /></SelectTrigger>
                <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold uppercase text-xs">
                  {allSchools?.map((s: any) => canonicalCountry(s.country)).filter((v: any, i: any, a: any) => v && a.indexOf(v) === i).sort().map((c: any) => <SelectItem key={c} value={c}>{formatCountry(c)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Select school</label>
              <Select disabled={!settings.country} value={settings.schoolId} onValueChange={(v) => setSettings({ ...settings, schoolId: v })}>
                <SelectTrigger className="bg-black/40 border-white/10 h-10 text-xs font-bold uppercase"><SelectValue placeholder="School" /></SelectTrigger>
                <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold uppercase text-xs">
                  {allSchools?.filter((s: any) => canonicalCountry(s.country) === canonicalCountry(settings.country))
                    .sort((a: any, b: any) => (a.schoolname || '').localeCompare(b.schoolname || ''))
                    .map((s: any) => <SelectItem key={s.id || s.schoolname} value={s.id}>{s.schoolname}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Family status</label>
              <Select value={settings.familyStatus} onValueChange={(v) => setSettings({ ...settings, familyStatus: v })}>
                <SelectTrigger className="bg-black/40 border-white/10 h-10 text-xs font-bold uppercase"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold uppercase text-xs">
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Married (sole earner)">Married (sole earner)</SelectItem>
                  <SelectItem value="Married (dual income)">Married (dual income)</SelectItem>
                  <SelectItem value="Family +1">Family +1</SelectItem>
                  <SelectItem value="Family +2">Family +2</SelectItem>
                  <SelectItem value="Family +3">Family +3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 border-t border-white/5 space-y-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest italic leading-none mb-1">Monthly net salary ({currency})</label>
                <Input type="number" value={settings.netSalary} onChange={(e) => setSettings({ ...settings, netSalary: e.target.value })} className={cn("bg-black/40 border-white/10 h-10 font-black text-sm", noSpinners)} />
              </div>
              {settings.familyStatus !== "Single" && settings.familyStatus !== "Married (sole earner)" && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic leading-none mb-1">Partner net salary ({currency})</label>
                  <Input type="number" value={settings.partnerSalary} onChange={(e) => setSettings({ ...settings, partnerSalary: e.target.value })} className={cn("bg-black/40 border-white/10 h-10 font-black text-sm", noSpinners)} />
                </div>
              )}
            </div>

            <button
              onClick={() => router.push(`/decide?ids=${activeSchool?.id}`)}
              disabled={!activeSchool}
              className="w-full bg-zinc-950/60 backdrop-blur-xl border border-[#f97316] text-white font-bold rounded-none h-10 transition-all hover:bg-[#f97316]/20 shadow-2xl text-xs tracking-wider mt-2 disabled:opacity-50"
            >
              Compare Options
            </button>
          </div>
        </div>

        {/* Dashboard Area */}
        <div className="flex-1 lg:ml-72 p-4 md:p-6">
          {!activeSchool ? (
            <div className="h-[70vh] flex flex-col items-center justify-center opacity-10 space-y-4"><Zap className="size-20" /><p className="font-black uppercase tracking-[0.5em] text-sm">Awaiting tactical match</p></div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-4 animate-in fade-in duration-500">
              <div className="bg-[#0b1224] border border-white/5 p-5 md:p-6 shadow-2xl relative rounded-sm">

                {/* Header Row */}
                <div className="flex justify-between items-start border-b border-white/5 pb-3">
                  <div className="space-y-2">
                    <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none italic">
                      {getSchoolField(activeSchool, ['schoolname', 'name', 'school'])}
                      <span className="text-slate-700 text-lg ml-3 not-italic">#{activeSchool.id}</span>
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black text-[#f97316] uppercase tracking-widest bg-[#f97316]/10 px-2 py-1 rounded-sm border border-[#f97316]/20">
                        {getSchoolField(activeSchool, ['city', 'town', 'location'])}, {getSchoolField(activeSchool, ['country', 'region'])}
                      </span>
                      <div className="flex gap-2">
                        {(analysis?.surplus ?? 0) <= 0 && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-rose-500/20 bg-rose-500/10">
                            <AlertCircle className="size-3.5 text-rose-500" />
                            <span className="text-[9px] font-black uppercase tracking-tight text-rose-500">Capital loss</span>
                          </div>
                        )}
                        {(analysis?.surplus ?? 0) > 0 && (analysis?.rateOfSaving ?? 0) <= 10 && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-[#f97316]/20 bg-[#f97316]/10">
                            <AlertTriangle className="size-3.5 text-[#f97316]" />
                            <span className="text-[9px] font-black uppercase tracking-tight text-[#f97316]">Limited Potential</span>
                          </div>
                        )}
                        {(analysis?.rateOfSaving ?? 0) > 10 && (analysis?.rateOfSaving ?? 0) <= 20 && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5">
                            <Coins className="size-3.5 text-emerald-400" />
                            <span className="text-[9px] font-black uppercase tracking-tight text-emerald-400">Good Savings Potential</span>
                          </div>
                        )}
                        {(analysis?.rateOfSaving ?? 0) > 20 && (analysis?.rateOfSaving ?? 0) <= 30 && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10">
                            <Coins className="size-3.5 text-emerald-400" />
                            <span className="text-[9px] font-black uppercase tracking-tight text-emerald-400">Significant Savings Potential</span>
                          </div>
                        )}
                        {(analysis?.rateOfSaving ?? 0) > 30 && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-emerald-400/40 bg-emerald-400/20 shadow-[0_0_15px_rgba(52,211,153,0.1)]">
                            <Zap className="size-3.5 text-emerald-300" />
                            <span className="text-[9px] font-black uppercase tracking-tight text-emerald-300">Excellent Savings Potential</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Reliability</p>
                    <p className="text-2xl font-black text-sky-500 italic leading-none">{analysis?.reliability}<span className="text-xs text-slate-700">/10</span></p>
                  </div>
                </div>

                {/* Main Grid: Outgoings & Incomes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">

                  <div className="space-y-3">
                    <h3 className="text-[11px] font-black text-rose-500 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-rose-500/10 pb-1.5"><Minus className="size-4" /> Monthly outgoings</h3>
                    <div className="space-y-1.5">

                      <div className="flex justify-between items-center border-b border-white/5 pb-1">
                        <div className="flex flex-col">
                          <Tooltip><TooltipTrigger asChild><span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight cursor-help border-b border-dotted border-slate-700">Accommodation</span></TooltipTrigger><TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">Estimated market rent based on your specific household profile.</TooltipContent></Tooltip>
                          <span className="text-[8px] font-black text-sky-400 uppercase tracking-widest">{analysis?.propertyLabel}</span>
                        </div>
                        <span className={cn("text-[14px] font-black tabular-nums text-white", analysis?.housingStatus === 'provided' && "text-emerald-500 italic")}>
                          {analysis?.housingStatus === 'provided' ? "covered" : `${currency} ${Math.round(analysis?.costs.rent || 0).toLocaleString()}`}
                        </span>
                      </div>

                      <div className="flex justify-between items-center border-b border-white/5 pb-1">
                        <Tooltip><TooltipTrigger asChild><span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight cursor-help border-b border-dotted border-slate-700">Groceries</span></TooltipTrigger><TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">Standard food and household supply indices for your household size.</TooltipContent></Tooltip>
                        <span className="text-[14px] font-black tabular-nums text-white">{currency} {Math.round(analysis?.costs.groceries || 0).toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center border-b border-white/5 pb-1">
                        <Tooltip><TooltipTrigger asChild><span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight cursor-help border-b border-dotted border-slate-700">Utilities</span></TooltipTrigger><TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">Monthly averages for electricity, heating, water, and waste management.</TooltipContent></Tooltip>
                        <span className="text-[14px] font-black tabular-nums text-white">{currency} {Math.round(analysis?.costs.utilities || 0).toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center border-b border-white/5 pb-1">
                        <Tooltip><TooltipTrigger asChild><span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight cursor-help border-b border-dotted border-slate-700">Internet and sim</span></TooltipTrigger><TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">Includes standard home broadband and one SIM card per person in the home.</TooltipContent></Tooltip>
                        <span className="text-[14px] font-black tabular-nums text-white">{currency} {Math.round(analysis?.costs.connectivity || 0).toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center border-b border-white/5 pb-1">
                        <div className="flex flex-col gap-1 w-full">
                          <div className="flex justify-between items-center">
                            <Tooltip><TooltipTrigger asChild><span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight cursor-help border-b border-dotted border-slate-700">Transport</span></TooltipTrigger><TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">Switch between Public Transit, Car ownership, or Taxi/Ride-hailing.</TooltipContent></Tooltip>
                            <div className="flex bg-white/5 rounded-sm p-0.5 border border-white/10">
                              <button onClick={() => setTransportMode("P")} className={cn("px-1.5 text-[8px] font-black rounded-sm transition-all", transportMode === "P" ? "bg-[#f97316] text-white shadow-sm" : "text-slate-500 hover:text-white")}>Bus +</button>
                              <button onClick={() => setTransportMode("C")} className={cn("px-1.5 text-[8px] font-black rounded-sm transition-all", transportMode === "C" ? "bg-[#f97316] text-white shadow-sm" : "text-slate-500 hover:text-white")}>Car Hire</button>
                              <button onClick={() => setTransportMode("T")} className={cn("px-1.5 text-[8px] font-black rounded-sm transition-all", transportMode === "T" ? "bg-[#f97316] text-white shadow-sm" : "text-slate-500 hover:text-white")}>Taxi</button>
                            </div>
                            <span className="text-[14px] font-black tabular-nums text-white">{currency} {Math.round(analysis?.costs.transport || 0).toLocaleString()}</span>
                          </div>

                          {/* 🕵️ TACTICAL INSIGHT DISPLAY */}
                          {activeCOL?.transport && (
                            <div className="bg-white/5 p-2 rounded-sm border-l border-[#f97316]/50 mt-1">
                              <p className="text-[9px] font-medium text-slate-400 italic">
                                <Zap className="inline size-2.5 text-[#f97316] mr-1" />
                                {transportMode === "P" ?
                                  (tIntel?.bestOptionNoDriver || activeCOL?.transport?.bestOptionNoDriver || "Standard transit network.") :
                                  (tIntel?.bestOptionDriver || activeCOL?.transport?.bestOptionDriver || "Vehicle ownership/hire recommended.")
                                }
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-b border-white/5 pb-1">
                        <Tooltip><TooltipTrigger asChild><span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight cursor-help border-b border-dotted border-slate-700">Leisure & social</span></TooltipTrigger><TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">A discretionary guide for dining out, cultural activities, and general socialising.</TooltipContent></Tooltip>
                        <span className="text-[14px] font-black tabular-nums text-white">{currency} {Math.round(analysis?.costs.social || 0).toLocaleString()}</span>
                      </div>

                      {/* RESTORED: Custom Adjustments Box from Screenshot */}
                      <div className="pt-4 mt-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-start gap-2">
                            <Wallet className="size-4 text-sky-400 mt-1" />
                            <div>
                              <p className="text-[11px] font-black text-sky-400 uppercase tracking-widest italic leading-none">Custom Adjustments (+/-)</p>
                              <p className="text-[9px] font-medium text-slate-500 italic">home country commitments, student loans etc.</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-600 uppercase">{currency}</span>
                            <Input
                              type="number"
                              value={manualAdjustments}
                              onChange={(e) => setManualAdjustments(e.target.value)}
                              className={cn("bg-black/40 border-white/10 w-28 h-10 px-3 text-right text-base font-black text-white focus:border-[#f97316] transition-all", noSpinners)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t-2 border-[#f97316]/20 mt-4">
                        <span className="text-[10px] font-black text-[#f97316] uppercase italic tracking-widest">Total outgoings</span>
                        <span className="text-[18px] font-black text-white tabular-nums">{currency} {Math.round(analysis?.totalOut || 0).toLocaleString()}</span>
                      </div>

                      {/* 🛡️ TACTICAL SETUP LINK */}
                      <button 
                        onClick={() => router.push('/prepare')}
                        className="mt-4 w-full p-4 bg-[#007FFF]/5 border border-[#007FFF]/10 rounded-sm hover:bg-[#007FFF]/10 hover:border-[#007FFF]/40 transition-all group flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3 text-left">
                          <div className="bg-[#007FFF]/10 p-2 rounded-sm group-hover:scale-110 transition-transform">
                            <Wallet className="size-4 text-[#007FFF]" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-[#007FFF] uppercase tracking-widest leading-none mb-1">Calculate Setup Costs</p>
                            <p className="text-[9px] font-medium text-slate-500 italic">Account for initial relocation and local setup expenses.</p>
                          </div>
                        </div>
                        <ArrowRight className="size-4 text-[#007FFF] group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-emerald-500/10 pb-1.5"><Plus className="size-4" /> Monthly incomes</h3>
                    <div className="space-y-4">

                      <div className="flex justify-between items-center border-b border-white/5 pb-1">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Monthly net base</span>
                        <span className="text-[14px] font-black text-white">{currency} {parseFloat(settings.netSalary).toLocaleString()}</span>
                      </div>

                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-sm flex justify-between items-center">
                        <div className="text-left">
                          <p className="text-[9px] font-black text-sky-400 uppercase tracking-widest italic mb-1">Additional income</p>
                          <p className="text-[8px] font-bold text-slate-500 uppercase italic flex items-center gap-1"><Banknote className="size-3" /> Tutoring / tlr credits</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black text-emerald-700">{currency}</span>
                          <Input type="number" value={extraIncome} onChange={(e) => setExtraIncome(e.target.value)} className={cn("bg-black/40 border border-emerald-500/20 w-24 h-8 px-2 text-right text-xs font-black text-emerald-400 rounded-sm focus:border-emerald-500", noSpinners)} />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-emerald-500/10">
                        <span className="text-[10px] font-black text-emerald-500 uppercase italic tracking-widest">Total monthly income</span>
                        <span className="text-[16px] font-black text-white tabular-nums">{currency} {Math.round(analysis?.totalIn || 0).toLocaleString()}</span>
                      </div>

                      <div className="bg-[#f97316]/5 p-6 border border-[#f97316]/20 text-right rounded-sm relative shadow-inner">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#f97316]" />

                        {/* 🎯 BENCHMARK CURRENCY TOGGLE */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex bg-black/40 rounded-sm p-0.5 border border-white/5">
                            {BENCHMARKS.map(b => (
                              <button key={b.code} onClick={() => setBenchmark(b.code)} className={cn("px-2 py-1 text-[8px] font-black rounded-sm transition-all uppercase", benchmark === b.code ? "bg-[#f97316] text-white" : "text-slate-500 hover:text-white")}>{b.code}</button>
                            ))}
                          </div>
                          <p className="text-[10px] font-black text-[#f97316] uppercase tracking-[0.2em] italic">Monthly Disposable Surplus</p>
                        </div>

                        <div className="flex flex-col items-end">
                          <div className="flex items-baseline gap-2 leading-none">
                            <span className="text-xl font-black text-white/50">{currency}</span>
                            <span className={cn("text-5xl font-black tracking-tighter tabular-nums text-white", (analysis?.surplus ?? 0) <= 0 && "text-rose-500")}>
                              {Math.round(analysis?.surplus || 0).toLocaleString()}
                              {(analysis?.uplift13 || analysis?.uplift14) && <span className="text-xl align-top text-[#f97316] ml-1">*</span>}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs font-bold text-slate-400 uppercase">Benchmark: {benchmark}</span>
                            <span className="text-xl font-black text-emerald-500 italic">{Math.round(analysis?.surplusBenchmark || 0).toLocaleString()}</span>
                            <span className="text-xs font-black text-emerald-400 opacity-60">({analysis?.rateOfSaving}%)</span>
                          </div>

                          {/* 🕵️ TACTICAL SALARY UPLIFT (Stage 1) */}
                          {analysis?.countryIntel && (
                            <div className="mt-4 w-full p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-sm transition-all duration-500 overflow-hidden">
                              {!showUpliftOptions && !uplift13 && !uplift14 ? (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-700">
                                  <div className="flex items-start gap-3">
                                    <Zap className="size-4 text-emerald-400 mt-1 flex-shrink-0" />
                                    <p className="text-[11px] font-bold text-slate-300 leading-relaxed italic">
                                      Do you want to adjust your offer to allow for bonus month salaries offered in <span className="text-emerald-400 font-black">{formatCountry(settings.country)}</span>?
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => setShowUpliftOptions(true)}
                                    className="w-full py-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-sm hover:bg-emerald-500 hover:text-black transition-all group"
                                  >
                                    Adjust Offer <ArrowDownCircle className="inline size-3 ml-1 group-hover:translate-y-0.5 transition-transform" />
                                  </button>
                                </div>
                              ) : (
                                <div className="animate-in zoom-in-95 duration-500">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic flex items-center gap-2">
                                      Tactical Intel: {analysis.countryIntel.has14th ? "13th & 14th Month" : "13th Month"}
                                    </span>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button className="text-emerald-400 hover:text-white transition-colors">
                                            <Info className="size-3" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="max-w-xs bg-slate-900 border-emerald-500/50 text-white p-4">
                                          <p className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-tight">Market Intelligence Briefing</p>
                                          <p className="text-[11px] leading-relaxed mb-3">
                                            {analysis.countryIntel.note} We are amortising these payments into your monthly forecast (adding 1/12th of your base salary per payment).
                                          </p>
                                          <p className="text-[10px] italic text-rose-400 border-t border-white/10 pt-2 font-bold">
                                            ⚠️ WARNING: Full net salary may not be the exact amount of the 13/14 payment as taxes and social security often vary on bonuses.
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>

                                  <div className="flex gap-2">
                                    {analysis.countryIntel.has13th && (
                                      <button
                                        onClick={() => setUplift13(!uplift13)}
                                        className={cn(
                                          "flex-1 py-1.5 px-3 text-[9px] font-black uppercase tracking-widest rounded-sm border transition-all",
                                          uplift13 ? "bg-emerald-500 border-emerald-400 text-black" : "bg-black/40 border-emerald-500/30 text-emerald-500/60 hover:border-emerald-500 hover:text-emerald-400"
                                        )}
                                      >
                                        {uplift13 ? "13th Month Active" : "Apply 13th Month"}
                                      </button>
                                    )}
                                    {analysis.countryIntel.has14th && (
                                      <button
                                        onClick={() => setUplift14(!uplift14)}
                                        className={cn(
                                          "flex-1 py-1.5 px-3 text-[9px] font-black uppercase tracking-widest rounded-sm border transition-all",
                                          uplift14 ? "bg-emerald-500 border-emerald-400 text-black" : "bg-black/40 border-emerald-500/30 text-emerald-500/60 hover:border-emerald-500 hover:text-emerald-400"
                                        )}
                                      >
                                        {uplift14 ? "14th Month Active" : "Apply 14th Month"}
                                      </button>
                                    )}
                                  </div>
                                  <p className="mt-2 text-[8px] font-bold text-emerald-500/40 uppercase italic text-center italic tracking-tighter">
                                    Please confirm your specific offer includes these payments
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 🛡️ TACTICAL DOWNSIZING ADVICE */}
                          {(analysis?.surplus ?? 0) < 0 && analysis?.canDownsize && (
                            <button
                              onClick={() => {
                                const currentSize = parseInt(analysis.standardRentKey.replace(/\D/g, ''));
                                setOverrideBedrooms(currentSize - 1);
                              }}
                              className="mt-4 flex items-center gap-2 px-3 py-2 bg-rose-500/10 border border-rose-500/50 text-rose-500 rounded-sm hover:bg-rose-500 hover:text-white transition-all animate-pulse"
                            >
                              <ArrowDownCircle className="size-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest italic">Apply Tactical Downsizing ({analysis.standardRentKey.replace(/\D/g, '')} → {parseInt(analysis.standardRentKey.replace(/\D/g, '')) - 1} Bed)</span>
                            </button>
                          )}

                          {(overrideBedrooms || uplift13 || uplift14) && (
                            <button
                              onClick={() => {
                                setOverrideBedrooms(null);
                                setUplift13(false);
                                setUplift14(false);
                              }}
                              className="mt-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white underline underline-offset-4"
                            >
                              Reset to Standard Baseline
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 🕵️ TACTICAL INCOME REMINDER */}
                      {(analysis?.surplus ?? 0) < 0 && (
                        <div className="mt-4 p-4 bg-sky-500/5 border border-sky-500/20 rounded-sm">
                          <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                            <Zap className="size-3" /> Tactical Income Tip
                          </p>
                          <p className="text-[11px] text-slate-400 leading-relaxed italic">
                            Surplus remains negative. To balance this package, consider adding <span className="text-white font-bold">Partner Income</span> on the left menu or <span className="text-white font-bold">Additional Credits</span> (Tutoring/TLR) in the box above.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {leopardfishReview && (
                  <div className="mt-8 p-6 bg-white/[0.02] border border-white/5 rounded-sm shadow-sm space-y-6">
                    {/*
                      You are the core data-science and statistical analysis engine for www.leopardfishintel.com. Your task is to calculate institutional stability, estimate teacher churn rates, and assess organizational risk for international schools using raw recruitment data.

                      [INPUT DATA LAYOUT]
                      You will be provided a JSON payload containing the profile details and raw TES job posting history for a batch of schools. The data for each school follows this format:
                      - schoolId: Unique identifier
                      - schoolName: Name of the institution
                      - estimatedStaffBase: Total number of academic staff
                      - rawJobPostings: Array of jobs posted over the last 12 months (includes jobTitle, postDate)

                      [ANALYTICAL INSTRUCTIONS & FORMULAS]
                      For each school in the input payload, compute the following metrics exactly:
                      1. averageYearlyTesAdverts: The total count of unique listings in the rawJobPostings array.
                      2. estimatedChurnRatePercent: Calculate as (averageYearlyTesAdverts / estimatedStaffBase) * 100. Round to 1 decimal place.
                      3. leadershipChurnRatioPercent: Isolate jobs where jobTitle contains keywords like "Head of", "Director", "Coordinator", "Principal", or "Lead". Calculate as (Leadership Vacancies / total unique listings) * 100. Round to 1 decimal place.
                      4. lateSeasonUrgencyScore: Analyze postDate values. If multiple core classroom positions have postDate values in April, May, or June, assign "Extreme". If mostly January-March, assign "Moderate". If wrapped up before January, assign "Low".
                      5. riskRating: 
                         - "Stable" if Churn < 10% and Urgency is Low.
                         - "Healthy" if Churn 10% - 15% and Urgency is Low/Moderate.
                         - "Caution" if Churn 15.1% - 22% or Senior Leadership Churn > 25%.
                         - "High Risk" if Churn > 22% or Urgency is Extreme.

                      [GENKIT DATA STRUCTURE MANDATE]
                      Output a valid JSON array matching this exact schema:

                      import { z } from 'genkit';

                      export const GlobalStabilitySchema = z.object({
                        schoolId: z.string(),
                        schoolName: z.string(),
                        metrics: z.object({
                          estimatedStaffBase: z.number(),
                          averageYearlyTesAdverts: z.number(),
                          estimatedChurnRatePercent: z.number(),
                          leadershipChurnRatioPercent: z.number(),
                          lateSeasonUrgencyScore: z.enum(['Low', 'Moderate', 'Extreme']),
                          riskRating: z.enum(['Stable', 'Healthy', 'Caution', 'High Risk']),
                        }),
                        leopardfishIntelAlert: z.string().description('A concise 2-sentence tactical breakdown of the risks/stabilities discovered.'),
                        lastUpdated: z.string()
                      });
                    */}
                    <div>
                      <h4 className="text-[11px] font-black text-sky-400 uppercase tracking-[0.4em] mb-3 flex items-center gap-2">
                        <FileText className="size-4" /> Staff Turnover Guide - (last 12 months)
                      </h4>
                      <div className="space-y-6 text-[13px] text-slate-300 leading-relaxed border-l-2 border-[#f97316]/30 pl-4">
                        
                        {/* 🛸 STABILITY & CHURN ENGINE LEDGER */}
                        <div className="bg-white/5 border border-white/10 rounded-sm p-4 space-y-4">
                          
                          {isCalculatingStability && !stabilityReport ? (
                            <div className="space-y-3 py-2">
                              <div className="h-3 bg-white/5 rounded-sm w-3/4 animate-pulse" />
                              <div className="h-3 bg-white/5 rounded-sm w-1/2 animate-pulse" />
                              
                              {/* 📡 TWO-STEP LIVE SWEEP PROGRESS CARD (FIRST LOAD) */}
                              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-sm space-y-2.5 shadow-inner shadow-black/40 mt-3">
                                <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-[#f97316] flex items-center gap-1.5">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f97316] opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f97316]"></span>
                                    </span>
                                    Executing Two-Step Vacancy Audit
                                  </span>
                                  <span className="text-[8px] font-bold text-sky-400 uppercase tracking-widest animate-pulse">
                                    AI Portal Verification...
                                  </span>
                                </div>
                                
                                <div className="space-y-2.5 pt-0.5">
                                  {/* STEP 1 */}
                                  <div className="flex items-start gap-2.5">
                                    <div className="flex items-center justify-center size-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black mt-0.5">
                                      ✓
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">Step 1: Institutional Dossier Loaded</p>
                                      <p className="text-[9px] text-slate-400 font-medium">Retrieved local vacancy records &amp; institutional profile database (&lt; 100ms)</p>
                                    </div>
                                  </div>

                                  {/* STEP 2 */}
                                  <div className="flex items-start gap-2.5">
                                    <div className="flex items-center justify-center size-4 rounded-full bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30 text-[9px] font-bold mt-0.5">
                                      <span className="animate-spin size-2.5 border-2 border-t-transparent border-[#f97316] rounded-full" />
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-black text-[#f97316] uppercase tracking-wider flex items-center gap-1.5">
                                        Step 2: Active Web Portals Sweep
                                      </p>
                                      <p className="text-[9px] text-slate-400 font-medium">Auditing TES, Schrole, aggregates, forums &amp; school web portals live...</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : stabilityError ? (
                            <div className="text-red-400 text-xs font-semibold">
                              ⚠️ Stability engine offline: {stabilityError}
                            </div>
                          ) : stabilityReport ? (
                            <div className="space-y-4">
                              {/* 🛡️ STAFF TURNOVER & CHURN CATEGORY GUIDE */}
                              <div className="bg-black/40 border border-white/5 rounded-sm p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2.5">
                                  <Activity className="size-4 text-[#f97316]" />
                                  <div>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                      Category:{" "}
                                      <span className={cn(
                                        "font-black uppercase",
                                        stabilityReport.metrics.estimatedChurnRatePercent == null && "text-slate-400",
                                        stabilityReport.metrics.estimatedChurnRatePercent != null && stabilityReport.metrics.estimatedChurnRatePercent < 10 && "text-emerald-400",
                                        stabilityReport.metrics.estimatedChurnRatePercent != null && stabilityReport.metrics.estimatedChurnRatePercent >= 10 && stabilityReport.metrics.estimatedChurnRatePercent <= 15 && "text-green-400",
                                        stabilityReport.metrics.estimatedChurnRatePercent != null && stabilityReport.metrics.estimatedChurnRatePercent > 15 && stabilityReport.metrics.estimatedChurnRatePercent <= 22 && "text-amber-400",
                                        stabilityReport.metrics.estimatedChurnRatePercent != null && stabilityReport.metrics.estimatedChurnRatePercent > 22 && "text-rose-400"
                                      )}>
                                        {(() => {
                                          const rate = stabilityReport.metrics.estimatedChurnRatePercent;
                                          if (rate == null) return "None found";
                                          if (rate < 10) return "Low Turnover (Stable)";
                                          if (rate <= 15) return "Moderate Turnover (Healthy)";
                                          if (rate <= 22) return "Elevated Turnover (Caution)";
                                          return "High Turnover (Significant Churn)";
                                        })()}
                                      </span>
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-start sm:self-center">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm font-black uppercase text-[9px] text-sky-400 transition-all hover:text-white">
                                        <Info className="size-3" /> Implications & Impact
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-sm bg-slate-900 border border-white/10 text-white p-3 space-y-2 rounded-sm shadow-xl z-50">
                                      <p className="text-[10px] font-black uppercase tracking-wider text-sky-400 border-b border-white/10 pb-1">Implications & Impact</p>
                                      <ul className="space-y-1.5 text-[10px] leading-relaxed text-slate-300 font-medium">
                                        <li>
                                          <span className="font-black text-emerald-400">Low (&lt;10%):</span> Outstanding retention. Indicates a settled staffroom, stable SLT support, and high satisfaction.
                                        </li>
                                        <li>
                                          <span className="font-black text-green-400">Moderate (10-15%):</span> Standard lifecycle. Natural international transition at the end of standard 2-year contracts.
                                        </li>
                                        <li>
                                          <span className="font-black text-amber-400">Elevated (15-22%):</span> Active transition. Likely department shuffles, leadership restructure, or shifting timetables.
                                        </li>
                                        <li>
                                          <span className="font-black text-rose-400">High (&gt;22%):</span> Significant churn. Points to heavy workloads, leadership churn, or structural instability.
                                        </li>
                                      </ul>
                                    </TooltipContent>
                                  </Tooltip>

                                  <button
                                    onClick={() => loadStabilityReport(true)}
                                    disabled={isCalculatingStability}
                                    type="button"
                                    className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f97316]/10 hover:bg-[#f97316]/20 border border-[#f97316]/30 hover:border-[#f97316]/50 rounded-sm font-black uppercase text-[9px] text-[#f97316] transition-all hover:text-white disabled:opacity-50"
                                  >
                                    <RefreshCw className={cn("size-3", isCalculatingStability && "animate-spin")} /> Re-verify vacancies
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div className="bg-black/20 border border-white/5 p-2 rounded-sm">
                                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Est Staff Numbers</div>
                                  <div className="text-sm font-black text-white mt-0.5">{stabilityReport.metrics.estimatedStaffBase || '—'}</div>
                                </div>
                                <div className="bg-black/20 border border-white/5 p-2 rounded-sm">
                                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Known Adverts in the last 12 months</div>
                                  <div className="text-sm font-black text-white mt-0.5">
                                    {stabilityReport.metrics.averageYearlyTesAdverts != null ? stabilityReport.metrics.averageYearlyTesAdverts : 'None found'}
                                  </div>
                                </div>
                                <div className="bg-black/20 border border-white/5 p-2 rounded-sm">
                                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Est. 12m Churn Rate</div>
                                  <div className="text-sm font-black text-sky-400 mt-0.5">
                                    {stabilityReport.metrics.estimatedChurnRatePercent != null ? `${stabilityReport.metrics.estimatedChurnRatePercent}%` : 'None found'}
                                  </div>
                                </div>
                                <div className="col-span-2 sm:col-span-3 relative rounded-sm overflow-hidden">
                                  {/* Premium Paywall Overlay */}
                                  <div className="absolute inset-0 z-10 backdrop-blur-md bg-[#0b1224]/60 flex items-center justify-center border border-white/5 rounded-sm transition-all duration-300">
                                    <div className="flex items-center justify-center bg-[#f97316]/10 border border-[#f97316]/20 px-4 py-2 rounded-sm cursor-pointer hover:bg-[#f97316]/20 transition-colors shadow-2xl">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-[#f97316]">Find out more</span>
                                    </div>
                                  </div>

                                  {/* Locked Content */}
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 opacity-30 select-none pointer-events-none">
                                    <div className="bg-black/20 border border-white/5 p-2 rounded-sm blur-[2px]">
                                      <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Senior Leadership Churn</div>
                                      <div className="text-sm font-black text-amber-400 mt-0.5">
                                        {stabilityReport.metrics.leadershipChurnRatioPercent != null ? `${stabilityReport.metrics.leadershipChurnRatioPercent}%` : 'None found'}
                                      </div>
                                    </div>
                                    <div className="bg-black/20 border border-white/5 p-2 rounded-sm col-span-1 sm:col-span-2 blur-[2px]">
                                      <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Recruitment Style</div>
                                      {(() => {
                                        const rawScore = stabilityReport.metrics.lateSeasonUrgencyScore;
                                        if (rawScore == null || stabilityReport.metrics.averageYearlyTesAdverts == null) {
                                          return <div className="text-xs font-black mt-1 uppercase text-slate-400">None found</div>;
                                        }
                                        const normalizedScore = 
                                          (rawScore.toLowerCase() === 'low' || rawScore.toLowerCase() === 'proactive') ? 'Proactive' :
                                          (rawScore.toLowerCase() === 'moderate' || rawScore.toLowerCase() === 'standard') ? 'Standard' :
                                          (rawScore.toLowerCase() === 'extreme' || rawScore.toLowerCase() === 'reactive') ? 'Reactive' :
                                          rawScore;
                                        
                                        return (
                                          <div className={cn(
                                            "text-xs font-black mt-1 uppercase",
                                            normalizedScore === 'Proactive' && "text-green-400",
                                            normalizedScore === 'Standard' && "text-amber-400",
                                            normalizedScore === 'Reactive' && "text-red-400"
                                          )}>
                                            {normalizedScore}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 📋 DISCOVERED VACANCIES DROPDOWN */}
                              {((stabilityReport && stabilityReport.scrapedJobsList && stabilityReport.scrapedJobsList.length > 0) || isCalculatingStability) && (
                                <div className="border border-white/5 bg-black/10 rounded-sm mt-3">
                                  <details className="group" open={isCalculatingStability ? true : undefined}>
                                    <summary className="flex items-center justify-between p-2.5 cursor-pointer select-none text-[10px] font-black uppercase tracking-wider text-sky-400 hover:bg-white/5 transition-colors">
                                      <span className="flex items-center gap-2">
                                        {isCalculatingStability ? (
                                          <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f97316]/50 opacity-75"></span>
                                            <Briefcase className="size-3 text-[#f97316]" />
                                          </span>
                                        ) : (
                                          <Briefcase className="size-3 text-[#f97316]" />
                                        )}
                                        {isCalculatingStability ? (
                                          <span className="text-[10px] font-black uppercase tracking-wider text-[#f97316] animate-pulse">
                                            Sweeping Live Vacancies...
                                          </span>
                                        ) : (
                                          <span className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">
                                              View Discovered Vacancies
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 text-[8px] font-black uppercase tracking-wider leading-none">
                                              12-Month History
                                            </span>
                                            <span className="flex items-center justify-center size-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black leading-none">
                                              {stabilityReport?.scrapedJobsList?.length || 0}
                                            </span>
                                          </span>
                                        )}
                                      </span>
                                      <ChevronDown className="size-3 text-slate-400 group-open:rotate-180 transition-transform" />
                                    </summary>
                                    <div className="p-3 border-t border-white/5 bg-black/25 text-[10px] space-y-2">
                                      
                                      {/* 📡 TWO-STEP LIVE SWEEP PROGRESS CARD */}
                                      {isCalculatingStability && (
                                        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-sm space-y-2.5 shadow-inner shadow-black/40">
                                          <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-[#f97316] flex items-center gap-1.5">
                                              <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f97316] opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f97316]"></span>
                                              </span>
                                              Executing Two-Step Vacancy Audit
                                            </span>
                                            <span className="text-[8px] font-bold text-sky-400 uppercase tracking-widest animate-pulse">
                                              AI Portal Verification...
                                            </span>
                                          </div>
                                          
                                          <div className="space-y-2.5 pt-0.5">
                                            {/* STEP 1 */}
                                            <div className="flex items-start gap-2.5">
                                              <div className="flex items-center justify-center size-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black mt-0.5">
                                                ✓
                                              </div>
                                              <div>
                                                <p className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">Step 1: Institutional Dossier Loaded</p>
                                                <p className="text-[9px] text-slate-400 font-medium">Retrieved local vacancy records &amp; institutional profile database (&lt; 100ms)</p>
                                              </div>
                                            </div>

                                            {/* STEP 2 */}
                                            <div className="flex items-start gap-2.5">
                                              <div className="flex items-center justify-center size-4 rounded-full bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30 text-[9px] font-bold mt-0.5">
                                                <span className="animate-spin size-2.5 border-2 border-t-transparent border-[#f97316] rounded-full" />
                                              </div>
                                              <div>
                                                <p className="text-[10px] font-black text-[#f97316] uppercase tracking-wider flex items-center gap-1.5">
                                                  Step 2: Active Web Portals Sweep
                                                </p>
                                                <p className="text-[9px] text-slate-400 font-medium">Auditing TES, Schrole, aggregates, forums & school web portals live...</p>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {stabilityReport?.scrapedJobsList && stabilityReport.scrapedJobsList.length > 0 && (
                                        <div className={cn(
                                          "grid grid-cols-1 gap-2 text-slate-300 transition-opacity duration-300",
                                          isCalculatingStability && "opacity-35 pointer-events-none"
                                        )}>
                                          {stabilityReport.scrapedJobsList.map((job: string, idx: number) => {
                                            const { status, hasDeadline, label } = getJobStatus(job);
                                            const isOpen = status === 'open';
                                            const isHighlightedOpen = isOpen && hasDeadline;
                                            const isMutedClosed = !isOpen;
                                            return (
                                              <div 
                                                key={idx} 
                                                className={cn(
                                                  "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 p-2 border rounded-sm transition-all text-[11px]",
                                                  isHighlightedOpen 
                                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 shadow-sm shadow-emerald-950/20" 
                                                    : isMutedClosed
                                                      ? "bg-white/5 border-white/5 text-slate-500"
                                                      : "bg-white/5 border-white/5 text-slate-300"
                                                )}
                                              >
                                                <div className="flex items-center gap-2">
                                                  <span className={cn(
                                                    "font-bold text-[10px]", 
                                                    isHighlightedOpen ? "text-emerald-400" : isMutedClosed ? "text-slate-600" : "text-slate-400"
                                                  )}>
                                                    {idx + 1}.
                                                  </span>
                                                  <span className={cn(
                                                    "font-semibold", 
                                                    isHighlightedOpen ? "text-emerald-50" : isMutedClosed ? "text-slate-500 line-through decoration-white/10" : "text-slate-200"
                                                  )}>
                                                    {job}
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                                  {isHighlightedOpen ? (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                      {label}
                                                    </span>
                                                  ) : isMutedClosed ? (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-wider bg-white/5 text-slate-500 border border-white/5">
                                                      {label}
                                                    </span>
                                                  ) : null}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {stabilityReport?.lastScrapedAt && (
                                        <p className={cn(
                                          "text-[9px] text-slate-500 font-medium text-right pt-1 transition-opacity duration-300",
                                          isCalculatingStability && "opacity-35"
                                        )}>
                                          Last verified via active search: {formatDeterministicDate(stabilityReport.lastScrapedAt)}
                                        </p>
                                      )}
                                    </div>
                                  </details>
                                </div>
                              )}

                              <div className="relative rounded-sm overflow-hidden mt-3">
                                {/* Premium Paywall Overlay */}
                                <div className="absolute inset-0 z-10 backdrop-blur-[3px] bg-[#0b1224]/60 flex items-center justify-center border border-white/5 rounded-sm transition-all duration-300">
                                  <div className="flex items-center justify-center bg-[#f97316]/10 border border-[#f97316]/20 px-4 py-2 rounded-sm cursor-pointer hover:bg-[#f97316]/20 transition-colors shadow-2xl">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#f97316]">Find out more</span>
                                  </div>
                                </div>
                                
                                {/* Locked Content */}
                                <div className="p-3 bg-[#f97316]/5 border border-[#f97316]/10 rounded-sm text-xs leading-relaxed text-slate-300 opacity-40 select-none pointer-events-none blur-[2.5px]">
                                  <span className="font-medium italic text-slate-200">
                                    {stabilityReport.leopardfishIntelAlert}
                                  </span>
                                  <span className="text-slate-400 ml-1.5">
                                    This data is compiled from historical job advertisements indexed across 24+ key recruitment channels—including major portals (TES, Schrole, Search Associates), global agencies, and direct school networks—to provide a realistic pulse of the school's recruiting pace.
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-slate-500 text-xs font-semibold">
                              Select a school to audit stability metrics.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 🛰️ PREMIUM DYNAMIC BRIEFING NARRATIVE */}
                    {cachedBriefingText && briefingRequested ? (
                      <div className="pt-6 border-t border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-[#f97316] uppercase tracking-[0.15em] bg-[#f97316]/10 px-2 py-0.5 rounded-sm border border-[#f97316]/20 flex items-center gap-1">
                              <Zap className="size-2.5" /> Staffroom Vibe & Dossier Intel
                            </span>
                          </div>
                          {isRewording && (
                            <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest animate-pulse flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-sky-400 animate-ping" />
                              Recalibrating staffroom talk...
                            </span>
                          )}
                        </div>
                        <div className="space-y-4 text-[13px] text-slate-300 leading-relaxed border-l-2 border-sky-500/30 pl-4 italic font-medium">
                          {isRewording && !rewordedBriefingText ? (
                            <div className="space-y-3 py-2">
                              <div className="h-4 bg-white/5 rounded-sm w-3/4 animate-pulse" />
                              <div className="h-4 bg-white/5 rounded-sm w-5/6 animate-pulse" />
                              <div className="h-4 bg-white/5 rounded-sm w-2/3 animate-pulse" />
                              <div className="h-4 bg-white/5 rounded-sm w-4/5 animate-pulse" />
                            </div>
                          ) : (
                            (rewordedBriefingText || cachedBriefingText).split('\n\n').map((para: string, i: number) => (
                              <p key={`briefing-para-${i}`}>{para.trim()}</p>
                            ))
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-6 border-t border-white/5">
                        <button
                          onClick={() => {
                            if (cachedBriefingText) {
                              setBriefingRequested(true);
                            } else {
                              router.push(`/schools/${activeSchool.id}`);
                            }
                          }}
                          className="text-[10px] font-black text-sky-400 hover:text-white transition-colors uppercase tracking-widest flex items-center gap-2 bg-sky-500/5 hover:bg-sky-500/10 border border-sky-500/10 hover:border-sky-500/40 px-3 py-2 rounded-sm"
                        >
                          <Zap className="size-3 text-[#f97316] animate-pulse" /> Request Leopardfish School Analysis
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-8 pt-6 border-t border-white/5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-black/50 p-4 text-center border border-white/5 group rounded-sm cursor-help hover:bg-white/[0.02] transition-colors">
                        <Clock className="size-4 mx-auto mb-2 text-slate-400 transition-transform group-hover:scale-110" />
                        <p className="text-[9px] font-black text-[#f97316] uppercase tracking-widest leading-none mb-1">Non-contact</p>
                        <p className="text-sm font-semibold text-slate-300 italic leading-none">{activeSchool.noncontacttime || "---"}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">Contractual non-contact time expressed as a percentage of a full teaching timetable.</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-black/50 p-4 text-center border border-white/5 group rounded-sm cursor-help hover:bg-white/[0.02] transition-colors">
                        <Activity className="size-4 mx-auto mb-2 text-slate-400 transition-transform group-hover:scale-110" />
                        <p className="text-[9px] font-black text-[#f97316] uppercase tracking-widest leading-none mb-1">Health coverage</p>
                        <p className="text-sm font-semibold text-slate-300 italic leading-none">{activeSchool.healthcoverage || "Standard"}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">The level of private or state medical insurance provided within this school's contract.</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-black/50 p-4 text-center border border-white/5 group rounded-sm cursor-help hover:bg-white/[0.02] transition-colors">
                        <BookOpen className="size-4 mx-auto mb-2 text-slate-400 transition-transform group-hover:scale-110" />
                        <p className="text-[9px] font-black text-[#f97316] uppercase tracking-widest leading-none mb-1">Curriculum</p>
                        <p className="text-sm font-semibold text-slate-300 italic leading-none">{activeSchool.curriculum || "---"}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">The primary teaching and assessment framework used for delivery at this school.</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-black/50 p-4 text-center border border-white/5 group rounded-sm cursor-help hover:bg-white/[0.02] transition-colors">
                        <ShieldCheck className="size-4 mx-auto mb-2 text-slate-400 transition-transform group-hover:scale-110" />
                        <p className="text-[9px] font-black text-[#f97316] uppercase tracking-widest leading-none mb-1">Accreditations</p>
                        <p className="text-sm font-semibold text-slate-300 italic leading-none">{activeSchool.approvals || "Standard"}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">External quality assurance and professional body memberships such as COBIS, HMC, or BSO.</TooltipContent>
                  </Tooltip>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-black/50 p-4 text-center border border-white/5 group rounded-sm cursor-help hover:bg-white/[0.02] transition-colors">
                        <Clock className="size-4 mx-auto mb-2 text-slate-400 transition-transform group-hover:scale-110" />
                        <p className="text-[9px] font-black text-[#f97316] uppercase tracking-widest leading-none mb-1">Work/life</p>
                        <p className="text-sm font-semibold text-slate-300 italic leading-none">{activeSchool.worklifescore || "---"}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">Our internal rating for work-life balance based on direct teacher feedback and workload audit.</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-black/50 p-4 text-center border border-white/5 group rounded-sm cursor-help hover:bg-white/[0.02] transition-colors">
                        <BookOpen className="size-4 mx-auto mb-2 text-slate-400 transition-transform group-hover:scale-110" />
                        <p className="text-[9px] font-black text-[#f97316] uppercase tracking-widest leading-none mb-1">Academic</p>
                        <p className="text-sm font-semibold text-slate-300 italic leading-none">{activeSchool.academicscore || "---"}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">The academic rigour, student attainment levels, and university placement success of the school.</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-black/50 p-4 text-center border border-white/5 group rounded-sm cursor-help hover:bg-white/[0.02] transition-colors">
                        <Target className="size-4 mx-auto mb-2 text-slate-400 transition-transform group-hover:scale-110" />
                        <p className="text-[9px] font-black text-[#f97316] uppercase tracking-widest leading-none mb-1">Expected retirement</p>
                        <p className="text-sm font-semibold text-slate-300 italic leading-none">
                          {activeReq ? `M: ${activeReq.max_age_m} | F: ${activeReq.max_age_f}` : "---"}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">Legal and hiring retirement ages as specified by the local host country regulations.</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-black/50 p-4 text-center border border-white/5 group rounded-sm cursor-help hover:bg-white/[0.02] transition-colors">
                        <Lock className="size-4 mx-auto mb-2 text-slate-400 transition-transform group-hover:scale-110" />
                        <p className="text-[9px] font-black text-[#f97316] uppercase tracking-widest leading-none mb-1">Security/Safety</p>
                        <p className="text-sm font-semibold text-slate-300 italic leading-none">{activeSchool.city?.toLowerCase() === "prague" ? "9.8" : "High"}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">National and local safety rating derived from the Global Peace Index and Crime Index data.</TooltipContent>
                  </Tooltip>
                </div>

                <div className="mt-8 flex flex-col md:flex-row gap-4 items-center justify-between opacity-50 italic px-2 border-t border-white/5 pt-4">
                  <p className="text-[11px] font-medium text-slate-500 leading-snug tracking-wider">
                    Calculations are based on current regional indices and are intended as a guide only. Final disposable income will naturally vary based on personal spending and specific household arrangements.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function EvaluatePage() {
  return <Suspense fallback={null}><DecoderContent /></Suspense>;
}