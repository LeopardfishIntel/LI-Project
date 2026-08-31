"use client";

import { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import {
  Zap, ShieldCheck, BookOpen, Target, Plus, Minus, Coins,
  AlertTriangle, AlertCircle, Activity, Clock, Wallet, Banknote, ArrowLeft, ArrowRight, FileText, Info, Car, Bus, Lock, ArrowDownCircle,
  Briefcase, ChevronDown, RefreshCw, HelpCircle,
  Home, Utensils, Wifi, Smartphone, Coffee, TramFront, Stethoscope, Award, TrendingUp, Users,
  HeartPulse, Laptop, Building, Sliders, BarChart3,
  Sparkles, ArrowUpRight, MapPin, Calendar, Star, Loader2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { useCollection, useFirestore, useMemoFirebase, useDoc, useAuth } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { rewordDossierBriefing, getSchoolStabilityReport } from './actions';
import { logTelemetryEvent } from '@/lib/telemetry';
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

const ACRONYMS: Record<string, string> = {
  'CIS': 'Council of International Schools',
  'WASC': 'Western Association of Schools and Colleges',
  'NEASC': 'New England Association of Schools and Colleges',
  'COBIS': 'Council of British International Schools',
  'BSME': 'British Schools in the Middle East',
  'FOBISIA': 'Federation of British International Schools in Asia',
  'KHDA': 'Knowledge and Human Development Authority',
  'ADEK': 'Abu Dhabi Department of Education and Knowledge',
};

const categorizeInsurance = (val: string) => {
  if (!val || val === '—') return 'Unknown';
  if (val.toLowerCase().includes('comp') || val.toLowerCase().includes('full')) return 'Comprehensive';
  return val;
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
  const today = new Date();
  
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

const parseJobString = (job: string) => {
  const lastDashIdx = job.lastIndexOf(' - ');
  let main = job;
  let source = 'Web';
  if (lastDashIdx !== -1) {
    main = job.substring(0, lastDashIdx).trim();
    source = job.substring(lastDashIdx + 3).trim();
  }

  // Extract title (everything before the last parenthesis)
  const parenIdx = main.lastIndexOf('(');
  const title = parenIdx !== -1 ? main.substring(0, parenIdx).trim() : main.trim();

  // Extract posted and closes from parentheticals
  const parentheticalMatches = [...job.matchAll(/\(([^)]+)\)/g)];
  let postedDate = '';
  let closesDate = '';
  if (parentheticalMatches.length > 0) {
    const dateParenthetical = parentheticalMatches.find(m => {
      const text = m[1].toLowerCase();
      return text.includes('posted:') || text.includes('closes:') || /202[4-7]|cycle/i.test(text);
    }) || parentheticalMatches[parentheticalMatches.length - 1];
    
    const content = dateParenthetical[1];
    const parts = content.split(';').map(s => s.trim());
    const postedPart = parts.find(p => p.toLowerCase().includes('posted:'));
    if (postedPart) postedDate = postedPart.replace(/posted:\s*/i, '').trim();
    const closesPart = parts.find(p => p.toLowerCase().includes('closes:'));
    if (closesPart) closesDate = closesPart.replace(/closes:\s*/i, '').trim();
  }

  const statusInfo = getJobStatus(job);
  if (statusInfo.status === 'open' && !closesDate) {
    if (postedDate) {
      const pDate = new Date(postedDate);
      if (!isNaN(pDate.getTime())) {
        const defaultCloses = new Date(pDate.getTime() + 28 * 24 * 60 * 60 * 1000);
        closesDate = defaultCloses.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      } else {
        closesDate = "18 Jun 2026";
      }
    } else {
      closesDate = "18 Jun 2026";
    }
  }
  const lowerTitle = title.toLowerCase();
  let department: "Leadership" | "Secondary" | "Primary" = "Secondary";
  if (lowerTitle.includes("primary") || lowerTitle.includes("prep") || lowerTitle.includes("early years") || lowerTitle.includes("preschool") || lowerTitle.includes("kindergarten") || lowerTitle.includes("eyfs") || lowerTitle.includes("ks1") || lowerTitle.includes("key stage one") || lowerTitle.includes("class teacher") || lowerTitle.includes("practitioner") || lowerTitle.includes("partner") || lowerTitle.includes("sestra") || lowerTitle.includes("nurse")) {
    department = "Primary";
  } else if (lowerTitle.includes("head") || lowerTitle.includes("director") || lowerTitle.includes("principal") || lowerTitle.includes("coordinator") || lowerTitle.includes("headteacher") || lowerTitle.includes("headmaster") || lowerTitle.includes("headmistress")) {
    const isMiddleLeader = 
      lowerTitle.includes("head of department") || 
      lowerTitle.includes("head of faculty") || 
      lowerTitle.includes("head of dept") || 
      (lowerTitle.includes("head of") && [
        "science", "math", "english", "music", "art", "drama", "pe", "physical education", 
        "history", "geography", "biology", "chemistry", "physics", "languages", "mfl", 
        "french", "spanish", "german", "mandarin", "chinese", "humanities", "computing", 
        "computer", "ict", "design", "business", "economics", "inclusion", "learning support", 
        "eal", "sen", "senco", "curriculum", "subject", "year", "grade", "house"
      ].some(kw => lowerTitle.includes(kw)));

    if (!isMiddleLeader) {
      department = "Leadership";
    }
  }
  return { title, source, postedDate, closesDate, status: statusInfo.status, label: statusInfo.label, department, original: job };
};

const getJobPostedDate = (job: string): Date | null => {
  const parentheticalMatches = [...job.matchAll(/\(([^)]+)\)/g)];
  if (parentheticalMatches.length === 0) return null;
  const dateParenthetical = parentheticalMatches.find(m => {
    const text = m[1].toLowerCase();
    return text.includes('posted:') || text.includes('closes:') || /202[4-7]|cycle/i.test(text);
  }) || parentheticalMatches[parentheticalMatches.length - 1];

  const content = dateParenthetical[1];
  const parts = content.split(';').map(s => s.trim());

  // 1. Explicit Posted:
  const postedPart = parts.find(p => p.toLowerCase().includes('posted:'));
  if (postedPart) {
    const dateStr = postedPart.replace(/posted:\s*/i, '').trim();
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Explicit Closes: (posted is approx Closes - 28 days)
  const closesPart = parts.find(p => p.toLowerCase().includes('closes:'));
  if (closesPart) {
    const dateStr = closesPart.replace(/closes:\s*/i, '').trim();
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return new Date(d.getTime() - 28 * 24 * 60 * 60 * 1000);
    }
  }

  // 3. Fallbacks based on start date or cycle mentions
  const lower = content.toLowerCase();
  const today = new Date();
  if (lower.includes('2025')) {
    return new Date("2025-01-01");
  }
  if (lower.includes('2026')) {
    return new Date("2026-01-01");
  }

  return null;
};

const processAndFilterJobs = (jobs: string[]) => {
  const today = new Date();
  const twentyFourMonthsAgo = new Date(today.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);

  const processed = jobs.map(job => {
    const parsed = parseJobString(job);
    const postedDate = getJobPostedDate(job);
    const recruitmentCycle = (postedDate && postedDate < new Date("2025-05-21")) ? "HISTORIC_Y1" : "CURRENT";
    return { ...parsed, rawPostedDate: postedDate, recruitmentCycle };
  });

  // Filter: Keep if postedDate >= twentyFourMonthsAgo OR if postedDate is null
  const filtered = processed.filter(job => {
    if (!job.rawPostedDate) return true;
    return job.rawPostedDate >= twentyFourMonthsAgo;
  });

  // Sort: Open jobs first, then closed.
  return filtered.sort((a, b) => {
    if (a.status === 'open' && b.status !== 'open') return -1;
    if (a.status !== 'open' && b.status === 'open') return 1;

    const dateA = a.rawPostedDate ? a.rawPostedDate.getTime() : today.getTime();
    const dateB = b.rawPostedDate ? b.rawPostedDate.getTime() : today.getTime();
    return dateB - dateA;
  });
};

function DecoderContent() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<{
    jobId?: string;
    jobTitle?: string;
    department?: string;
    curriculum?: string;
    applyUrl?: string;
    closesDate?: string;
    savingsPotential?: number;
    schoolRating?: string;
    source?: string;
    city?: string;
    country?: string;
  } | null>(null);
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
  const [transportMode, setTransportMode] = useState<"P" | "C">("P");
  const [benchmark, setBenchmark] = useState("GBP");
  const [overrideBedrooms, setOverrideBedrooms] = useState<number | null>(null);
  const [showUpliftOptions, setShowUpliftOptions] = useState(false);
  const [uplift13, setUplift13] = useState(false);
  const [uplift14, setUplift14] = useState(false);
  const [lifestyleMode, setLifestyleMode] = useState<"Saver" | "Comfortable" | "Full Expat">("Comfortable");
  
  const [rewordedBriefingText, setRewordedBriefingText] = useState<string | null>(null);
  const [isRewording, setIsRewording] = useState(false);
  const [lastRewordedSource, setLastRewordedSource] = useState<string>("");
  const [briefingRequested, setBriefingRequested] = useState(true);
  const [surplusDisplayCurrency, setSurplusDisplayCurrency] = useState<"USD" | "GBP" | "EUR" | "Local">("Local");

  const [stabilityReport, setStabilityReport] = useState<any>(null);
  const [isCalculatingStability, setIsCalculatingStability] = useState(false);
    const [stabilityCountdown, setStabilityCountdown] = useState(90);
  const [stabilityError, setStabilityError] = useState<string | null>(null);
  const [turnoverUnlocked, setTurnoverUnlocked] = useState(false);
  const [requestedSchoolId, setRequestedSchoolId] = useState<string | null>(null);
  const [requestedJobTitle, setRequestedJobTitle] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlSchoolId = params.get("schoolId") || params.get("id");
      const jobTitle = params.get("jobTitle");
      if (urlSchoolId) setRequestedSchoolId(urlSchoolId);
      if (jobTitle) setRequestedJobTitle(jobTitle);
    }
  }, [mounted]);


  // ⏱️ STABILITY CALCULATION COUNTDOWN (starts at 90, decrements every 1 second)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isCalculatingStability) {
      setStabilityCountdown(90);
      interval = setInterval(() => {
        setStabilityCountdown((prev) => {
          if (prev <= 1) {
            return 1;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setStabilityCountdown(90);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCalculatingStability]);


  
  useEffect(() => { setMounted(true); }, []);

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

  const schoolJobsQuery = useMemoFirebase(() => (mounted && firestore && activeSchool?.id ? collection(firestore, 'schools', activeSchool.id, 'jobs') : null), [firestore, mounted, activeSchool?.id]);
  const { data: schoolJobsData } = useCollection<any>(schoolJobsQuery);

  const allProcessedJobs = useMemo(() => {
    if (!schoolJobsData) return [];
    const today = new Date();
    const twentyFourMonthsAgo = new Date(today.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);

    return schoolJobsData.map((job: any) => {
      const closes = job.closingDate?.seconds 
        ? new Date(job.closingDate.seconds * 1000) 
        : new Date(job.closingDate || Date.now());
      const scraped = job.scrapedAt?.seconds 
        ? new Date(job.scrapedAt.seconds * 1000) 
        : new Date(job.scrapedAt || Date.now());

      const isExpired = closes < today || job.status === 'expired' || job.status === 'rejected';
      const recruitmentCycle = (closes < new Date("2025-05-21")) ? "HISTORIC_Y1" : "CURRENT";
      
      // Determine department
      let department = "Secondary";
      const lowerTitle = (job.title || "").toLowerCase();
      if (lowerTitle.includes("primary") || lowerTitle.includes("prep") || lowerTitle.includes("early years") || lowerTitle.includes("preschool") || lowerTitle.includes("kindergarten") || lowerTitle.includes("eyfs") || lowerTitle.includes("ks1") || lowerTitle.includes("class teacher")) {
        department = "Primary";
      } else if (lowerTitle.includes("head") || lowerTitle.includes("director") || lowerTitle.includes("principal") || lowerTitle.includes("coordinator")) {
        department = "Leadership";
      }

      return {
        title: job.title,
        source: job.sourceName || "Web",
        postedDate: scraped.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        closesDate: closes.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        status: isExpired ? 'closed' : 'open',
        department,
        recruitmentCycle,
        rawPostedDate: scraped,
        rawClosesDate: closes
      };
    }).filter(job => job.rawPostedDate >= twentyFourMonthsAgo)
      .sort((a, b) => {
        if (a.status === 'open' && b.status !== 'open') return -1;
        if (a.status !== 'open' && b.status === 'open') return 1;
        return b.rawPostedDate.getTime() - a.rawPostedDate.getTime();
      });
  }, [schoolJobsData]);

  // 🏎️ TACTICAL COUNTRY OVERRIDE: Oman defaults to Car Hire
  useEffect(() => {
    if (settings.country.toLowerCase() === "oman") {
      setTransportMode("C");
    }
  }, [settings.country]);
 
   useEffect(() => {
     if (mounted && allSchools && allSchools.length > 0) {
       const params = new URLSearchParams(window.location.search);
       const urlSchoolId = params.get('schoolId') || params.get('id');
       const jobTitle = params.get('jobTitle');
       
       if (jobTitle) {
         setSelectedOpportunity({
           jobId: params.get('jobId') || undefined,
           jobTitle,
           department: params.get('department') || undefined,
           curriculum: params.get('curriculum') || undefined,
           applyUrl: params.get('applyUrl') || undefined,
           closesDate: params.get('closesDate') || undefined,
           savingsPotential: params.get('savingsPotential') ? Number(params.get('savingsPotential')) : undefined,
           schoolRating: params.get('schoolRating') || undefined,
           source: params.get('source') || undefined,
           city: params.get('city') || undefined,
           country: params.get('country') || undefined
         });
       }

       if (urlSchoolId) {
         const found = allSchools.find((s: any) => s.id === urlSchoolId);
         if (found) {
           setSettings(prev => ({
             ...prev,
             schoolId: found.id,
             country: found.country || found.region || ""
           }));
         }
       }
     }
   }, [mounted, allSchools]);
 
   useEffect(() => {
     setBriefingRequested(false);
   }, [settings.schoolId]);

  const loadStabilityReport = useCallback(async (force: boolean = false) => {
    if (!activeSchool) return;
    setIsCalculatingStability(true);
    setStabilityError(null);
    if (force) {
      setStabilityReport(null);
    }
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
      const errMsg = err?.message || String(err);
      console.error("AI Stability Calculation Error:", err);
      if (
        errMsg.includes("reading 'call'") ||
        errMsg.includes("undefined (reading 'call')") ||
        errMsg.includes("Failed to fetch") ||
        errMsg.includes("Server Action") ||
        errMsg.includes("not found on the server")
      ) {
        console.warn("Detected Webpack chunk/HMR module mismatch. Reloading page to sync bundles...", err);
        if (typeof window !== 'undefined') {
          window.location.reload();
          return;
        }
      }
      setStabilityError(errMsg || "Failed to contact stability engine.");
    } finally {
      setIsCalculatingStability(false);
    }
  }, [activeSchool]);

  useEffect(() => {
    setTurnoverUnlocked(false);
    setStabilityReport(null); // Clear previous report immediately to show progress card/loader!
    if (!activeSchool) {
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
    const slugify = (str: string) => (str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const rawCountry = getSchoolField(activeSchool, ['country', 'region']) || '';
    const rawCity = getSchoolField(activeSchool, ['city', 'town', 'location']) || '';
    const countrySlug = slugify(canonicalCountry(String(rawCountry)));
    const citySlug = slugify(String(rawCity));
    const expectedId = citySlug ? `${countrySlug}-${citySlug}` : countrySlug;

    let match = transportIntel.find((t: any) => t.id === expectedId);
    if (match) return match;

    match = transportIntel.find((t: any) => t.id === countrySlug);
    if (match) return match;

    match = transportIntel.find((t: any) => t.id.startsWith(countrySlug + '-'));
    return match || null;
  }, [activeSchool, transportIntel]);

  const currency = activeCOL?.currencyCode || (settings.country === "Portugal" ? "EUR" : "GBP");
  const usdToLocal = (usdAmount: number) => (usdAmount / (currentRates['USD'] || 1.27)) * (currentRates[currency] || 1.0);

  useEffect(() => {
    const salaryVal = getSchoolField(activeSchool, ['salaryrange', 'salary', 'netbase', 'netmonthlyusd', 'salaryrangeusd']);
    if (salaryVal) {
      const str = String(salaryVal).trim();
      const isUSD = str.includes("$") || str.toUpperCase().includes("USD");

      const cleanRange = str
        .replace(/,/g, '')
        .replace(/\.\d+/g, '')
        .replace(/k/gi, '000');
      const range = cleanRange.match(/\d+/g);
      const min = range ? parseInt(range[0]) : 0;
      const max = range && range.length > 1 ? parseInt(range[1]) : min;
      let median = Math.round((min + max) / 2);

      // Annual to Monthly Conversion (if the parsed median exceeds 10,000, divide by 12)
      if (median >= 10000) {
        median = Math.round(median / 12);
      }

      // Convert from USD to local currency ONLY if original string was in USD and local currency is not USD
      let monthlyLocal = median;
      if (isUSD && currency !== "USD") {
        monthlyLocal = Math.round(usdToLocal(median));
      }

      setSettings(prev => ({ ...prev, netSalary: monthlyLocal.toString() }));
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

    const adults = (status === "Single") ? 1 : 2;
    const children = status === "Family +1" ? 1 : (status === "Family +2" ? 2 : (status === "Family +3" ? 3 : 0));

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

    const housingStatusRaw = String(getSchoolField(activeSchool, ['housingprovision', 'housing', 'accommodation']) || '').toLowerCase();
    const isHousingProvidedByDefault = housingStatusRaw.includes('provided');

    let isProvided = false;
    if (overrideBedrooms === 4) {
      isProvided = true;
    } else if (overrideBedrooms === null && isHousingProvidedByDefault) {
      isProvided = true;
    }

    const standardRentKey = status === "Single" ? 'rent1br' : (status.includes("Family") ? 'rent3br' : 'rent2br');
    const activeRentKey = (overrideBedrooms !== null && overrideBedrooms !== 4) ? `rent${overrideBedrooms}br` : standardRentKey;

    // 🏠 PROPERTY ADVICE LOGIC
    const propertyLabels: Record<string, string> = { 
      'rent0br': "Shared",
      'rent1br': "1-Bed Residence", 
      'rent2br': "2-Bed Residence", 
      'rent3br': "3-Bed Residence" 
    };
    const propertyLabel = isProvided ? "Provided" : (propertyLabels[activeRentKey] || "Standard Residence");

    const getF = (data: any, keys: string[]) => {
      const targetKeys = keys.map(k => k.toLowerCase().replace(/\s+/g, ''));
      const foundKey = Object.keys(data || {}).find(k => targetKeys.includes(k.toLowerCase().replace(/\s+/g, '')));
      return foundKey ? data[foundKey] : null;
    };

    const rentMult = lifestyleMode === "Saver" ? 0.75 : (lifestyleMode === "Full Expat" ? 1.4 : 1.0);
    const groceryMult = lifestyleMode === "Saver" ? 0.8 : (lifestyleMode === "Full Expat" ? 1.25 : 1.0);
    const lifestyleMult = lifestyleMode === "Saver" ? 0.4 : (lifestyleMode === "Full Expat" ? 2.0 : 1.0);

    let baseRentUSD = 0;
    if (isProvided) {
      baseRentUSD = 0;
    } else if (overrideBedrooms === 0) {
      const rent3brVal = safeParse(getF(activeCOL, ['rent3br']) || getF(activeCOL, ['rent2br']) || getF(activeCOL, ['rent1br']) || 0);
      baseRentUSD = rent3brVal / 3;
    } else {
      baseRentUSD = safeParse(getF(activeCOL, [activeRentKey]) || getF(activeCOL, [standardRentKey]) || getF(activeCOL, ['rent1br']) || 0);
    }

    const rentCost = usdToLocal(baseRentUSD * rentMult);

    let canDownsize = false;
    if (!isProvided && overrideBedrooms === null) {
      if (activeRentKey === 'rent3br' || activeRentKey === 'rent2br') {
        canDownsize = true;
      }
    }

    const groceriesCost = usdToLocal(getVal(getF(activeCOL, ['groceries', 'food']), pKey, scalar) * groceryMult);
    const utilitiesCost = usdToLocal(getVal(getF(activeCOL, ['utilities', 'bills']), pKey, scalar * 0.8));
    
    // Split connectivity Cost
    const internetCost = usdToLocal(getVal(getF(activeCOL, ['internet', 'connectivity']), pKey, 1));
    const mobileCost = usdToLocal(getVal(getF(activeCOL, ['mobile', 'phone', 'mobilephone']), pKey, 1) * personCount);
    const connectivityCost = internetCost + mobileCost;

    // 🛰️ NESTED TRANSPORT PROTOCOL
    const isCar = transportMode === "C";
    const transportMap = isCar
      ? (tIntel?.carHire || activeCOL?.transport?.carPurchase || activeCOL?.carPurchase || activeCOL?.transport?.carHire || activeCOL?.carHire)
      : (tIntel?.publicTransport || activeCOL?.transport?.publicTransport || activeCOL?.publicTransport);

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

    const transportVal = (typeof transportMap === 'object' && transportMap !== null)
      ? (transportMap[transportKey] !== undefined ? safeParse(transportMap[transportKey]) : safeParse(transportMap["family3Children"] || 0))
      : (parseFloat(String(transportMap)) || 0);
    const transportCost = usdToLocal(transportVal);
    const socialCost = usdToLocal(getVal(getF(activeCOL, ['social', 'dining', 'diningsocial']), pKey, scalar) * lifestyleMult);
    
    // Medical gaps cost
    const medicalVal = (safeParse(getF(activeCOL, ['uncoveredMedical', 'uncoveredmedical'])) || 50) * adults + (safeParse(getF(activeCOL, ['uncoveredMedical', 'uncoveredmedical'])) || 50) * 0.5 * children;
    const medicalCost = usdToLocal(medicalVal);
    
    const manualCost = safeParse(manualAdjustments);

    const totalOut = rentCost + groceriesCost + utilitiesCost + connectivityCost + transportCost + socialCost + medicalCost + manualCost;
    const surplus = totalIn - totalOut;
    const rateOfSaving = totalIn > 0 ? Math.round((surplus / totalIn) * 100) : 0;

    // Currency Benchmark Conversion
    const surplusBenchmark = (surplus / (currentRates[currency] || 1.0)) * (currentRates[benchmark] || 1.0);

    return {
      costs: { rent: rentCost, groceries: groceriesCost, utilities: utilitiesCost, connectivity: connectivityCost, internet: internetCost, mobile: mobileCost, transport: transportCost, social: socialCost, medical: medicalCost, manual: manualCost },
      propertyLabel, canDownsize, standardRentKey,
      totalIn, totalOut, surplus, surplusBenchmark, rateOfSaving, 
      housingStatus: isProvided ? 'provided' : 'custom',
      isHousingProvidedByDefault,
      currency, reliability: activeCOL?.dataReliabilityScore,
      countryIntel, uplift13, uplift14
    };
  }, [activeSchool, activeCOL, settings, responsibilityAllowance, manualAdjustments, extraIncome, currency, transportMode, benchmark, overrideBedrooms, currentRates, uplift13, uplift14, tIntel, lifestyleMode]);

  const surplusValStr = useMemo(() => {
    return Math.round(analysis?.surplus || 0).toLocaleString();
  }, [analysis?.surplus]);

  const surplusFontSizes = useMemo(() => {
    if (surplusValStr.length > 9) {
      return { number: "text-3xl", currency: "text-base" };
    }
    if (surplusValStr.length > 7) {
      return { number: "text-4xl", currency: "text-lg" };
    }
    return { number: "text-5xl", currency: "text-xl" };
  }, [surplusValStr]);

  // 🛰️ Telemetry: Flight Simulator Dial tracking (Evaluate Page)
  useEffect(() => {
    if (!mounted || !activeSchool) return;

    const timer = setTimeout(() => {
      if (settings.netSalary === "0" && settings.partnerSalary === "0") return;

      const resultingStatus = (analysis?.rateOfSaving ?? 0) <= 0
        ? 'Deficit'
        : (analysis?.rateOfSaving ?? 0) <= 10
        ? 'Limited Potential'
        : 'Thriving';

      logTelemetryEvent('simulator_dial_adjusted', {
        target_country: activeSchool.country || 'unknown',
        target_school: activeSchool.schoolname || activeSchool.name || 'unknown',
        deployment_profile: settings.familyStatus,
        dial_modified: 'net_salary',
        previous_value: 0,
        new_value: Math.round((Number(settings.netSalary) || 0) / (currentRates[currency] || 1.0)),
        resulting_surplus_percentage: analysis?.rateOfSaving || 0,
        resulting_status: resultingStatus,
        isAuthenticated: !!user,
        user_type: user ? 'authenticated' : 'guest',
        user_email: user?.email
      });
    }, 1500); // 1.5s debounce

    return () => clearTimeout(timer);
  }, [settings.netSalary, activeSchool, mounted, user, analysis?.rateOfSaving, settings.familyStatus, currency, currentRates]);

  useEffect(() => {
    if (!mounted || !activeSchool || !settings.partnerSalary || settings.partnerSalary === "0") return;

    const timer = setTimeout(() => {
      const resultingStatus = (analysis?.rateOfSaving ?? 0) <= 0
        ? 'Deficit'
        : (analysis?.rateOfSaving ?? 0) <= 10
        ? 'Limited Potential'
        : 'Thriving';

      logTelemetryEvent('simulator_dial_adjusted', {
        target_country: activeSchool.country || 'unknown',
        target_school: activeSchool.schoolname || activeSchool.name || 'unknown',
        deployment_profile: settings.familyStatus,
        dial_modified: 'partner_salary',
        previous_value: 0,
        new_value: Number(settings.partnerSalary) || 0,
        resulting_surplus_percentage: analysis?.rateOfSaving || 0,
        resulting_status: resultingStatus,
        isAuthenticated: !!user,
        user_type: user ? 'authenticated' : 'guest',
        user_email: user?.email
      });
    }, 1500); // 1.5s debounce

    return () => clearTimeout(timer);
  }, [settings.partnerSalary, activeSchool, mounted, user, analysis?.rateOfSaving, settings.familyStatus]);

  useEffect(() => {
    if (!mounted || !activeSchool || overrideBedrooms === null) return;

    const resultingStatus = (analysis?.rateOfSaving ?? 0) <= 0
      ? 'Deficit'
      : (analysis?.rateOfSaving ?? 0) <= 10
      ? 'Limited Potential'
      : 'Thriving';

    logTelemetryEvent('simulator_dial_adjusted', {
      target_country: activeSchool.country || 'unknown',
      target_school: activeSchool.schoolname || activeSchool.name || 'unknown',
      deployment_profile: settings.familyStatus,
      dial_modified: 'housing_allowance',
      previous_value: Number(analysis?.standardRentKey?.replace(/\D/g, '')) || 3,
      new_value: overrideBedrooms,
      resulting_surplus_percentage: analysis?.rateOfSaving || 0,
      resulting_status: resultingStatus,
      isAuthenticated: !!user,
      user_type: user ? 'authenticated' : 'guest',
      user_email: user?.email
    });
  }, [overrideBedrooms, activeSchool, mounted, user, settings.familyStatus, analysis?.rateOfSaving, analysis?.standardRentKey]);

  // 🛰️ Telemetry: School profile view tracking
  useEffect(() => {
    if (!mounted || !activeSchool) return;

    logTelemetryEvent('school_profile_viewed', {
      school_name: activeSchool.schoolname || activeSchool.name || 'unknown',
      country_name: activeSchool.country || 'unknown',
      isAuthenticated: !!user,
      user_type: user ? 'authenticated' : 'guest',
      user_email: user?.email
    });
  }, [activeSchool?.id, mounted, user, activeSchool?.schoolname, activeSchool?.name, activeSchool?.country]);

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
      <div className="flex flex-col lg:flex-row min-h-screen bg-[#020617] text-white selection:bg-[#d95f02]">

        {/* Sidebar: Manual Unrolled Search Settings */}
        <div className="w-full lg:w-72 bg-[#0b1224] border-r border-white/5 p-4 lg:fixed lg:h-full overflow-y-auto z-30 shadow-xl">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] font-black text-teal-400 uppercase tracking-[0.3em] mb-4 hover:text-white transition-colors"><ArrowLeft className="size-3" /> Back</button>
          <p className="text-[11px] font-black text-[#d95f02] uppercase tracking-[0.4em] mb-4 italic">Search settings</p>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed mb-2">Target country</label>
              <Select value={settings.country} onValueChange={(v) => setSettings({ ...settings, country: v, schoolId: "" })}>
                <SelectTrigger className="bg-black/40 border-white/10 h-10 text-xs font-bold uppercase"><SelectValue placeholder="Country" /></SelectTrigger>
                <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold uppercase text-xs">
                  {allSchools?.map((s: any) => canonicalCountry(s.country)).filter((v: any, i: any, a: any) => v && a.indexOf(v) === i).sort().map((c: any) => <SelectItem key={c} value={c}>{formatCountry(c)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed mb-2">Select school</label>
              <Select disabled={!settings.country} value={settings.schoolId} onValueChange={(v) => setSettings({ ...settings, schoolId: v })}>
                <SelectTrigger className="bg-black/40 border-white/10 h-10 text-xs font-bold uppercase"><SelectValue placeholder="School" /></SelectTrigger>
                <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold uppercase text-xs">
                  {allSchools?.filter((s: any) => canonicalCountry(s.country) === canonicalCountry(settings.country))
                    .sort((a: any, b: any) => (a.schoolname || '').localeCompare(b.schoolname || ''))
                    .map((s: any) => <SelectItem key={s.id || s.schoolname} value={s.id}>{s.schoolname}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed mb-2">Family status</label>
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

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Lifestyle Mode</label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help"><Info className="size-2.5 text-sky-400" /></span>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="start" className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2 max-w-xs shadow-xl z-50">
                    Stress test your savings. Switch between Saver (modest digs & supermarket basics), Comfortable (comfy flat & Friday pub pints), or Full Expat (swanky pad & dining out).
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex bg-black/40 p-0.5 rounded-sm border border-white/10 w-full justify-between">
                {(['Saver', 'Comfortable', 'Full Expat'] as const).map((mode) => {
                  const tooltips: Record<string, string> = {
                    Saver: "Saver Mode (-25% Rent, -20% Groceries, -60% Social): Modest apartment slightly further out, local hypermarket shopping, and cooking at home.",
                    Comfortable: "Comfortable Mode (Baseline): Standard expat residence, average supermarket shopping, and regular dining out.",
                    "Full Expat": "Full Expat Mode (+40% Rent, +25% Groceries, +100% Social): High-end compound/waterfront pad, imported brand groceries, and weekend hotel dining & leisure."
                  };
                  return (
                    <Tooltip key={mode}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setLifestyleMode(mode)}
                          className={cn(
                            "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all italic flex-1 text-center",
                            lifestyleMode === mode ? "bg-slate-300 text-slate-950 shadow-[0_0_10px_rgba(148,163,184,0.1)] rounded-sm" : "text-slate-500 hover:text-slate-300"
                          )}
                        >
                          {mode}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-[#0b1224] border border-white/10 text-white text-[10px] font-medium p-2.5 max-w-xs shadow-xl z-50 leading-relaxed">
                        {tooltips[mode]}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-relaxed">Monthly net salary ({currency})</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help"><Info className="size-2.5 text-sky-400" /></span>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="start" className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2 max-w-xs shadow-xl z-50">
                      Based on a median salary for a qualified teacher with five years experience. If you have an offer, input this here.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input type="number" value={settings.netSalary} onChange={(e) => setSettings({ ...settings, netSalary: e.target.value })} className={cn("bg-black/40 border-white/10 h-10 font-black text-sm", noSpinners)} />
              </div>
              {settings.familyStatus !== "Single" && settings.familyStatus !== "Married (sole earner)" && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-relaxed mb-2">Partner net salary ({currency})</label>
                  <Input type="number" value={settings.partnerSalary} onChange={(e) => setSettings({ ...settings, partnerSalary: e.target.value })} className={cn("bg-black/40 border-white/10 h-10 font-black text-sm", noSpinners)} />
                </div>
              )}
            </div>

            <button
              onClick={() => router.push(`/decide?ids=${activeSchool?.id}`)}
              disabled={!activeSchool}
              className="w-full bg-zinc-950/60 backdrop-blur-xl border border-[#d95f02] text-white font-bold rounded-none h-10 transition-all hover:bg-[#d95f02] hover:text-white shadow-[0_0_15px_rgba(249,115,22,0.15)] text-xs tracking-wider mt-2 disabled:opacity-50"
            >
              Compare Options
            </button>
          </div>
        </div>

        {/* Dashboard Area */}
        <div className="flex-1 lg:ml-72 p-4 md:p-6">
          {!activeSchool ? (
            requestedSchoolId ? (
              <div className="min-h-[70vh] flex flex-col items-center justify-center py-10 px-4">
                <div className="w-full max-w-[560px] bg-[#0f172a]/90 backdrop-blur-xl border border-white/10 rounded-xl p-8 md:p-10 shadow-2xl flex flex-col items-center text-center space-y-6 animate-in fade-in duration-300">
                  <div className="relative flex items-center justify-center my-2">
                    <div className="absolute size-16 bg-[#D96B27]/20 rounded-full animate-ping" />
                    <Loader2 className="animate-spin size-10 text-[#D96B27] relative z-10" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                      Retrieving School Data...
                    </h3>
                    <p className="text-xs md:text-sm text-slate-400 font-medium leading-relaxed max-w-[440px]">
                      {requestedJobTitle 
                        ? `Loading profile metrics, cost-of-living data, and financial projections for "${requestedJobTitle}"...` 
                        : "Loading profile metrics, cost-of-living data, and financial projections..."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-full text-[11px] font-mono text-slate-300">
                    <span className="size-2 rounded-full bg-[#38BDF8] animate-pulse" />
                    <span>Target School ID: {requestedSchoolId.replace(/^FLIS/i, "")}</span>
                  </div>
                </div>
              </div>
            ) : (
            <div className="min-h-[70vh] flex flex-col items-center justify-center py-10 px-4">
              <div className="w-full max-w-[680px] bg-[#0f172a]/60 backdrop-blur-xl border border-white/10 rounded-xl p-8 shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Hero Section */}
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="hero-header-group flex flex-col items-center text-center gap-2 select-none w-full">
                    <h1 className="brand-title text-[32px] md:text-[44px] font-bold tracking-[-0.5px] leading-[1.1] text-center mb-3.5 font-sans">
                      <span className="brand-orange text-[#D96B27]">Leopardfish</span>
                      <span className="brand-blue text-[#0073E6] ml-3 md:ml-[16px]">Intel</span>
                    </h1>
                    <h2 className="text-2xl md:text-3xl font-semibold text-white leading-tight">
                      School Profiles & Financial Estimates
                    </h2>
                  </div>
                  
                  <p className="text-sm md:text-[14px] text-[#94A3B8] font-medium leading-relaxed max-w-[540px]">
                    Select a target country and school to evaluate estimated net savings, cost of living breakdowns, and community insights.
                  </p>
                  
                  {/* Opinion & Data Disclaimer Badge */}
                  <div className="flex items-center justify-center gap-2 mt-1 mb-2">
                    <p className="text-[12px] italic text-[#64748B] leading-normal font-medium max-w-[540px]">
                      Metrics are independent estimates derived from community submissions and projections.
                    </p>
                  </div>
                </div>

                {/* 3-Step Mini Guide Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                  
                  {/* Step 1 */}
                  <div className="step-card-01 bg-white/[0.03] border border-white/[0.05] rounded-lg p-4 space-y-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="step-number-badge text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">01</span>
                      <Target className="step-icon size-4 text-slate-400 opacity-70" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-semibold text-white">Select Target</h4>
                      <p className="text-[12px] text-[#CBD5E1] mt-1 leading-normal">Select a target country and school.</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-white/[0.03] border border-white/[0.05] rounded-lg p-4 space-y-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">02</span>
                      <Sliders className="size-4 text-slate-400" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-semibold text-white">Adjust Profile</h4>
                      <p className="text-[12px] text-[#CBD5E1] mt-1 leading-normal">Adjust family status and lifestyle mode and salary.</p>
                    </div>
                  </div>

                  {/* Step-3 */}
                  <div className="bg-white/[0.03] border border-white/[0.05] rounded-lg p-4 space-y-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">03</span>
                      <BarChart3 className="size-4 text-slate-400" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-semibold text-white">Compare Options</h4>
                      <p className="text-[12px] text-[#CBD5E1] mt-1 leading-normal">Click to view your projected savings and lifestyle match.</p>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )
          ) : (
            <div className="max-w-5xl mx-auto space-y-4 animate-in fade-in duration-500">
              {/* 🎯 Replicated Evaluating Opportunity Card at Top of Page */}
              {selectedOpportunity && (
                <div className="relative group bg-gradient-to-br from-[#0b1224] via-[#0f172a] to-[#0b1224] border-2 border-[#FF6B35]/50 p-5 md:p-6 shadow-[0_0_25px_rgba(255,107,53,0.15)] rounded-sm animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-[#FF6B35]/20 border border-[#FF6B35]/50 text-[#FF6B35] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-sm flex items-center gap-1.5 shadow-[0_0_10px_rgba(255,107,53,0.2)]">
                          <Sparkles className="size-3 text-[#FF6B35]" /> EVALUATING OPPORTUNITY
                        </span>
                        {selectedOpportunity.curriculum && (
                          <span className="bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-sm text-slate-300">
                            [{selectedOpportunity.curriculum}]
                          </span>
                        )}
                        {selectedOpportunity.department && (
                          <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-sm">
                            {selectedOpportunity.department}
                          </span>
                        )}
                      </div>

                      <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                        {selectedOpportunity.jobTitle}
                      </h1>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <span className="text-sm font-semibold text-[#38BDF8] tracking-tight flex items-center gap-1">
                          <Building className="size-3.5" /> {getSchoolField(activeSchool, ['schoolname', 'name', 'school'])}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5" /> {getSchoolField(activeSchool, ['city', 'town', 'location'])}, {getSchoolField(activeSchool, ['country', 'region'])}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      {selectedOpportunity.applyUrl && (
                        <a
                          href={selectedOpportunity.applyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-[#FF6B35] hover:bg-[#ff7e4f] text-white px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-sm transition-all shadow-[0_0_15px_rgba(255,107,53,0.3)] hover:scale-[1.02]"
                        >
                          Apply for Role
                          <ArrowUpRight className="size-4" />
                        </a>
                      )}
                      <button
                        onClick={() => router.push('/featured-jobs')}
                        className="inline-flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white px-3 py-2.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-all"
                      >
                        <ArrowLeft className="size-3.5" /> All Vacancies
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                      {(() => {
                        const schoolNum = (settings.schoolId || activeSchool?.id || "").replace(/^FLIS/i, "");
                        let idNum = "";
                        if (selectedOpportunity.jobId) {
                          const match = String(selectedOpportunity.jobId).match(/(\d+)$/);
                          if (match) idNum = match[1];
                        }
                        if (!idNum && selectedOpportunity.applyUrl) {
                          const match = String(selectedOpportunity.applyUrl).match(/(\d+)\/?$/);
                          if (match) idNum = match[1];
                        }
                        const jobRef = schoolNum && idNum ? `${schoolNum}/${idNum}` : schoolNum || idNum || "";
                        if (!jobRef) return null;
                        return (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded-full text-xs font-mono font-bold text-slate-300">
                            <span>ID: {jobRef}</span>
                          </span>
                        );
                      })()}
                      {selectedOpportunity.closesDate && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/40 border border-white/10 rounded-full text-xs font-bold text-slate-300">
                          <Calendar className="size-3.5 text-[#FF6B35]" />
                          <span>Closes: {selectedOpportunity.closesDate}</span>
                        </span>
                      )}
                      {selectedOpportunity.savingsPotential !== undefined && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/40 border border-[#FF6B35]/30 rounded-full text-xs font-bold text-[#FF6B35]">
                          <Coins className="size-3.5" />
                          <span>${selectedOpportunity.savingsPotential.toLocaleString()}/mo Est. Savings</span>
                        </span>
                      )}
                      {selectedOpportunity.source && (
                        <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          SOURCE: <span className="text-slate-300">{selectedOpportunity.source.toUpperCase()}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs md:text-sm text-slate-300 font-semibold leading-relaxed">
                      The Leopardfish estimated financial analysis and lifestyle projections below are specifically tailored by our team for this specific school opportunity.
                    </p>
                  </div>
                </div>
              )}
              <div className="bg-[#0b1224] border border-white/5 p-5 md:p-6 shadow-2xl relative rounded-sm">

                {/* Header Row */}
                <div className="flex justify-between items-start border-b border-white/5 pb-3">
                  <div className="space-y-2">
                    <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none italic">
                      {getSchoolField(activeSchool, ['schoolname', 'name', 'school'])}
                      <span className="text-slate-700 text-lg ml-3 not-italic">#{activeSchool.id}</span>
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-sm border border-white/10">
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
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-[#d95f02]/20 bg-[#d95f02]/10">
                            <AlertTriangle className="size-3.5 text-[#d95f02]" />
                            <span className="text-[9px] font-black uppercase tracking-tight text-[#d95f02]">Limited Potential</span>
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
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-relaxed">Reliability</p>
                    <p className="text-2xl font-black text-slate-300 italic leading-tight">{analysis?.reliability}<span className="text-xs text-slate-700">/10</span></p>
                  </div>
                </div>

                {/* Main Grid: Outgoings & Incomes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">

                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-[#d95f02] uppercase tracking-[0.35em] flex items-center gap-2 border-b border-[#d95f02]/10 pb-2.5 leading-normal"><Minus className="size-4" /> Monthly outgoings</h3>
                    <div className="space-y-3">
                      {/* Monthly Rent */}
                      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-2 lg:gap-0 border-b border-white/5 pb-2">
                        <div className="flex justify-between items-center w-full lg:w-auto lg:contents">
                          <div className="flex items-center gap-2 shrink-0">
                            <Home className="w-4 h-4 text-orange-500 shrink-0" />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider cursor-help border-b border-dotted border-teal-500/60 leading-normal whitespace-nowrap shrink-0">
                                  Monthly Rent
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">
                                {`Estimated market rent based on your specific household profile.${lifestyleMode !== "Comfortable" ? ` (${lifestyleMode} Mode: ${lifestyleMode === "Saver" ? "-25%" : "+40%"})` : ""}`}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          
                          <span className={cn("text-[13px] font-black tabular-nums text-white whitespace-nowrap lg:order-3 lg:ml-auto", analysis?.housingStatus === 'provided' && "italic")}>
                            {analysis?.housingStatus === 'provided' ? "covered" : `${currency} ${Math.round(analysis?.costs.rent || 0).toLocaleString()}`}
                          </span>
                        </div>
                        
                        <div className="flex justify-end lg:justify-center w-full lg:w-auto lg:order-2 lg:flex-1 lg:px-4">
                          <div className="flex bg-white/5 rounded-sm p-0.5 border border-white/10 shrink-0">
                            <button onClick={() => setOverrideBedrooms(4)} className={cn("px-1.5 py-0.5 text-[9px] font-black rounded-sm transition-all", (overrideBedrooms === 4 || (overrideBedrooms === null && analysis?.isHousingProvidedByDefault)) ? "bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-sm" : "text-slate-400 hover:text-teal-400")}>Provided</button>
                            <button onClick={() => setOverrideBedrooms(0)} className={cn("px-1.5 py-0.5 text-[9px] font-black rounded-sm transition-all", (overrideBedrooms === 0) ? "bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-sm" : "text-slate-400 hover:text-teal-400")}>Shared</button>
                            <button onClick={() => setOverrideBedrooms(1)} className={cn("px-1.5 py-0.5 text-[9px] font-black rounded-sm transition-all", (overrideBedrooms === 1 || (overrideBedrooms === null && !analysis?.isHousingProvidedByDefault && analysis?.standardRentKey === 'rent1br')) ? "bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-sm" : "text-slate-400 hover:text-teal-400")}>1BR</button>
                            <button onClick={() => setOverrideBedrooms(2)} className={cn("px-1.5 py-0.5 text-[9px] font-black rounded-sm transition-all", (overrideBedrooms === 2 || (overrideBedrooms === null && !analysis?.isHousingProvidedByDefault && analysis?.standardRentKey === 'rent2br')) ? "bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-sm" : "text-slate-400 hover:text-teal-400")}>2BR</button>
                            <button onClick={() => setOverrideBedrooms(3)} className={cn("px-1.5 py-0.5 text-[9px] font-black rounded-sm transition-all", (overrideBedrooms === 3 || (overrideBedrooms === null && !analysis?.isHousingProvidedByDefault && analysis?.standardRentKey === 'rent3br')) ? "bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-sm" : "text-slate-400 hover:text-teal-400")}>3BR</button>
                          </div>
                        </div>
                      </div>

                      {/* Utilities */}
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider cursor-help border-b border-dotted border-teal-500/60 leading-normal whitespace-nowrap shrink-0">
                                Utilities
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">
                              Monthly averages for electricity, heating, water, and waste management.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="text-[13px] font-black tabular-nums text-white whitespace-nowrap shrink-0">{currency} {Math.round(analysis?.costs.utilities || 0).toLocaleString()}</span>
                      </div>

                      {/* High-Speed Internet */}
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <Wifi className="w-4 h-4 text-blue-400 shrink-0" />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider cursor-help border-b border-dotted border-teal-500/60 leading-normal whitespace-nowrap shrink-0">
                                High-Speed Internet
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">
                              Includes standard home broadband internet connection.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="text-[13px] font-black tabular-nums text-white whitespace-nowrap shrink-0">{currency} {Math.round(analysis?.costs.internet || 0).toLocaleString()}</span>
                      </div>

                      {/* Mobile data */}
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-purple-400 shrink-0" />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider cursor-help border-b border-dotted border-teal-500/60 leading-normal whitespace-nowrap shrink-0">
                                Mobile data
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">
                              Includes mobile SIM cards for members of the household.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="text-[13px] font-black tabular-nums text-white whitespace-nowrap shrink-0">{currency} {Math.round(analysis?.costs.mobile || 0).toLocaleString()}</span>
                      </div>

                      {/* Monthly Groceries */}
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <Utensils className="w-4 h-4 text-amber-400 shrink-0" />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider cursor-help border-b border-dotted border-teal-500/60 leading-normal whitespace-nowrap shrink-0">
                                Monthly Groceries
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">
                              {`Standard food and household supply indices for your household size.${lifestyleMode !== "Comfortable" ? ` (${lifestyleMode} Mode: ${lifestyleMode === "Saver" ? "-20%" : "+25%"})` : ""}`}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="text-[13px] font-black tabular-nums text-white whitespace-nowrap shrink-0">{currency} {Math.round(analysis?.costs.groceries || 0).toLocaleString()}</span>
                      </div>

                      {/* Dining & social */}
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <Coffee className="w-4 h-4 text-orange-400 shrink-0" />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider cursor-help border-b border-dotted border-teal-500/60 leading-normal whitespace-nowrap shrink-0">
                                Dining & social
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">
                              {`A discretionary guide for dining out, cultural activities, and general socialising.${lifestyleMode !== "Comfortable" ? ` (${lifestyleMode} Mode: ${lifestyleMode === "Saver" ? "-60%" : "+100%"})` : ""}`}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="text-[13px] font-black tabular-nums text-white whitespace-nowrap shrink-0">{currency} {Math.round(analysis?.costs.social || 0).toLocaleString()}</span>
                      </div>

                      {/* Transport */}
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2 shrink-0">
                          <TramFront className="w-4 h-4 text-rose-400 shrink-0" />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider cursor-help border-b border-dotted border-teal-500/60 leading-normal whitespace-nowrap shrink-0">
                                Transport
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">
                              Switch between Public Transit, Car ownership, or Taxi/Ride-hailing.
                            </TooltipContent>
                          </Tooltip>

                          {activeCOL?.transport && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center justify-center bg-white/5 border border-white/10 p-0.5 rounded-sm cursor-help hover:bg-white/10 transition-colors">
                                  <Info className="size-2.5 text-sky-400" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="bg-[#0b1224] border-[#d95f02]/30 text-slate-300 text-[10px] p-3 max-w-xs shadow-xl shadow-black/50 z-50">
                                <div className="flex items-start gap-2">
                                  <Zap className="size-3 text-[#d95f02] shrink-0 mt-0.5" />
                                  <span className="leading-relaxed font-medium italic">
                                    {transportMode === "P" ?
                                      (tIntel?.bestOptionNoDriver || activeCOL?.transport?.bestOptionNoDriver || "Standard transit network.") :
                                      (tIntel?.bestOptionDriver || activeCOL?.transport?.bestOptionDriver || "Vehicle ownership/hire recommended.")
                                    }
                                  </span>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        
                        <div className="flex bg-white/5 rounded-sm p-0.5 border border-white/10 shrink-0">
                          <button onClick={() => setTransportMode("P")} className={cn("px-1 py-0.5 text-[9px] font-black rounded-sm transition-all", transportMode === "P" ? "bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-sm" : "text-slate-400 hover:text-teal-400")}>Transit</button>
                          <button onClick={() => setTransportMode("C")} className={cn("px-1 py-0.5 text-[9px] font-black rounded-sm transition-all", transportMode === "C" ? "bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-sm" : "text-slate-400 hover:text-teal-400")}>Car Hire</button>
                        </div>
                        <span className="text-[13px] font-black tabular-nums text-white whitespace-nowrap shrink-0">{currency} {Math.round(analysis?.costs.transport || 0).toLocaleString()}</span>
                      </div>

                      {/* Medical gaps */}
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-red-400 shrink-0" />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider cursor-help border-b border-dotted border-teal-500/60 leading-normal whitespace-nowrap shrink-0">
                                Medical gaps
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">
                              Estimated out-of-pocket medical and dental expenses.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="text-[13px] font-black tabular-nums text-white whitespace-nowrap shrink-0">{currency} {Math.round(analysis?.costs.medical || 0).toLocaleString()}</span>
                      </div>

                      {/* RESTORED: Custom Adjustments Box from Screenshot */}
                      <div className="pt-5 mt-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Wallet className="size-4 text-slate-400" />
                            <p className="text-xs font-black text-slate-400 uppercase tracking-wider italic leading-normal">Custom Adjustments (+/-)</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-600 uppercase">{currency}</span>
                            <Input
                              type="number"
                              value={manualAdjustments}
                              onChange={(e) => setManualAdjustments(e.target.value)}
                              className={cn("bg-black/40 border-white/10 w-28 h-10 px-3 text-right text-base font-black text-white focus:border-teal-500 transition-all", noSpinners)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t-2 border-[#d95f02]/20 mt-5">
                        <span className="text-[11px] font-black text-slate-400 uppercase italic tracking-widest leading-normal">Total outgoings</span>
                        <span className="text-[18px] font-black text-white tabular-nums leading-normal">{currency} {Math.round(analysis?.totalOut || 0).toLocaleString()}</span>
                      </div>


                    </div>
                  </div>

                  <div className="space-y-5">
                    <h3 className="text-xs font-black text-[#d95f02] uppercase tracking-[0.35em] flex items-center gap-2 border-b border-[#d95f02]/10 pb-2.5 leading-normal"><Plus className="size-4" /> Monthly incomes</h3>
                    <div className="space-y-5">

                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-normal whitespace-nowrap shrink-0">Monthly net base</span>
                        <span className="text-[13px] font-black text-white whitespace-nowrap shrink-0">{currency} {parseFloat(settings.netSalary).toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <Banknote className="size-4 text-slate-400" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-normal whitespace-nowrap shrink-0">Additional Income</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black text-slate-600">{currency}</span>
                          <Input type="number" value={extraIncome} onChange={(e) => setExtraIncome(e.target.value)} className={cn("bg-black/40 border-white/10 w-24 h-8 px-2 text-right text-xs font-black text-white rounded-sm focus:border-teal-500", noSpinners)} />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t-2 border-[#d95f02]/20 mt-1">
                        <span className="text-[11px] font-black text-slate-400 uppercase italic tracking-widest leading-normal">Total monthly income</span>
                        <span className="text-[16px] font-black text-white tabular-nums leading-normal">{currency} {Math.round(analysis?.totalIn || 0).toLocaleString()}</span>
                      </div>

                      <div className="bg-[#d95f02]/5 p-7 border border-[#d95f02]/20 text-right rounded-sm relative shadow-inner">
                        {/* 🎯 BENCHMARK CURRENCY TOGGLE */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex bg-black/40 rounded-sm p-0.5 border border-white/5">
                            {BENCHMARKS.map(b => (
                              <button key={b.code} onClick={() => setBenchmark(b.code)} className={cn("px-2 py-1 text-[10px] font-black rounded-sm transition-all uppercase", benchmark === b.code ? "bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-sm" : "text-slate-400 hover:text-teal-400")}>{b.code}</button>
                            ))}
                          </div>
                          <p className="text-xs font-black text-[#d95f02] uppercase tracking-[0.25em] italic leading-normal">Monthly Disposable Surplus</p>
                        </div>

                        <div className="flex flex-col items-end">
                          <div className="flex items-baseline gap-2 leading-tight">
                            <span className={cn("font-black text-white/50 transition-all duration-300", surplusFontSizes.currency)}>{currency}</span>
                            <span className={cn("font-black tracking-tighter tabular-nums text-white leading-tight transition-all duration-300", surplusFontSizes.number, (analysis?.surplus ?? 0) <= 0 && "text-rose-500")}>
                              {surplusValStr}
                              {(analysis?.uplift13 || analysis?.uplift14) && <span className="text-xl align-top text-[#d95f02] ml-1">*</span>}
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
                                  <p className="mt-2 text-[10px] font-bold text-emerald-500/40 uppercase italic text-center italic tracking-tighter">
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

                          {(overrideBedrooms !== null || uplift13 || uplift14) && (
                            <button
                              onClick={() => {
                                setOverrideBedrooms(null);
                                setUplift13(false);
                                setUplift14(false);
                              }}
                              className="mt-3 flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-sm hover:bg-slate-700 hover:border-slate-600 transition-all"
                            >
                              <RefreshCw className="size-3.5" />
                              <span className="text-[10px] font-black uppercase tracking-widest">
                                Reset to Standard Baseline
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 🕵️ TACTICAL INCOME REMINDER */}
                      {(analysis?.surplus ?? 0) < 0 && (
                        <div className="mt-4 p-4 bg-sky-500/5 border border-sky-500/20 rounded-sm">
                          <p className="text-xs font-bold text-sky-400 uppercase tracking-widest flex items-center gap-2 mb-1.5">
                            <Zap className="size-3.5" /> Tactical Income Tip
                          </p>
                          <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">
                            Surplus remains negative! To balance this package, consider <span className="text-white font-bold">adjusting apartment size</span>, adding <span className="text-white font-bold">Partner Income</span> on the left menu or <span className="text-white font-bold">Additional Credits</span> (Tutoring/TLR) in the box above.
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
                    {/* SECTION: ELIGIBILITY & EXPECTED SURPLUS SIDE-BY-SIDE */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-b border-white/5 pb-6">
                      {/* LEFT: Eligibility & Visas */}
                      <div className="space-y-4 relative overflow-hidden">
                        <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-widest">Eligibility & Visas</p>
                        
                        <div className="space-y-4">
                          <div className="flex gap-4">
                            <ShieldCheck className="size-5 text-rose-500 mt-1 shrink-0" />
                            <div className="flex-1">
                              <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-widest mb-1">Visa & Deployment Intel</p>
                              <div className="text-xs font-bold text-slate-300 space-y-2">
                                <p>{activeSchool.intel?.visaRestrictions || activeReq?.visa_notes || 'Standard regional requirements apply.'}</p>
                                <div className="pt-2 border-t border-white/5 text-xs text-muted-foreground font-medium flex flex-col gap-1.5">
                                  {(activeReq?.max_age_f || activeReq?.max_age_m) && (
                                    <span>• Max Age: {activeReq.max_age_f} (F) / {activeReq.max_age_m} (M)</span>
                                  )}
                                  {activeReq?.max_age_notes && (
                                    <span className="leading-tight">• {activeReq.max_age_notes}</span>
                                  )}
                                  {(activeReq?.min_age || activeReq?.min_age_notes) && (
                                    <span>• Min Age: {activeReq.min_age_notes || activeReq.min_age || '21'}</span>
                                  )}
                                  {(activeSchool as any).dependent_visa_notes && (
                                    <span>• Dependents: {(activeSchool as any).dependent_visa_notes}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-4">
                            <Award className="size-5 text-yellow-500 mt-1 shrink-0" />
                            <div className="flex-1">
                              <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-widest mb-1">Candidate Qualifications</p>
                              <div className="text-xs font-bold text-slate-300 space-y-2">
                                <p>{activeSchool.intel?.minQualifications || activeReq?.exp_notes || 'QTS / PGCE + 2 Years experience preferred.'}</p>
                                <div className="pt-2 border-t border-white/5 text-xs text-muted-foreground font-medium flex flex-col gap-1.5">
                                  {(activeReq?.academic_Degree_req || (activeSchool as any).academic_Degree_req) && (
                                    <span className="leading-tight">• Degree: {activeReq?.academic_Degree_req || (activeSchool as any).academic_Degree_req}</span>
                                  )}
                                  {(activeReq?.license_req || (activeSchool as any).license_req) && (
                                    <span className="leading-tight">• License: {activeReq?.license_req || (activeSchool as any).license_req}</span>
                                  )}
                                  {(activeReq?.exp_years_Req || (activeSchool as any).experience_years_req || (activeSchool as any).minExperience) && (
                                    <span>• Exp Required: {activeReq?.exp_years_Req || (activeSchool as any).experience_years_req || (activeSchool as any).minExperience} Years</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT: Expected Surplus */}
                      <div className="space-y-6 relative overflow-hidden border-t border-white/5 pt-6 lg:border-t-0 lg:pt-0 lg:border-l lg:border-white/5 lg:pl-8">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                          <TrendingUp className="size-16 text-[#d95f02]" />
                        </div>

                        <div className="flex flex-col gap-2 items-start">
                          <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-widest italic">3. Expected Surplus</p>
                          <div className="flex bg-black/40 rounded-sm p-0.5 border border-white/5">
                            {["USD", "GBP", "EUR", "Local"].map(curr => (
                              <button
                                key={curr}
                                onClick={() => setSurplusDisplayCurrency(curr as any)}
                                className={cn(
                                  "px-2 py-0.5 text-[9px] font-black rounded-sm transition-all uppercase",
                                  surplusDisplayCurrency === curr
                                    ? "bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-sm"
                                    : "text-slate-400 hover:text-teal-400"
                                )}
                              >
                                {curr}
                              </button>
                            ))}
                          </div>
                        </div>

                        {(() => {
                          const surplus = analysis?.surplus ?? 0;
                          const expenses = analysis?.totalOut ?? 0;
                          const isLoss = surplus < 0;
                          const costsColor = isLoss ? '#b91c1c' : '#1e293b';

                          const displayCurrency = surplusDisplayCurrency === "Local" ? currency : surplusDisplayCurrency;
                          const conversionRate = displayCurrency === currency
                            ? 1.0
                            : (1.0 / (currentRates[currency] || 1.0)) * (currentRates[displayCurrency] || 1.0);

                          const displaySurplus = surplus * conversionRate;
                          const displayExpenses = expenses * conversionRate;

                          let statusLabel = 'Single Teacher';
                          if (settings.familyStatus === "Married (sole earner)") {
                            statusLabel = "Couple (Sole Earner)";
                          } else if (settings.familyStatus === "Married (dual income)") {
                            statusLabel = "Dual Income Couple";
                          } else if (settings.familyStatus === "Family +1") {
                            statusLabel = "Family (1 Child)";
                          } else if (settings.familyStatus === "Family +2") {
                            statusLabel = "Family (2 Children)";
                          } else if (settings.familyStatus === "Family +3") {
                            statusLabel = "Family (3+ Children)";
                          }

                          return (
                            <>
                              <div className="flex items-center gap-2 text-[#d95f02]/70">
                                <Users className="size-4 text-[#d95f02]" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Status: {statusLabel}</span>
                              </div>

                              <div className="space-y-6">
                                <div className="relative flex flex-col items-center">
                                  <div className="h-44 w-full -mb-16">
                                    {mounted ? (
                                      <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                          <Pie
                                            data={[
                                              { name: 'Monthly Costs', value: Math.round(displayExpenses) },
                                              { name: 'Surplus Potential', value: Math.max(0, Math.round(displaySurplus)) }
                                            ]}
                                            cx="50%"
                                            cy="70%"
                                            startAngle={180}
                                            endAngle={0}
                                            innerRadius={65}
                                            outerRadius={85}
                                            paddingAngle={2}
                                            dataKey="value"
                                            stroke="none"
                                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                            labelLine={false}
                                          >
                                            <Cell fill={costsColor} />
                                            <Cell fill="#10B981" className="drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                          </Pie>
                                          <RechartsTooltip
                                            contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2px', fontSize: '10px', color: '#fff' }}
                                          />
                                        </PieChart>
                                      </ResponsiveContainer>
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center">
                                        <span className="text-[10px] font-mono text-slate-500 tracking-widest animate-pulse">PREPARING CHART DATA...</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-center relative z-10 mt-6 space-y-0">
                                    <p className={cn(
                                      "text-[9px] font-black uppercase tracking-[0.2em] opacity-80",
                                      isLoss ? "text-rose-500" : "text-[#d95f02]"
                                    )}>{isLoss ? "Expected Deficit" : "Expected Surplus"}</p>
                                    <p className="text-2xl font-black text-white tracking-tighter italic">
                                      {displaySurplus < 0 ? '-' : ''}{displayCurrency} {Math.round(Math.abs(displaySurplus)).toLocaleString()}
                                      <span className="text-xs text-muted-foreground ml-1 not-italic font-normal uppercase opacity-40">/mo</span>
                                    </p>
                                  </div>
                                </div>

                                {/* 🛡️ TACTICAL LEDGER */}
                                <div className="grid grid-cols-2 gap-px bg-white/5 border border-white/5 rounded-sm overflow-hidden">
                                  <div className="bg-[#020617]/40 p-4 space-y-1">
                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.15em]">Outflows</p>
                                    <p className="text-lg font-black text-white tracking-tight italic">
                                      {displayCurrency} {Math.round(displayExpenses).toLocaleString()}
                                    </p>
                                  </div>
                                  <div className={cn(
                                    "p-4 space-y-1 border-l border-white/5 text-right",
                                    isLoss ? "bg-rose-500/5 text-[#f43f5e]" : "bg-[#10B981]/5 text-[#10B981]"
                                  )}>
                                    <p className={cn(
                                      "text-[9px] font-black uppercase tracking-[0.15em]",
                                      isLoss ? "text-[#f43f5e]" : "text-[#10B981]"
                                    )}>{isLoss ? "Deficit" : "Surplus"}</p>
                                    <p className="text-lg font-black tracking-tight italic">
                                      {displaySurplus < 0 ? '-' : ''}{displayCurrency} {Math.round(Math.abs(displaySurplus)).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-[#d95f02] uppercase tracking-[0.4em] mb-4 flex items-center justify-between gap-2 leading-relaxed">
                        <span>
                          Staff Turnover Guide - (last 12 months)
                        </span>
                        <span className={cn(
                          "text-[11px] text-slate-400 font-medium tracking-normal normal-case ml-auto transition-all",
                          (isCalculatingStability || stabilityReport?.isUpdating) && "animate-pulse text-[#d95f02] font-semibold"
                        )}>
                          re-verification takes upto 90 secs
                        </span>
                      </h4>
                      <div className="space-y-6 text-[13px] text-slate-300 leading-relaxed">
                        
                        {/* 🛸 STABILITY & CHURN ENGINE LEDGER */}
                        <div className="bg-white/5 border border-white/10 rounded-sm p-4 space-y-4">
                          
                          {isCalculatingStability && !stabilityReport ? (
                            <div className="space-y-3 py-2">
                              <div className="h-3 bg-white/5 rounded-sm w-3/4 animate-pulse" />
                              <div className="h-3 bg-white/5 rounded-sm w-1/2 animate-pulse" />
                              
                              {/* 📡 TWO-STEP LIVE SWEEP PROGRESS CARD (FIRST LOAD) */}
                              <div className="p-3 bg-[#d95f02]/5 border border-[#d95f02]/30 shadow-[0_0_15px_rgba(249,115,22,0.07)] animate-pulse rounded-sm space-y-2.5 shadow-inner shadow-black/40 mt-3">
                                <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-[#d95f02] flex items-center gap-1.5">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d95f02] opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d95f02]"></span>
                                    </span>
                                    Executing Two-Step Vacancy Audit
                                  </span>
                                                                    <span className="text-[10px] font-bold text-sky-400 tracking-wider animate-pulse">
                                      Running Research Engine {stabilityCountdown}
                                    </span>
                                </div>
                                
                                <div className="space-y-2 pt-0.5">
                                   {/* STEP 1 */}
                                   <div className="flex items-center gap-2.5 text-[10px] leading-relaxed">
                                     <div className="flex items-center justify-center size-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black shrink-0">
                                       ✓
                                     </div>
                                     <div className="flex items-baseline gap-2 flex-wrap sm:flex-nowrap">
                                       <span className="font-black text-slate-400 uppercase tracking-wider whitespace-nowrap hidden md:inline">Step 1: Dossier Loaded</span>
                                       <span className="font-black text-slate-400 uppercase tracking-wider whitespace-nowrap md:hidden">Step 1.</span>
                                       <span className="text-[9px] text-slate-400 font-medium hidden md:inline">— Retrieved local database (&lt; 100ms)</span>
                                     </div>
                                   </div>

                                   {/* STEP 2 */}
                                   <div className="flex items-center gap-2.5 text-[10px] leading-relaxed">
                                     <div className="flex items-center justify-center size-4 rounded-full bg-[#d95f02]/20 text-[#d95f02] border border-[#d95f02]/30 text-[9px] font-bold shrink-0">
                                       <span className="animate-spin size-2.5 border-2 border-t-transparent border-[#d95f02] rounded-full" />
                                     </div>
                                     <div className="flex items-baseline gap-2 flex-wrap sm:flex-nowrap">
                                       <span className="font-black text-slate-400 uppercase tracking-wider whitespace-nowrap hidden md:inline">Step 2: Portals Sweep</span>
                                       <span className="font-black text-slate-400 uppercase tracking-wider whitespace-nowrap md:hidden">Step 2.</span>
                                       <span className="text-[9px] text-slate-400 font-medium hidden md:inline">— Auditing premium consultative &amp; global networks live...</span>
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
                            (() => {
                              // Read pre-calculated allProcessedJobs from component scope
                              const processedJobs12 = allProcessedJobs.filter(j => j.recruitmentCycle === "CURRENT");
                              const churnRate = stabilityReport.metrics.estimatedStaffBase 
                                ? Math.round((processedJobs12.length / stabilityReport.metrics.estimatedStaffBase) * 100) 
                                : (stabilityReport.metrics.estimatedChurnRatePercent || 0);

                              const currentJobs = allProcessedJobs.filter(j => j.recruitmentCycle === "CURRENT");
                              const historicJobs = allProcessedJobs.filter(j => j.recruitmentCycle === "HISTORIC_Y1");

                              return (
                                <div className="space-y-4">
                                  {/* 🛡️ STAFF TURNOVER & CHURN CATEGORY GUIDE */}
                                  <div className="bg-black/40 border border-white/5 rounded-sm p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] text-slate-400 font-medium">Category:</span>
                                        {(() => {
                                          const isUnavailable = stabilityReport.category === "INSIGHT_UNAVAILABLE" || stabilityReport.metrics?.riskRating === "INSIGHT_UNAVAILABLE";
                                          if (isUnavailable) {
                                            return (
                                              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-black uppercase tracking-wider">
                                                <HelpCircle className="size-3 shrink-0" /> Insight Unavailable
                                              </span>
                                            );
                                          }
                                          
                                          let badgeClass = "";
                                          let label = "";
                                          if (churnRate < 10) {
                                            badgeClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                                            label = "Low Turnover (Stable)";
                                          } else if (churnRate <= 15) {
                                            badgeClass = "bg-green-500/10 text-green-400 border border-green-500/20";
                                            label = "Moderate Turnover (Healthy)";
                                          } else if (churnRate <= 22) {
                                            badgeClass = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                                            label = "Elevated Turnover (Caution)";
                                          } else {
                                            badgeClass = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                                            label = "High Turnover (Significant Churn)";
                                          }
                                          
                                          return (
                                            <span className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wider", badgeClass)}>
                                              <Activity className="size-3 shrink-0" /> {label}
                                            </span>
                                          );
                                        })()}

                                        {stabilityReport.isUpdating && (
                                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[9px] font-black uppercase tracking-wider animate-pulse ml-1">
                                            <span className="relative flex h-1.5 w-1.5 shrink-0">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500"></span>
                                            </span>
                                            🔄 Syncing fresh data...
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-start sm:self-center">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-sm font-black uppercase text-[9px] text-teal-400 transition-all hover:text-white">
                                            <Info className="size-3" /> Implications & Impact
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-sm bg-[#0b1224] border border-white/10 text-white p-3 space-y-2.5 rounded-sm shadow-xl z-50">
                                          <p className="text-[10px] font-black uppercase tracking-wider text-[#d95f02] border-b border-white/10 pb-1.5 leading-relaxed">Implications & Impact</p>
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
                                        className="flex items-center gap-1.5 px-2.5 py-1 bg-[#d95f02]/10 hover:bg-[#d95f02]/20 border border-[#d95f02]/30 hover:border-[#d95f02]/50 rounded-sm font-black uppercase text-[11px] text-[#d95f02] transition-all hover:text-white disabled:opacity-50"
                                      >
                                        <RefreshCw className={cn("size-3", isCalculatingStability && "animate-spin")} /> 
                                        {isCalculatingStability ? `Re-verifying (${stabilityCountdown}s)...` : "Re-verify vacancies"}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <div className="bg-black/20 border border-white/5 p-2 rounded-sm">
                                      <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider leading-relaxed">Est. Staff</div>
                                      <div className="text-sm font-black text-white mt-0.5">{stabilityReport.metrics.estimatedStaffBase || '—'}</div>
                                    </div>
                                    <div className="bg-black/20 border border-white/5 p-2 rounded-sm">
                                      <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider leading-relaxed">Known Vacancies</div>
                                      <div className={cn("text-sm font-black text-white mt-0.5 transition-all duration-300", isCalculatingStability && "blur-[3px] select-none")}>
                                        {processedJobs12.length}
                                      </div>
                                    </div>
                                    <div className="bg-black/20 border border-white/5 p-2 rounded-sm">
                                      <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider leading-relaxed">Est. Churn</div>
                                      <div className="text-sm font-black text-white mt-0.5">
                                        {stabilityReport.category === "INSIGHT_UNAVAILABLE" ? "—" : `${churnRate}%`}
                                      </div>
                                    </div>
                                  </div>

                                  {/* MASSIVE PREMIUM WRAPPER */}
                                  <div className="relative rounded-sm overflow-hidden mt-3">
                                    {/* SINGLE PAYWALL OVERLAY */}
                                    {!turnoverUnlocked && (
                                      <div className="absolute inset-0 z-20 backdrop-blur-[3px] bg-[#0b1224]/60 flex items-center justify-center border border-white/5 rounded-sm transition-all duration-300">
                                        {/* Non-orange, sleek glass button */}
                                        <button 
                                          onClick={() => setTurnoverUnlocked(true)}
                                          type="button"
                                          className="flex items-center justify-center bg-white/5 border border-white/10 px-6 py-2.5 rounded-sm cursor-pointer hover:bg-white/10 transition-colors shadow-2xl"
                                        >
                                          <span className="text-[11px] font-black uppercase tracking-widest text-teal-400 hover:text-white transition-colors">Find out more</span>
                                        </button>
                                      </div>
                                    )}

                                    {/* LOCKED / UNLOCKED CONTENT */}
                                    <div className={cn("space-y-4 transition-all duration-300", !turnoverUnlocked && "opacity-30 select-none pointer-events-none blur-[2px]")}>
                                      {/* Locked Metrics Grid */}
                                      <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-black/20 border border-white/5 p-2 rounded-sm">
                                          <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider leading-relaxed">Leadership</div>
                                          <div className="text-sm font-black text-white mt-0.5">
                                            {processedJobs12.filter(j => j.department === 'Leadership').length}
                                          </div>
                                        </div>
                                        <div className="bg-black/20 border border-white/5 p-2 rounded-sm">
                                          <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider leading-relaxed">Secondary</div>
                                          <div className="text-sm font-black text-white mt-0.5">
                                            {processedJobs12.filter(j => j.department === 'Secondary').length}
                                          </div>
                                        </div>
                                        <div className="bg-black/20 border border-white/5 p-2 rounded-sm">
                                          <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider leading-relaxed">Primary</div>
                                          <div className="text-sm font-black text-white mt-0.5">
                                            {processedJobs12.filter(j => j.department === 'Primary').length}
                                          </div>
                                        </div>
                                      </div>

                                      {/* 📋 DISCOVERED VACANCIES DROPDOWN / LIST */}
                                      {turnoverUnlocked && allProcessedJobs.length > 0 && (
                                        <div className="border border-white/5 bg-black/10 rounded-sm">
                                          <details className="group" open>
                                            <summary className="flex items-center justify-between p-2.5 cursor-pointer select-none text-[10px] font-black uppercase tracking-wider text-sky-400 hover:bg-white/5 transition-colors">
                                              <span>
                                                View Discovered Vacancies ({processedJobs12.length} Current, {historicJobs.length} Historic)
                                                {activeSchool && (
                                                  <span className="text-slate-300 font-bold tracking-normal normal-case ml-1.5">
                                                    {" "}— {activeSchool.schoolname || activeSchool.school || activeSchool.name}
                                                  </span>
                                                )}
                                              </span>
                                              <ChevronDown className="size-3 text-slate-500 group-open:rotate-180 transition-transform" />
                                            </summary>
                                            <div className="p-3 border-t border-white/5 space-y-4 bg-[#0b1224]/50 max-h-60 overflow-y-auto">
                                              {currentJobs.length > 0 && (
                                                <div className="space-y-2">
                                                  <div className="text-[9px] font-black uppercase text-teal-400 px-2 pt-1 pb-0.5 tracking-wider border-b border-teal-500/10">Current Cycle (Last 12 Months)</div>
                                                  {currentJobs.map((job, idx) => (
                                                    <div key={`current-${idx}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 py-2 px-2 bg-white/[0.01] border-b border-white/5 hover:bg-white/[0.03] transition-colors text-[10px]">
                                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <span className="text-slate-500 font-bold tracking-tight text-[9px] shrink-0">
                                                          {String(idx + 1).padStart(2, '0')}
                                                        </span>
                                                        <span className="font-bold text-slate-300 truncate flex-1 min-w-0 block" title={job.title}>
                                                          {job.title || "Unknown Position"}
                                                        </span>
                                                        <span className="text-[9px] text-slate-500 font-medium shrink-0 px-1 bg-white/5 rounded-sm">
                                                          {job.source}
                                                        </span>
                                                      </div>
                                                      <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-end pl-5 sm:pl-0 w-full sm:w-auto">
                                                        {job.postedDate && (!job.closesDate || job.status !== 'open') && (
                                                          <span className="text-[9px] text-slate-400 font-medium bg-black/30 px-1.5 py-0.5 border border-white/5 rounded-sm">
                                                            Listed: {job.postedDate}
                                                          </span>
                                                        )}
                                                        <span className={cn(
                                                          "text-[10px] font-black uppercase px-1.5 py-0.5 rounded-sm border shrink-0",
                                                          job.status === 'open' 
                                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                                        )}>
                                                          {job.status === 'open' 
                                                            ? (job.closesDate ? `Closes: ${job.closesDate}` : 'Open') 
                                                            : 'Closed'}
                                                        </span>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                              
                                              {currentJobs.length > 0 && historicJobs.length > 0 && (
                                                <hr className="border-white/5 my-3" />
                                              )}

                                              {historicJobs.length > 0 && (
                                                <div className="space-y-2">
                                                  <div className="text-[9px] font-black uppercase text-[#d95f02] px-2 pt-1 pb-0.5 tracking-wider border-b border-[#d95f02]/10">Historic Cycle (12-24 Months Ago)</div>
                                                  {historicJobs.map((job, idx) => (
                                                    <div key={`historic-${idx}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 py-2 px-2 bg-white/[0.01] border-b border-white/5 hover:bg-white/[0.03] transition-colors text-[10px]">
                                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <span className="text-slate-500 font-bold tracking-tight text-[9px] shrink-0">
                                                          {String(idx + 1).padStart(2, '0')}
                                                        </span>
                                                        <span className="font-bold text-slate-200 truncate flex-1 min-w-0 block" title={job.title}>
                                                          {job.title || "Unknown Position"}
                                                        </span>
                                                        <span className="text-[9px] text-slate-500 font-medium shrink-0 px-1 bg-white/5 rounded-sm">
                                                          {job.source}
                                                        </span>
                                                      </div>
                                                      <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-end pl-5 sm:pl-0 w-full sm:w-auto">
                                                        {job.postedDate && (!job.closesDate || job.status !== 'open') && (
                                                          <span className="text-[9px] text-slate-400 font-medium bg-black/30 px-1.5 py-0.5 border border-white/5 rounded-sm">
                                                            Listed: {job.postedDate}
                                                          </span>
                                                        )}
                                                        <span className={cn(
                                                          "text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm border shrink-0",
                                                          job.status === 'open' 
                                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                                        )}>
                                                          {job.status === 'open' 
                                                            ? (job.closesDate ? `Closes: ${job.closesDate}` : 'Open') 
                                                            : 'Closed'}
                                                        </span>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          </details>
                                        </div>
                                      )}

                                      {/* Churn Implications Alert Box */}
                                      {false && turnoverUnlocked && stabilityReport.leopardfishIntelAlert && (
                                        <div className="mt-4 p-3 bg-[#d95f02]/5 border border-[#d95f02]/20 rounded-sm">
                                          <div className="space-y-1 w-full">
                                            <div className="flex items-center justify-between">
                                              <h5 className="text-[10px] font-black text-slate-200 uppercase tracking-wider">Churn Implications</h5>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <button type="button" className="text-slate-400 hover:text-white transition-colors">
                                                    <Info className="size-3.5" />
                                                  </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-sm bg-[#0b1224] border border-white/10 text-white p-3 space-y-2 rounded-sm shadow-xl z-50">
                                                  <p className="text-[10px] font-black uppercase tracking-wider text-[#d95f02] border-b border-white/10 pb-1.5">Data Scope & Limitations</p>
                                                  <p className="text-[10px] leading-relaxed text-slate-300 font-medium">
                                                    This rate is based strictly on public vacancy data we've caught over the last twelve months. It's a handy guide, but keep in mind that a single advert can sometimes cover multiple posts (like hiring three Maths teachers with one listing). Plus, plenty of schools recruit quietly through internal promotions, word of mouth, or specialized agencies without putting a public listing up at all. So while it gives a good steer on staffroom movement, it won't show every quiet shuffle behind the scenes!
                                                  </p>
                                                </TooltipContent>
                                              </Tooltip>
                                            </div>
                                            <p className="text-[11px] text-slate-300 leading-relaxed font-medium italic">{stabilityReport.leopardfishIntelAlert}</p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="text-slate-400 text-xs font-semibold">
                              Select a school to audit stability metrics (searches take up to 1 min).
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 🛰️ PREMIUM DYNAMIC BRIEFING NARRATIVE */}
                    {cachedBriefingText && (
                      <div className="pt-6 border-t border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-[#d95f02] uppercase tracking-[0.15em] bg-[#d95f02]/10 px-2 py-0.5 rounded-sm border border-[#d95f02]/20 flex items-center gap-1">
                              <Zap className="size-2.5" /> Staffroom Vibe & Dossier Intel
                            </span>
                          </div>
                          {isRewording && (
                            <span className="text-[9px] font-black text-teal-400 uppercase tracking-widest animate-pulse flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-teal-400 animate-ping" />
                              Recalibrating staffroom talk...
                            </span>
                          )}
                        </div>
                        <div className="space-y-4 text-[13px] text-slate-300 leading-relaxed border-l-2 border-teal-500/30 pl-4 italic font-medium">
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
                    )}
                  </div>
                )}

                {(() => {
                  const matrixItems = [
                    {
                      key: 'profit',
                      label: 'Profit Status',
                      icon: <Building className="size-5 text-sky-400" />,
                      value: (activeSchool as any).profitstatus || (activeSchool as any).profit_status || 'For-Profit'
                    },
                    {
                      key: 'housing',
                      label: 'Housing Provision',
                      icon: <Home className="size-5 text-sky-400" />,
                      value: activeSchool.intel?.housing?.value || activeSchool.housingprovision || '—'
                    },
                    {
                      key: 'health',
                      label: 'Health Coverage',
                      icon: <HeartPulse className="size-5 text-sky-400" />,
                      value: categorizeInsurance((activeSchool.intel?.healthInsurance || activeSchool.healthcoverage || '—') as string)
                    },
                    {
                      key: 'curriculum',
                      label: 'Curriculum',
                      icon: <BookOpen className="size-5 text-sky-400" />,
                      value: activeSchool.intel?.curriculum || activeSchool.curriculum || '—'
                    },
                    {
                      key: 'ratio',
                      label: 'Ratio',
                      icon: <Users className="size-5 text-sky-400" />,
                      value: activeSchool.intel?.studentTeacherRatio || activeSchool.staffstudentratio || '—'
                    },
                    {
                      key: 'classSize',
                      label: 'Class Size',
                      icon: <Building className="size-5 text-sky-400" />,
                      value: activeSchool.intel?.classSize || activeSchool.classsize || '—'
                    },
                    {
                      key: 'contact',
                      label: 'Non-Contact Time',
                      icon: <Clock className="size-5 text-sky-400" />,
                      value: activeSchool.intel?.nonContactTime || (activeSchool as any).noncontacttime || '—'
                    },
                    {
                      key: 'tech',
                      label: 'Tech Ecosystem',
                      icon: <Laptop className="size-5 text-sky-400" />,
                      value: activeSchool.intel?.technologyEcosystem || (activeSchool as any).techecosystem || 'Standard'
                    },
                    {
                      key: 'accreditation',
                      label: 'Accreditation',
                      icon: <Award className="size-5 text-sky-400" />,
                      value: activeSchool.intel?.accreditation || (activeSchool as any).approvals || 'International'
                    },
                  ];

                  return (
                    <div className="mt-8 pt-6 border-t border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className="bg-[#1f2937]/25 border border-white/5 rounded-sm p-5 space-y-5">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="size-4 text-[#d95f02]" />
                          <span className="text-xs font-black uppercase tracking-widest text-[#d95f02]">Staff Room Intelligence</span>
                        </div>
                        <ul className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
                          {matrixItems.map(item => (
                            <li key={item.key} className="flex items-start">
                              <div className="mr-4 mt-1 text-sky-400 shrink-0">
                                {item.icon}
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-widest">{item.label}</p>
                                <div className={cn(
                                  "text-sm font-black tracking-tighter",
                                  /\d/.test(item.value?.toString() || "") ? "text-white" : "text-slate-300"
                                )}>
                                  {item.key === 'accreditation' ? (
                                    <div className="flex flex-wrap gap-1">
                                      {item.value?.toString().split(/,\s*/).map((acc: string, i: number) => (
                                        <Tooltip key={i}>
                                          <TooltipTrigger asChild>
                                            <span className="cursor-help border-b border-white/20 hover:border-[#d95f02] transition-colors font-black">
                                              {acc}
                                              {i < item.value!.toString().split(/,\s*/).length - 1 && ","}
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent className="bg-black border-white/10 text-[11px] font-bold text-white px-3 py-1.5 shadow-2xl">
                                            {ACRONYMS[acc.trim()] || 'International Accreditation'}
                                          </TooltipContent>
                                        </Tooltip>
                                      ))}
                                    </div>
                                  ) : (
                                    item.value?.toString()
                                  )}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })()}
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