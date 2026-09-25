"use client";

import { translateJobTitleToEnglish } from '@/lib/utils/titleTranslator';
import { isSupportOrNonTeachingRole } from '@/lib/crawler/roleClassifier';

import { useState, useEffect, useMemo, Suspense, useCallback, useRef } from 'react';
import {
  Zap, ShieldCheck, BookOpen, Target, Plus, Minus, Coins,
  AlertTriangle, AlertCircle, Activity, Clock, Wallet, Banknote, ArrowLeft, ArrowRight, FileText, Info, Car, Bus, Lock, ArrowDownCircle,
  Briefcase, ChevronDown, RefreshCw, HelpCircle,
  Home, Utensils, Wifi, Smartphone, Coffee, TramFront, Stethoscope, Award, TrendingUp, Users, Building2, HeartHandshake,
  HeartPulse, Laptop, Building, Sliders, BarChart3,
  Sparkles, ArrowUpRight, MapPin, Calendar, Star, Loader2, Plane, Maximize2, Minimize2, X
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useDoc, useAuth } from '@/firebase';
import { collection, doc, query, where, updateDoc, increment } from 'firebase/firestore';
import type { TeacherProfile } from '@/lib/types';
import { getTimeUntilLocalMidnight, getLocalDateString } from '@/lib/utils/timeUtils';
import Link from 'next/link';
import { rewordDossierBriefing, getSchoolStabilityReport } from './actions';
import { logTelemetryEvent } from '@/lib/telemetry';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRouter } from 'next/navigation';
import { canonicalCountry, isHousingProvided, getZoneLocationWeights } from '@/lib/calculations';
import { isValidJobTitle } from '@/lib/crawler/titleSanitizer';
import { isTaaleemSchool, resolveTaaleemDirectUrl } from '@/lib/search/taaleem';
import { isSearchCrawler } from '@/lib/utils/crawler-detection';
import CoupleCountryAdvisoryPanel from '@/components/CoupleCountryAdvisory';
import { openMethodologyModal } from '@/components/methodology-modal';
import { checkIsAdmin } from '@/lib/auth/admin';

export interface SavingsBadgeConfig {
  label: string;
  boxStyle: string;
  description: string;
}

export function getSavingsBadgeConfig(monthlySurplus: number): SavingsBadgeConfig {
  if (monthlySurplus >= 2800) {
    return {
      label: "Premium Package",
      boxStyle: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
      description: "High-surplus international package allowing £2,800+ ($3,550+) net monthly surplus after all housing, utility, food, and lifestyle outgoings."
    };
  }
  if (monthlySurplus >= 1900) {
    return {
      label: "Strong Financial Growth",
      boxStyle: "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]",
      description: "Strong wealth-building package allowing £1,900 – £2,799 net monthly surplus after all core living expenses."
    };
  }
  if (monthlySurplus >= 1200) {
    return {
      label: "Comfortable Expat Living",
      boxStyle: "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]",
      description: "Comfortable expat package allowing £1,200 – £1,899 net monthly surplus with good lifestyle quality and regular travel."
    };
  }
  if (monthlySurplus >= 700) {
    return {
      label: "Culture & Travel",
      boxStyle: "bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.15)]",
      description: "Cultural immersion package allowing $700 – $1,199 net monthly surplus with strong focus on lifestyle and travel."
    };
  }
  return {
    label: "Destination-Led Package",
    boxStyle: "bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]",
    description: "Location-driven package focusing on destination experience and cultural immersion, with under $700 net monthly surplus."
  };
}

export function formatCurriculumBadge(curr: string): string {
  if (!curr) return "BRITISH CURRICULUM";
  const upper = curr.trim().toUpperCase();
  if (upper === "UK" || upper === "BRITISH") return "UK BRITISH CURRICULUM";
  return `${upper} CURRICULUM`;
}

export function formatLocation(cityRaw?: string, countryRaw?: string): string {
  const rawStr = [cityRaw, countryRaw].filter(Boolean).join(', ');
  const parts = rawStr.split(/,\s*/).map(p => p.trim()).filter(Boolean);
  const uniqueParts: string[] = [];
  parts.forEach(part => {
    if (!uniqueParts.some(p => p.toLowerCase() === part.toLowerCase())) {
      uniqueParts.push(part);
    }
  });
  return uniqueParts.join(', ');
}

export function sanitizeJobTitle(title?: string): string {
  if (!title) return "Teaching Vacancy";
  let clean = translateJobTitleToEnglish(title);
  return clean
    .replace(/\bTeacher of Physic\b/i, "Teacher of Physics")
    .replace(/\bTeacher of Mathematic\b/i, "Teacher of Mathematics")
    .replace(/\bTeacher of Econom\b/i, "Teacher of Economics")
    .replace(/\bTeacher of Chemistr\b/i, "Teacher of Chemistry")
    .replace(/\bTeacher of Biolog\b/i, "Teacher of Biology")
    .replace(/\bTeacher of Geograph\b/i, "Teacher of Geography")
    .replace(/\bTeacher of Histor\b/i, "Teacher of History")
    .replace(/\bTeacher of Compute\b/i, "Teacher of Computing")
    .replace(/\bTeacher of Informati\b/i, "Teacher of Informatics")
    .replace(/\bTeacher of Busines\b/i, "Teacher of Business Studies")
    .replace(/\bTeacher of Psycholog\b/i, "Teacher of Psychology")
    .replace(/\bTeacher of Sociolog\b/i, "Teacher of Sociology")
    .trim();
}

export function formatVacancyClosingDate(rawDate?: string): { text: string; dotClass: string } {
  if (!rawDate) return { text: "· Rolling", dotClass: "bg-cyan-400" };
  const clean = rawDate.replace(/^\(?closes:\s*/i, "").replace(/\)$/, "").trim();
  if (!clean || clean.toLowerCase() === "rolling") {
    return { text: "· Rolling", dotClass: "bg-cyan-400" };
  }

  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      const now = new Date();
      const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const formattedDate = clean.replace(/ 20\d\d$/, "");
      if (diffDays <= 7 && diffDays >= 0) {
        return { text: `· ${formattedDate}`, dotClass: "bg-amber-400" };
      }
      return { text: `· ${formattedDate}`, dotClass: "bg-emerald-400" };
    }
  } catch {}

  return { text: `· ${clean}`, dotClass: "bg-emerald-400" };
}

const RATES: Record<string, number> = {
  CZK: 30.2, AED: 4.65, EUR: 1.18, GBP: 1.0, SAR: 4.75, QAR: 4.62, CHF: 1.12, DKK: 8.85, USD: 1.27, AZN: 2.15, HKD: 9.85, OMR: 0.49,
  KRW: 1750, VND: 32000, IDR: 20000, KWD: 0.39, BHD: 0.48, EGP: 60, JOD: 0.90, ZAR: 24, MXN: 21, COP: 4900, TZS: 3308, KES: 165
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
  "japan": { has13th: false, has14th: false, note: "Standard UK/Western 12-month payroll structure; base salary is disbursed in 12 equal monthly payments (no 13th/14th month)." },
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

const getJobStatus = (job: any): { status: 'open' | 'closed'; hasDeadline: boolean; label: string } => {
  const today = new Date();
  if (!job) {
    return { status: 'open', hasDeadline: false, label: '' };
  }
  const jobStr = typeof job === 'string' ? job : (job.title || job.name || String(job));
  if (!jobStr || typeof jobStr !== 'string' || typeof jobStr.matchAll !== 'function') {
    return { status: 'open', hasDeadline: false, label: '' };
  }

  // Find all parenthetical blocks in the string
  const parentheticalMatches = [...jobStr.matchAll(/\(([^)]+)\)/g)];
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
    if (closesPart) {
      const parsed = closesPart.replace(/closes:\s*/i, '').trim();
      const lowerParsed = parsed.toLowerCase();
      if (lowerParsed === 'n/a' || lowerParsed === 'na' || lowerParsed === 'rolling' || lowerParsed === 'open' || lowerParsed.includes('object') || lowerParsed.includes('invalid')) {
        closesDate = 'Rolling';
      } else {
        closesDate = parsed;
      }
    }
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
  const { user, isAdmin: authIsAdmin, customId } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setTimeUntilReset(getTimeUntilLocalMidnight().formatted);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const teacherDocRef = useMemoFirebase(() => (mounted && user && firestore ? doc(firestore, 'teachers', user.uid) : null), [firestore, mounted, user]);
  const { data: teacherProfile } = useDoc<TeacherProfile>(teacherDocRef);

  const isAdmin = checkIsAdmin(user, teacherProfile, customId, authIsAdmin);
  const allowance = isAdmin ? 1000 : (teacherProfile?.evaluations_allowance ?? 20);
  const used = teacherProfile?.evaluations_used ?? 0;
  const isPro = teacherProfile?.tier === 'pro' || isAdmin;
  const remainingEvaluations = Math.max(0, allowance - used);
  const isOverLimit = !isAdmin && !isPro && !!user && (used >= allowance);

  const [guestViewCount, setGuestViewCount] = useState<number>(0);
  const [isGuestOverLimit, setIsGuestOverLimit] = useState<boolean>(false);
  const evaluatedSchoolsRef = useRef<Set<string>>(new Set());

  // Auto-reset daily quota on new day arrival for logged in teachers
  useEffect(() => {
    if (user && firestore && teacherProfile) {
      const today = getLocalDateString();
      if (teacherProfile.last_quota_reset_date && teacherProfile.last_quota_reset_date !== today) {
        const teacherDoc = doc(firestore, 'teachers', user.uid);
        const bonusRollover = teacherProfile.bonus_credits || 0;
        updateDoc(teacherDoc, {
          daily_evaluations_used: 0,
          evaluations_used: 0,
          daily_base_quota: 20,
          evaluations_allowance: 20 + bonusRollover,
          last_quota_reset_date: today
        }).catch(err => console.warn('Could not reset daily quota in forecaster:', err));
      }
    }
  }, [user, firestore, teacherProfile]);

  const [lastSelectedOpportunity, setLastSelectedOpportunity] = useState<any>(null);
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
    sources?: string[];
    sourceUrls?: Record<string, string>;
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
  const [benchmarkSalary, setBenchmarkSalary] = useState("0");

  const [responsibilityAllowance, setResponsibilityAllowance] = useState("0");
  const [extraIncome, setExtraIncome] = useState("0");
  const [manualAdjustments, setManualAdjustments] = useState("0");
  const [transportMode, setTransportMode] = useState<"P" | "C">("P");
  const [benchmark, setBenchmark] = useState("GBP");
  const [overrideBedrooms, setOverrideBedrooms] = useState<number | null>(null);
  const [showUpliftOptions, setShowUpliftOptions] = useState(false);
  const [isCompBreakdownOpen, setIsCompBreakdownOpen] = useState(false);
  const [uplift13, setUplift13] = useState(false);
  const [uplift14, setUplift14] = useState(false);
  const [lifestyleMode, setLifestyleMode] = useState<"Saver" | "Comfort" | "Full Expat">("Comfort");

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
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState("");
  const [ledgerFilterCycle, setLedgerFilterCycle] = useState<"ALL" | "CURRENT" | "HISTORIC">("ALL");
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [requestedSchoolId, setRequestedSchoolId] = useState<string | null>(null);
  const [requestedSchoolName, setRequestedSchoolName] = useState<string | null>(null);
  const [requestedJobTitle, setRequestedJobTitle] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlSchoolId = params.get("schoolId") || params.get("id");
      const urlSchoolName = params.get("schoolName") || params.get("school") || params.get("school_name");
      const jobTitle = params.get("jobTitle");
      const famStatusParam = params.get("familyStatus");
      if (urlSchoolId) setRequestedSchoolId(urlSchoolId);
      if (urlSchoolName) setRequestedSchoolName(urlSchoolName);
      if (jobTitle) setRequestedJobTitle(jobTitle);
      if (famStatusParam) {
        let mapped = famStatusParam;
        if (famStatusParam.toLowerCase().includes("married") || famStatusParam === "Couple") mapped = "Couple";
        setSettings(prev => ({ ...prev, familyStatus: mapped }));
      }
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
    const schoolKeyMap = new Map<string, string>();
    for (const k of Object.keys(school)) {
      schoolKeyMap.set(k.toLowerCase().replace(/\s+/g, ''), k);
    }
    for (const key of keys) {
      const cleanKey = key.toLowerCase().replace(/\s+/g, '');
      const realKey = schoolKeyMap.get(cleanKey);
      if (realKey !== undefined) {
        const val = school[realKey];
        if (val !== undefined && val !== null && val !== '' && val !== '—') {
          return val;
        }
      }
    }
    return null;
  };

  const activeSchool = useMemo(() => {
    if (!allSchools || !settings.schoolId) return null;
    const target = settings.schoolId.toLowerCase().trim();
    const targetClean = target.replace(/^flis/i, '');
    const foundDoc = allSchools.find((s: any) => {
      const sIdLower = (s.id || '').toLowerCase().trim();
      const sSchoolIdLower = (s.schoolId || '').toLowerCase().trim();
      return sIdLower === target ||
        sSchoolIdLower === target ||
        sIdLower.replace(/^flis/i, '') === targetClean ||
        sSchoolIdLower.replace(/^flis/i, '') === targetClean;
    }) || null;

    if (!foundDoc) return null;

    // Sub-campus master fallback: if this record is a sub-campus (e.g. flis0224_primary, flis0224_senior),
    // inherit missing financial, salary, and rating data from its master record (e.g. FLIS0224)
    const rawId = String(foundDoc.id || foundDoc.schoolId || '');
    const underscoreIdx = rawId.indexOf('_');
    if (underscoreIdx > 0) {
      const masterPrefix = rawId.substring(0, underscoreIdx).toUpperCase();
      const masterDoc = allSchools.find((s: any) => {
        const sIdUpper = String(s.id || s.schoolId || '').toUpperCase();
        return sIdUpper === masterPrefix || sIdUpper === masterPrefix.replace(/^FLIS/, '');
      });

      if (masterDoc) {
        const merged: Record<string, any> = { ...masterDoc, ...foundDoc };
        const fieldsToInherit = [
          'salary', 'startingSalary', 'expectedSalary5Years', 'salary5YearsExp', 'salaryrange',
          'netbase', 'netmonthlyusd', 'salaryrangeusd', 'cost_savings_rating', 'overall_rating',
          'academic_rating', 'city_safety', 'housingprovision', 'housing', 'accommodation',
          'noncontacttime', 'classsize', 'approvals', 'curriculum', 'profitstatus', 'briefing',
          'scrapedJobsList', 'vacancies_discovered', 'structured_vacancies', 'metrics'
        ];

        fieldsToInherit.forEach(k => {
          if ((foundDoc[k] === undefined || foundDoc[k] === null || foundDoc[k] === '' || foundDoc[k] === '—') && masterDoc[k] !== undefined && masterDoc[k] !== null && masterDoc[k] !== '') {
            merged[k] = masterDoc[k];
          }
        });

        if (masterDoc.intel || foundDoc.intel) {
          merged.intel = {
            ...(masterDoc.intel || {}),
            ...(foundDoc.intel || {}),
          };
          Object.keys(masterDoc.intel || {}).forEach(ik => {
            if ((!foundDoc.intel || foundDoc.intel[ik] === undefined || foundDoc.intel[ik] === null || foundDoc.intel[ik] === '' || foundDoc.intel[ik] === '—') && masterDoc.intel[ik] !== undefined) {
              merged.intel[ik] = masterDoc.intel[ik];
            }
          });
        }

        return merged;
      }
    }

    return foundDoc;
  }, [allSchools, settings.schoolId]);

  const directSchoolDocRef = useMemoFirebase(() => {
    if (!mounted || !firestore || !requestedSchoolId) return null;
    const cleanId = requestedSchoolId.toUpperCase().startsWith("FLIS")
      ? requestedSchoolId.toUpperCase()
      : `FLIS${requestedSchoolId}`;
    return doc(firestore, 'schools', cleanId);
  }, [firestore, mounted, requestedSchoolId]);

  const { data: directSchoolDoc } = useDoc<any>(directSchoolDocRef);

  const targetSchoolName = useMemo(() => {
    if (requestedSchoolName) return requestedSchoolName;
    if (directSchoolDoc) return directSchoolDoc.name || directSchoolDoc.schoolname || directSchoolDoc.schoolName || null;
    if (!requestedSchoolId || !allSchools) return null;
    const reqLower = requestedSchoolId.toLowerCase();
    const reqClean = requestedSchoolId.replace(/^FLIS/i, "");
    const found = allSchools.find((s: any) =>
      s.id?.toLowerCase() === reqLower ||
      s.id?.replace(/^FLIS/i, "") === reqClean
    );
    return found?.name || found?.schoolname || found?.schoolName || found?.institutionName || null;
  }, [allSchools, requestedSchoolId, directSchoolDoc, requestedSchoolName]);

  // Track guest (up to 3 views) and authenticated views on activeSchool change
  useEffect(() => {
    if (!mounted || !activeSchool) return;

    const schoolKey = (activeSchool.id || activeSchool.schoolId || settings.schoolId || '').toLowerCase().trim();
    if (!schoolKey) return;

    if (!user) {
      if (isSearchCrawler()) {
        setIsGuestOverLimit(false);
        return;
      }
      try {
        const storedViews: string[] = JSON.parse(localStorage.getItem('lfi_guest_evaluated_schools') || '[]');
        if (storedViews.includes(schoolKey)) {
          setGuestViewCount(storedViews.length);
          if (storedViews.length > 3) {
            setIsGuestOverLimit(true);
          } else {
            setIsGuestOverLimit(false);
          }
        } else {
          if (storedViews.length >= 3) {
            setIsGuestOverLimit(true);
            setGuestViewCount(storedViews.length);
          } else {
            const updated = [...storedViews, schoolKey];
            localStorage.setItem('lfi_guest_evaluated_schools', JSON.stringify(updated));
            setGuestViewCount(updated.length);
            setIsGuestOverLimit(false);
          }
        }
      } catch (e) {
        // Safe fallback
      }
    } else {
      setIsGuestOverLimit(false);
      // Authenticated user view tracking
      if (firestore && !evaluatedSchoolsRef.current.has(schoolKey) && !isOverLimit) {
        evaluatedSchoolsRef.current.add(schoolKey);
        const teacherDoc = doc(firestore, 'teachers', user.uid);
        updateDoc(teacherDoc, {
          evaluations_used: increment(1),
          daily_evaluations_used: increment(1),
        }).catch((err) => console.warn('Could not increment evaluations_used:', err));
      }
    }
  }, [mounted, activeSchool, user, firestore, isOverLimit, settings.schoolId]);

  const handleOpenDataLock = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lfi:open-intel-modal', {
        detail: {
          isDataLock: true,
          schoolName: activeSchool?.schoolname || activeSchool?.name,
          location: [activeSchool?.city || activeSchool?.location, activeSchool?.country].filter(Boolean).join(', '),
          category: 'Salary'
        }
      }));
    }
  };



  // 🛸 Fetch ALL jobs for this school from featured_jobs_cache (approved + expired)
  // so we have 2 years of history for the turnover engine. activeVacancies filters to open only.
  const schoolJobsQuery = useMemoFirebase(
    () => {
      if (!mounted || !firestore || !activeSchool?.id) return null;
      const ids = Array.from(new Set([
        activeSchool.id,
        activeSchool.id.toLowerCase(),
        activeSchool.id.toUpperCase(),
        ...(activeSchool.schoolId ? [activeSchool.schoolId, activeSchool.schoolId.toLowerCase(), activeSchool.schoolId.toUpperCase()] : [])
      ]));
      return query(
        collection(firestore, 'featured_jobs_cache'),
        where('schoolId', 'in', ids)
      );
    },
    [firestore, mounted, activeSchool?.id, activeSchool?.schoolId]
  );
  const { data: schoolJobsData } = useCollection<any>(schoolJobsQuery);

  // 🛸 ALSO fetch admin-added historic jobs from schools/{id}/jobs subcollection
  // These are manually added by admins to build a fuller turnover picture.
  const adminJobsQuery = useMemoFirebase(
    () => (mounted && firestore && activeSchool?.id
      ? collection(firestore, 'schools', activeSchool.id, 'jobs')
      : null),
    [firestore, mounted, activeSchool?.id]
  );
  const { data: adminJobsData } = useCollection<any>(adminJobsQuery);

  // 🎯 JANITOR ENGINE FILTER FOR NON-JOB TITLES & DUPLICATES
  const isInvalidNonJobTitle = useCallback((title: string): boolean => {
    if (!title || typeof title !== 'string') return true;
    if (isSupportOrNonTeachingRole(title)) return true;
    const t = title.toLowerCase().trim();
    if (!t || t.length < 3) return true;

    // 1. Accessibility, HTML Links & Navigation Headings
    if (/\b(skip\s+to\s+(main\s+)?content|skip\s+navigation|accessibility|site\s+map|privacy\s+policy|terms\s+of\s+use|cookie\s+policy)\b/i.test(t)) return true;
    if (/\b(working\s+at\b|work\s+at\b|work\s+with\s+us|working\s+with\s+us|careers?\s+at\b|life\s+at\b|about\s+us|contact\s+us|life\s+in\b|living\s+in\b|living\s+abroad|location\s+guide)\b/i.test(t)) return true;

    // 2. Generic Category Headings, Groupings & Page Section Titles
    if (/\b(faculty\s+openings|academic\s+openings|teaching\s+openings|support\s+staff\s+openings|administrator\s+openings|instructional\s+assistant\s+openings)\b/i.test(t)) return true;
    if (/\b(current\s+openings|job\s+openings|career\s+openings|vacancies|employment\s+opportunities|all\s+vacancies|open\s+positions)\b/i.test(t)) return true;
    if (/\b(head\s+of\s+school\s+welcome|welcome\s+from|welcome\s+message|welcome\s+to|principal'?s?\s+welcome|headteacher'?s?\s+welcome)\b/i.test(t)) return true;
    if (/\b(academic\s+leadership\s+team|leadership\s+team|meet\s+the\s+team|our\s+faculty|department\s+heads|leadership\s+&\s+governance|governance|board\s+of\s+trustees)\b/i.test(t)) return true;
    if (/\b(clubs\s+&\s+leadership|extracurriculars?|co-curricular|student\s+life|clubs?\s+and\s+activities)\b/i.test(t)) return true;
    if (/\b(how\s+to\s+apply|working\s+with\s+us|why\s+join\s+us|about\s+our\s+school|general\s+applications?|speculative\s+applications?|open\s+applications?)\b/i.test(t)) return true;

    // 3. Testimonials, Reports & Website Navigation Section Headers
    if (/\b(what\s+our\s+(teachers?|students?|parents?)\s+say|our\s+teachers|teacher\s+stories|teacher\s+voices|student\s+voices)\b/i.test(t)) return true;
    if (/\b(inspection\s+reports?|ofsted\s+report|isi\s+report|bso\s+report|accreditation\s+report)\b/i.test(t)) return true;
    if (/\b(real\s+life\s+experiences?|student\s+experiences?|life\s+experiences?)\b/i.test(t)) return true;
    if (/\b(work\s+experience(\s+for\s+.*)?|internships?|volunteering)\b/i.test(t)) return true;
    if (/\b(teacher\s+training|staff\s+development|professional\s+development|cpd)\b/i.test(t)) return true;
    if (/\b([a-z0-9]+\s+people|our\s+people|meet\s+the\s+people|our\s+staff|meet\s+our\s+experts|meet\s+our\s+staff)\b/i.test(t)) return true;
    if (/\b(the\s+way\s+we\s+teach|our\s+results|our\s+stories|results\s+&\s+stories)\b/i.test(t)) return true;

    // 4. Assistants, TA, Substitute/Supply & Non-Teaching Support Staff
    if (/\b(substitute|supply|relief|casual|temporary\s+cover)\b/i.test(t)) return true;
    if (/\b(instructional\s+assistant|learning\s+support\s+assistant|lsa|teaching\s+assistant|teacher\s+assistant|educational\s+assistant|classroom\s+assistant|assistant\s+teacher)\b/i.test(t)) return true;
    if (/\b(support\s+staff|admin(istrative)?\s+assistant|office\s+assistant|receptionist|secretary|nurse|nursing|bus\s+driver|janitor|caretaker|facilities|it\s+technician|lab\s+technician)\b/i.test(t)) return true;

    // 5. Community, PTA, Alumni & Student Events
    if (/\b(parent\s+teacher\s+association|pta|alumni\s+association|friends\s+of\s+the\s+school)\b/i.test(t)) return true;
    if (/\b(conference|symposium|summit|competition|olympiad)\b/i.test(t)) return true;

    // 6. Single-Word Department Headers (e.g. "Arts", "Sports", "Music") without specific role nouns
    const singleWordCategories = ['arts', 'art', 'music', 'sports', 'pe', 'science', 'math', 'humanities', 'languages', 'english', 'primary', 'secondary', 'leadership'];
    if (singleWordCategories.includes(t)) return true;

    // 7. Generic Category Phrase Ends With "Openings", "Opportunities", "Vacancies" without specific role
    if (/^(support\s+staff|admin(istrator)?|faculty|academic|substitute|general)\s+(openings|opportunities|vacancies|positions)$/i.test(t)) return true;

    // 8. Talent Pools, Expressions of Interest & Generic School Open Applications
    if (/^vacanc(y|ies)\s+at\b/i.test(t)) return true;
    if (/^(careers?|jobs?|work|working|employment)\s+at\b/i.test(t)) return true;
    if (/\b(talent\s+pool|talent\s+bank|talent\s+community|expression\s+of\s+interest|register\s+(your\s+)?interest|future\s+(teaching\s+)?opportunities|future\s+vacancies|future\s+openings)\b/i.test(t)) return true;
    if (/\b(general\s+vacancy|general\s+teaching\s+vacancy|general\s+application|speculative\s+application|unsolicited\s+application)\b/i.test(t)) return true;

    return false;
  }, []);

  const normalizeJobTitleKey = useCallback((title: string): string => {
    if (!title || typeof title !== "string") return "";
    let clean = title
      .replace(/\([^)]*\)/g, "")
      .replace(/\(.*$/, "")
      .toLowerCase();

    // Strip campus and school noise
    clean = clean
      .replace(/\b(raha\s+international(\s+school)?|raha\s+gardens(\s+campus)?|gardens\s+campus|khalifa\s+city(\s+campus)?|kcc|gc|ris)\b/gi, "")
      .replace(/\b(dubai\s+british(\s+school)?|emirates\s+hills|jumeirah\s+park|mira|jumeira|dbs|dbf)\b/gi, "")
      .replace(/\b(immediate\s+start|maternity\s+cover|temp\s+role|january\s+start|august\s+202[4-7]|jan\s+202[4-7]|january\s+202[4-7]|academic\s+year.*|202[4-7](\s*[\/-]\s*202[4-7])?)\b/gi, "")
      .replace(/\b(school\s*year|sy|academic\s*year)?\s*202[4-7](\s*[\/-]\s*202[4-7])?\b/gi, "")
      .replace(/\b(misk\s+schools|reigate\s+grammar|downe\s+house|al\s+faris|british\s+international).*$/gi, "")
      .replace(/\b(pos(ition)?|ref|full[\s-]?time|part[\s-]?time|btec|sec|secondary|primary)\b/gi, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return clean;
  }, []);

  const getSourceColorDot = useCallback((sourceName?: string, applyUrl?: string) => {
    const s = String(sourceName || '').toLowerCase();
    const url = String(applyUrl || '').toLowerCase();

    if (s.includes('cognita') || url.includes('cognita')) return 'bg-sky-400 border-sky-300 shadow-[0_0_6px_rgba(56,189,248,0.6)]';
    if (s.includes('tes') || url.includes('tes.com')) return 'bg-indigo-400 border-indigo-300 shadow-[0_0_6px_rgba(129,140,248,0.6)]';
    if (s.includes('schrole') || url.includes('schrole.com')) return 'bg-purple-400 border-purple-300 shadow-[0_0_6px_rgba(192,132,252,0.6)]';
    if (s.includes('nord anglia') || url.includes('nordanglia')) return 'bg-amber-400 border-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.6)]';
    if (s.includes('grc') || url.includes('grcfair')) return 'bg-cyan-400 border-cyan-300 shadow-[0_0_6px_rgba(34,211,238,0.6)]';
    if (s.includes('inspired') || url.includes('inspirededu')) return 'bg-purple-400 border-purple-300 shadow-[0_0_6px_rgba(192,132,252,0.6)]';
    if (s.includes('teach away') || s.includes('teachaway') || url.includes('teachaway.com')) return 'bg-emerald-400 border-emerald-300 shadow-[0_0_6px_rgba(52,211,153,0.6)]';
    if (s.includes('malvern') || url.includes('malverncollege')) return 'bg-rose-400 border-rose-300 shadow-[0_0_6px_rgba(251,113,133,0.6)]';
    if (s.includes('uwc') || url.includes('uwc.org')) return 'bg-violet-400 border-violet-300 shadow-[0_0_6px_rgba(167,139,250,0.6)]';
    if (s.includes('isp') || url.includes('internationalschools')) return 'bg-emerald-400 border-emerald-300 shadow-[0_0_6px_rgba(52,211,153,0.6)]';
    if (s.includes('globeducate') || s.includes('globe') || url.includes('globeducate')) return 'bg-cyan-400 border-cyan-300 shadow-[0_0_6px_rgba(34,211,238,0.6)]';

    return 'bg-emerald-500 border-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]';
  }, []);

  const isCityOrCampusMismatch = useCallback((jobTitle: string, schoolCity?: string, schoolCountry?: string, jobSchoolId?: string, activeSchoolId?: string): boolean => {
    if (!jobTitle) return false;

    // 1. Strict school ID check: if job has an explicit schoolId and it doesn't match the active school, reject
    if (jobSchoolId && activeSchoolId && jobSchoolId.trim().toUpperCase() !== activeSchoolId.trim().toUpperCase()) return true;

    const t = jobTitle.toLowerCase();
    const c = (schoolCity || '').toLowerCase().trim();
    const country = (schoolCountry || '').toLowerCase().trim();

    // 2. Chinese city/location tags mismatching non-China schools
    const chinaLocations = ['shenzhen', 'hangzhou', 'chengdu', 'futian', 'nanshan', 'park lane harbour', 'guangzhou', 'beijing', 'shanghai'];
    if (country !== 'china' && chinaLocations.some(loc => t.includes(loc))) return true;

    if (c === 'prague' && (t.includes('ostrava') || t.includes('brno') || t.includes('liberec'))) return true;
    if (c === 'ostrava' && (t.includes('prague') || t.includes('brno') || t.includes('liberec'))) return true;
    if (c === 'dubai' && (t.includes('abu dhabi') || t.includes('sharjah') || t.includes('al ain'))) return true;
    if (c === 'abu dhabi' && (t.includes('dubai') || t.includes('sharjah') || t.includes('al ain'))) return true;

    return false;
  }, []);

  const allProcessedJobs = useMemo(() => {
    if (!schoolJobsData && !adminJobsData) return [];
    const today = new Date();
    const twentyFourMonthsAgo = new Date(today.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);

    // 🛸 NORMALISE JOB RECORD from either featured_jobs_cache or schools/{id}/jobs subcollection
    const normaliseJob = (job: any) => {
      // ── Closing date ──────────────────────────────────────────────────────────
      // featured_jobs_cache: closingDateMillis (number) or closingDate (string/Timestamp)
      // subcollection: closingDate (Timestamp) — admin-added historic jobs
      let closes: Date | null = null;
      if (job.closingDateMillis && !isNaN(Number(job.closingDateMillis))) {
        closes = new Date(Number(job.closingDateMillis));
      } else if (job.closingDate?.seconds) {
        closes = new Date(job.closingDate.seconds * 1000);
      } else if (job.closingDate?._seconds) {
        closes = new Date(job.closingDate._seconds * 1000);
      } else if (job.closingDate && typeof job.closingDate === "string") {
        const dStr = job.closingDate.trim();
        const lowerD = dStr.toLowerCase();
        if (lowerD !== "n/a" && lowerD !== "na" && lowerD !== "rolling" && lowerD !== "open" && !lowerD.includes("object") && !lowerD.includes("invalid")) {
          const parsedDt = new Date(dStr);
          if (!isNaN(parsedDt.getTime())) {
            closes = parsedDt;
          }
        }
      } else if (job.closingDate && typeof job.closingDate === "number") {
        closes = new Date(job.closingDate);
      }

      // ── Posted/ingested date ──────────────────────────────────────────────────
      // ── Posted/ingested date ──────────────────────────────────────────────────
      // Prioritise explicitly stated post/posted dates over raw ingestion timestamps
      let scraped: Date;
      const explicitPosted = job.postedDate || job.postDate || job.datePosted || job.date_listed;
      if (explicitPosted && typeof explicitPosted === 'string' && !isNaN(Date.parse(explicitPosted))) {
        scraped = new Date(explicitPosted);
      } else if (explicitPosted && typeof explicitPosted === 'number') {
        scraped = new Date(explicitPosted);
      } else if (job.ingestedAtMillis) {
        scraped = new Date(job.ingestedAtMillis);
      } else if (job.firstDiscoveredAt?.seconds) {
        scraped = new Date(job.firstDiscoveredAt.seconds * 1000);
      } else if (job.firstDiscoveredAt?._seconds) {
        scraped = new Date(job.firstDiscoveredAt._seconds * 1000);
      } else if (job.scrapedAt?.seconds) {
        scraped = new Date(job.scrapedAt.seconds * 1000);
      } else if (job.scrapedAt?._seconds) {
        scraped = new Date(job.scrapedAt._seconds * 1000);
      } else if (job.scrapedAt) {
        scraped = new Date(job.scrapedAt);
      } else if (closes && !isNaN(closes.getTime())) {
        scraped = new Date(closes.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        scraped = today;
      }

      const isRolling = job.isRollingDeadline === true || job.isRolling === true;
      // rejected = never a real vacancy, skip entirely at filter stage
      const cacheStatus = job.status || 'approved';
      const isExpired = !isRolling && closes !== null && (closes < today || cacheStatus === 'expired');
      const twelveMonthsAgoCutoff = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
      const recruitmentCycle = (closes !== null && closes < twelveMonthsAgoCutoff) ? "HISTORIC_Y1" : "CURRENT";

      // ── Department (prefer Pipeline 2 enriched value, fall back to title inference) ──
      let department = job.department || "Secondary";
      if (!job.department) {
        const lowerTitle = (job.title || "").toLowerCase();
        if (lowerTitle.includes("primary") || lowerTitle.includes("prep") || lowerTitle.includes("early years") || lowerTitle.includes("preschool") || lowerTitle.includes("kindergarten") || lowerTitle.includes("eyfs") || lowerTitle.includes("ks1") || lowerTitle.includes("class teacher")) {
          department = "Primary";
        } else if (lowerTitle.includes("head") || lowerTitle.includes("director") || lowerTitle.includes("principal") || lowerTitle.includes("coordinator")) {
          department = "Leadership";
        }
      }

      return {
        id: job.id || job.jobFingerprint,
        schoolId: job.schoolId || activeSchool?.id || "",
        schoolName: job.schoolName || activeSchool?.schoolname || activeSchool?.name || "",
        title: (() => {
          let clean = String(job.title || "").trim();
          clean = clean.replace(/\s*,\s*([A-Z][a-z]+|\s)+is\s+excited\s+to\s+announce.*$/i, "");
          clean = clean.replace(/\s*is\s+excited\s+to\s+announce.*$/i, "");
          clean = clean.replace(/\s*is\s+looking\s+to\s+recruit.*$/i, "");
          return clean.trim() || "Unknown Position";
        })(),
        source: job.source || job.sourceName || "Web",
        sources: job.sources,
        sourceUrls: job.sourceUrls,
        postedDate: scraped.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        closesDate: (isRolling || !closes || isNaN(closes.getTime())) ? "Rolling" : closes.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        cacheStatus,
        status: isExpired ? 'closed' : 'open',
        isRolling,
        department,
        recruitmentCycle,
        rawPostedDate: scraped,
        rawClosesDate: closes,
        applyUrl: job.applyUrl || job.source_url || "",
        curriculum: job.curriculum || "",
        // featured_jobs_cache uses savingsPotentialSingle; subcollection used savingsPotential
        savingsPotential: job.savingsPotentialSingle || job.savingsPotential || 0,
        schoolRating: job.schoolRating || "",
        city: job.city || "",
        country: job.country || ""
      };
    };

    // 🔀 MERGE: featured_jobs_cache + admin-added subcollection jobs + stabilityReport vacancies
    const cacheJobs = (schoolJobsData || []).map(normaliseJob);
    const adminJobs = (adminJobsData || []).map(normaliseJob);
    const stabilityJobs = (stabilityReport?.vacancies_discovered || []).map((v: any) => normaliseJob({
      id: `stability_${(v.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      title: v.title,
      source: v.source || 'Cognita / TES',
      postedDate: v.date_listed,
      closingDate: v.date_closing,
      status: v.status === 'OPEN' ? 'approved' : 'expired',
      department: v.department,
      applyUrl: v.source_url || ''
    }));

    const mergedList = [...cacheJobs, ...adminJobs, ...stabilityJobs];

    const rawList = mergedList
      .filter(job => job.cacheStatus !== 'rejected')   // skip jobs that were never validated
      .filter(job => job.rawPostedDate >= twentyFourMonthsAgo)
      .filter(job => isValidJobTitle(job.title) && !isInvalidNonJobTitle(job.title) && !isCityOrCampusMismatch(job.title, activeSchool?.city, activeSchool?.country, job.schoolId, activeSchool?.id));

    // 🎯 SMART DEDUPLICATION (PRESERVING GENUINE EXTRA POSITIONS WHILE COLLAPSING MULTI-PORTAL DUAL LISTINGS)
    const result: any[] = [];
    rawList.forEach((job: any) => {
      const jobNormKey = normalizeJobTitleKey(job.title || job.rawTitle || "");

      const matchIndex = result.findIndex((existing: any) => {
        // 1. Exact ID match
        if (existing.id && job.id && existing.id === job.id) return true;

        // 2. Same normalized job title key or substring match (collapses multi-portal dual-listings)
        const existingNormKey = normalizeJobTitleKey(existing.title || existing.rawTitle || "");
        if (jobNormKey && existingNormKey) {
          if (jobNormKey === existingNormKey) return true;
          if (jobNormKey.length > 3 && existingNormKey.length > 3) {
            if (jobNormKey.includes(existingNormKey) || existingNormKey.includes(jobNormKey)) return true;
          }
        }

        // 3. Exact applyUrl match (same specific web listing)
        if (existing.applyUrl && job.applyUrl && existing.applyUrl === job.applyUrl && !job.applyUrl.endsWith("/career/") && !job.applyUrl.endsWith("/careers")) return true;

        return false;
      });

      if (matchIndex === -1) {
        result.push(job);
      } else {
        const existing = result[matchIndex];
        
        // Merge sources into existing item
        const existingSources = existing.sources || [existing.source || "Web"];
        const newSources = job.sources || [job.source || "Web"];
        newSources.forEach((s: string) => {
          if (!existingSources.includes(s)) existingSources.push(s);
        });
        existing.sources = existingSources;
        if (existingSources.length > 1) {
          existing.source = existingSources.join(" / ");
        }

        // Merge sourceUrls
        if (job.sourceUrls) {
          existing.sourceUrls = { ...(existing.sourceUrls || {}), ...job.sourceUrls };
        }

        if (existing.isRolling && !job.isRolling) {
          result[matchIndex] = { ...job, sources: existingSources, sourceUrls: existing.sourceUrls };
        } else if (!existing.isRolling && job.isRolling) {
          // Keep explicit non-rolling closed record
        } else if (job.status === "open" && existing.status !== "open") {
          result[matchIndex] = { ...job, sources: existingSources, sourceUrls: existing.sourceUrls };
        } else if (job.status === existing.status) {
          if (job.rawClosesDate && existing.rawClosesDate && job.rawClosesDate > existing.rawClosesDate) {
            result[matchIndex] = { ...job, sources: existingSources, sourceUrls: existing.sourceUrls };
          }
        }
      }
    });



    return result.sort((a, b) => {
      if (a.status === 'open' && b.status !== 'open') return -1;
      if (a.status !== 'open' && b.status === 'open') return 1;
      return b.rawPostedDate.getTime() - a.rawPostedDate.getTime();
    });
  }, [schoolJobsData, adminJobsData, stabilityReport, activeSchool?.city, isInvalidNonJobTitle, normalizeJobTitleKey, isCityOrCampusMismatch]);

  // 📅 Compute earliest posted date among processed jobs
  const earliestPosted = useMemo(() => {
    if (!allProcessedJobs || allProcessedJobs.length === 0) return null;
    const dates = allProcessedJobs
      .map((j: any) => j.rawPostedDate)
      .filter(Boolean);
    if (dates.length === 0) return null;
    return new Date(Math.min(...dates.map((d: any) => d.getTime())));
  }, [allProcessedJobs]);

  // 🔢 Determine how many months of history we have (capped at 24, minimum 1)
  const historicMonths = useMemo(() => {
    if (earliestPosted) {
      const diffMs = Date.now() - earliestPosted.getTime();
      const months = Math.floor(diffMs / (30 * 24 * 60 * 60 * 1000));
      return Math.min(24, Math.max(1, months));
    }
    const hasKnownVacancies =
      (allProcessedJobs && allProcessedJobs.length > 0) ||
      (activeSchool?.scrapedJobsList && activeSchool.scrapedJobsList.length > 0) ||
      (activeSchool?.vacancies_discovered && activeSchool.vacancies_discovered.length > 0) ||
      (activeSchool?.structured_vacancies && activeSchool.structured_vacancies.length > 0) ||
      (activeSchool?.metrics?.totalKnownVacancies && Number(activeSchool.metrics.totalKnownVacancies) > 0);

    if (hasKnownVacancies) {
      return 1;
    }
    return null;
  }, [earliestPosted, allProcessedJobs, activeSchool]);

  // 🎯 ACTIVE OPEN VACANCIES MEMO (FILTERED & DEDUPLICATED)
  const activeVacancies = useMemo(() => {
    let rawList: any[] = [];

    // Only show jobs that are open (closing date in future) AND approved in cache
    const openJobs = allProcessedJobs.filter((j: any) => j.status === 'open' && j.cacheStatus === 'approved');
    if (openJobs.length > 0) {
      rawList = openJobs;
    } else if (activeSchool?.scrapedJobsList && Array.isArray(activeSchool.scrapedJobsList) && activeSchool.scrapedJobsList.length > 0) {
      rawList = activeSchool.scrapedJobsList.map((jobStr: any, idx: number) => {
        const jobString = typeof jobStr === 'string' ? jobStr : (jobStr?.title || jobStr?.name || String(jobStr || ''));
        const statusObj = getJobStatus(jobString);
        const cleanTitle = jobString.replace(/\([^)]*\)/g, '').trim();
        let closesDate = "";
        if (statusObj.label.includes("Closes:")) {
          closesDate = statusObj.label.split("Closes:")[1].replace(")", "").trim();
        }
        return {
          id: `scraped-${idx}`,
          title: cleanTitle || jobString,
          source: "Web Scraping",
          postedDate: "",
          closesDate,
          status: statusObj.status,
          department: "Teaching",
          recruitmentCycle: "CURRENT",
          applyUrl: activeSchool.careersPageUrl || activeSchool.schooljp || "",
          curriculum: activeSchool.curriculum || "",
          savingsPotential: 0,
          schoolRating: activeSchool.totalscore || activeSchool.score || "",
          city: activeSchool.city || "",
          country: activeSchool.country || ""
        };
      }).filter((j: any) => j.status === 'open');
    }

    // 1. Filter out non-job section titles, generic web headings & city/campus mismatches
    const validJobs = rawList.filter((j: any) =>
      isValidJobTitle(j.title) &&
      !isInvalidNonJobTitle(j.title) &&
      !isCityOrCampusMismatch(j.title, activeSchool?.city, activeSchool?.country, j.schoolId, activeSchool?.id)
    );

    // 2. Deduplicate by normalized job title key so each position is listed once
    const seenMap = new Map<string, any>();
    validJobs.forEach((job: any) => {
      const normKey = normalizeJobTitleKey(job.title);
      if (!normKey) return;
      if (!seenMap.has(normKey)) {
        seenMap.set(normKey, job);
      } else {
        const existing = seenMap.get(normKey);
        if (!existing.closesDate && job.closesDate) {
          seenMap.set(normKey, job);
        }
      }
    });

    return Array.from(seenMap.values());
  }, [allProcessedJobs, activeSchool, isInvalidNonJobTitle, normalizeJobTitleKey]);

  // 🏎️ TACTICAL TRANSPORT OVERRIDES: Oman & UWC East Africa (FLIS0249, both campuses) default to Car Hire
  useEffect(() => {
    const sId = (settings.schoolId || activeSchool?.id || "").toLowerCase();
    const sName = (activeSchool?.name || activeSchool?.schoolname || "").toLowerCase();
    const cName = (settings.country || "").toLowerCase();

    if (
      cName === "oman" ||
      sId.startsWith("flis0249") ||
      sName.includes("uwc east africa")
    ) {
      setTransportMode("C");
    }
  }, [settings.country, settings.schoolId, activeSchool]);

  useEffect(() => {
    if (mounted && allSchools && allSchools.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const urlSchoolId = params.get('schoolId') || params.get('id');
      const jobTitle = params.get('jobTitle');

      if (jobTitle) {
        let parsedSources: string[] | undefined = undefined;
        let parsedSourceUrls: Record<string, string> | undefined = undefined;
        try {
          const rawSources = params.get("sources");
          if (rawSources) parsedSources = JSON.parse(decodeURIComponent(rawSources));
        } catch (e) { }
        try {
          const rawSourceUrls = params.get("sourceUrls");
          if (rawSourceUrls) parsedSourceUrls = JSON.parse(decodeURIComponent(rawSourceUrls));
        } catch (e) { }

        setSelectedOpportunity({
          jobId: params.get("jobId") || undefined,
          jobTitle: translateJobTitleToEnglish(jobTitle),
          department: params.get("department") || undefined,
          curriculum: params.get("curriculum") || undefined,
          applyUrl: params.get("applyUrl") || undefined,
          closesDate: params.get("closesDate") || undefined,
          savingsPotential: params.get("savingsPotential") ? Number(params.get("savingsPotential")) : undefined,
          schoolRating: params.get("schoolRating") || undefined,
          source: params.get("source") || undefined,
          sources: parsedSources,
          sourceUrls: parsedSourceUrls,
          city: params.get("city") || undefined,
          country: params.get("country") || undefined
        });
      }

      const urlSchoolName = params.get('schoolName') || params.get('school');
      let found: any = null;
      if (urlSchoolId) {
        const reqLower = urlSchoolId.toLowerCase().trim();
        const reqClean = reqLower.replace(/^flis/i, '');
        found = allSchools.find((s: any) => {
          const sIdLower = (s.id || '').toLowerCase().trim();
          const sSchoolIdLower = (s.schoolId || '').toLowerCase().trim();
          return sIdLower === reqLower ||
            sSchoolIdLower === reqLower ||
            sIdLower.replace(/^flis/i, '') === reqClean ||
            sSchoolIdLower.replace(/^flis/i, '') === reqClean;
        });
      }
      if (!found && urlSchoolName) {
        const sNameLower = urlSchoolName.toLowerCase().trim();
        found = allSchools.find((s: any) => {
          const name1 = (s.schoolname || s.name || s.schoolName || '').toLowerCase().trim();
          return name1.length > 3 && (name1.includes(sNameLower) || sNameLower.includes(name1));
        });
      }
      if (found) {
        setSettings(prev => ({
          ...prev,
          schoolId: found.id,
          country: found.country || found.region || ""
        }));
      } else if (params.get('country')) {
        setSettings(prev => ({
          ...prev,
          country: params.get('country') || prev.country
        }));
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
      let staffBaseVal = parseInt(String(activeSchool.numericalstaff || activeSchool.staffcount || "80").replace(/[^0-9]/g, ''), 10) || 80;
      if (staffBaseVal > 1000 && activeSchool.staffcount) {
        const alt = parseInt(String(activeSchool.staffcount).replace(/[^0-9]/g, ''), 10);
        if (alt > 0 && alt <= 1000) staffBaseVal = alt;
      }
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

  const prevSchoolIdRef = useRef<string | null>(null);

  // ⏱️ AUTO-POLL: when SWR returns isUpdating=true, re-poll after 30s so pill disappears
  useEffect(() => {
    if (!stabilityReport?.isUpdating) return;
    const timer = setTimeout(() => {
      loadStabilityReport(false);
    }, 30000);
    return () => clearTimeout(timer);
  }, [stabilityReport?.isUpdating, loadStabilityReport]);

  useEffect(() => {
    const currentId = activeSchool?.id || null;
    if (prevSchoolIdRef.current !== null && prevSchoolIdRef.current !== currentId) {
      // Clean up opportunity & overrides when user changes school
      setSelectedOpportunity(null);
      setOverrideBedrooms(null);
      setManualAdjustments("0");
      setBriefingRequested(false);
      setRewordedBriefingText("");
    }
    prevSchoolIdRef.current = currentId;

    setTurnoverUnlocked(false);
    setStabilityReport(null); // Clear previous report immediately to show progress card/loader!
    if (!activeSchool) {
      setStabilityError(null);
      return;
    }
    loadStabilityReport(false);
  }, [activeSchool?.id, loadStabilityReport]);

  const handleCountrySelect = useCallback((newCountry: string) => {
    const matchingSchools = allSchools?.filter((s: any) => canonicalCountry(s.country) === canonicalCountry(newCountry) && !s.isCampusStub) || [];
    const firstSchool = matchingSchools.length > 0 ? matchingSchools[0] : null;
    const newSchoolId = firstSchool ? firstSchool.id : "";

    setSelectedOpportunity(null);
    setOverrideBedrooms(null);
    setManualAdjustments("0");
    setBriefingRequested(false);
    setRewordedBriefingText("");

    setSettings(prev => ({
      ...prev,
      country: canonicalCountry(newCountry),
      schoolId: newSchoolId
    }));

    if (typeof window !== 'undefined') {
      const newUrl = new URL(window.location.href);
      if (newSchoolId) {
        newUrl.searchParams.set('schoolId', newSchoolId);
      } else {
        newUrl.searchParams.delete('schoolId');
      }
      newUrl.searchParams.delete('jobId');
      newUrl.searchParams.delete('jobTitle');
      newUrl.searchParams.delete('department');
      newUrl.searchParams.delete('applyUrl');
      newUrl.searchParams.delete('closesDate');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [allSchools]);

  const handleSchoolSelect = useCallback((newSchoolId: string) => {
    const foundSchool = allSchools?.find((s: any) => s.id === newSchoolId);
    const foundCountry = foundSchool ? canonicalCountry(foundSchool.country || foundSchool.region || settings.country) : canonicalCountry(settings.country);

    setSelectedOpportunity(null);
    setOverrideBedrooms(null);
    setManualAdjustments("0");
    setBriefingRequested(false);
    setRewordedBriefingText("");

    setSettings(prev => ({
      ...prev,
      country: foundCountry,
      schoolId: newSchoolId
    }));

    if (newSchoolId && typeof window !== 'undefined') {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('schoolId', newSchoolId);
      newUrl.searchParams.delete('jobId');
      newUrl.searchParams.delete('jobTitle');
      newUrl.searchParams.delete('department');
      newUrl.searchParams.delete('applyUrl');
      newUrl.searchParams.delete('closesDate');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [allSchools, settings.country]);

  const normalize = (str: string) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, '').trim();

  const activeCOL = useMemo(() => {
    if (!activeSchool || !costOfLiving) return null;
    const sCity = normalize(String(getSchoolField(activeSchool, ['city', 'town', 'location']) || ''));
    const sCountry = canonicalCountry(String(getSchoolField(activeSchool, ['country', 'region']) || ''));

    // 🇲🇨 MONACO CROSS-BORDER LIVING FIX (use French accommodation prices from #FLIS0193 / France)
    if (sCountry === "monaco" || sCity === "monaco" || String(activeSchool.id || "").toUpperCase() === "FLIS0041") {
      const flis0193Col = costOfLiving.find((c: any) =>
        normalize(c.id || c.schoolId || c.schoolid || "").includes("flis0193") ||
        normalize(c.city || c.city_name || "").includes("mougins") ||
        normalize(c.id || "").includes("france") ||
        canonicalCountry(c.country || "") === "france"
      );
      if (flis0193Col) return flis0193Col;
    }

    const countryMatches = costOfLiving.filter((c: any) => {
      const cCountry = canonicalCountry(c.country || c.countryName || '');
      const cCity = normalize(c.city || c.cityName || '');
      const cId = normalize(c.id);
      return cCountry === sCountry ||
        cId === sCountry ||
        cId.includes(sCountry) ||
        (sCountry === 'hong kong' && (cCity.includes('hongkong') || cId.includes('hongkong'))) ||
        (sCountry === 'united arab emirates' && (cCountry.includes('uae') || cId.includes('uae') || cCountry.includes('emirates'))) ||
        (sCountry === 'united kingdom' && (cCountry.includes('england') || cId.includes('england') || cId.includes('london') || cId.includes('uk'))) ||
        (sCountry === 'singapore' && (cCity.includes('singapore') || cId.includes('singapore')));
    });

    if (countryMatches.length === 0) return null;

    // 🇯🇵 JAPAN 3-TIER ROUTING (Kanto Metro vs Kansai Hub vs Regional)
    if (sCountry === 'japan') {
      const kantoCities = ['tokyo', 'yokohama', 'kawasaki', 'chiba', 'saitama'];
      const kansaiCities = ['kobe', 'osaka', 'minoh', 'kyoto', 'hyogo'];
      if (kantoCities.some(c => sCity.includes(c))) {
        const kantoDoc = countryMatches.find((c: any) => normalize(c.id).includes('tokyo') || normalize(c.id).includes('kanto'));
        if (kantoDoc) return kantoDoc;
      }
      if (kansaiCities.some(c => sCity.includes(c))) {
        const kansaiDoc = countryMatches.find((c: any) => normalize(c.id).includes('kansai') || normalize(c.id).includes('kobe') || normalize(c.id).includes('osaka'));
        if (kansaiDoc) return kansaiDoc;
      }
    }

    // 🇨🇳 CHINA 3-TIER ROUTING (Tier 1 Megacity vs Tier 2 Major Regional vs Tier 3 Regional)
    if (sCountry === 'china') {
      const tier1Cities = ['shanghai', 'beijing'];
      const tier2Cities = ['shenzhen', 'guangzhou', 'suzhou', 'hangzhou', 'foshan', 'nanjing', 'wuxi'];
      if (tier1Cities.some(c => sCity.includes(c))) {
        const t1Doc = countryMatches.find((c: any) => normalize(c.id).includes(sCity) || normalize(c.id).includes('shanghai') || normalize(c.id).includes('beijing'));
        if (t1Doc) return t1Doc;
      }
      if (tier2Cities.some(c => sCity.includes(c))) {
        const t2Doc = countryMatches.find((c: any) => normalize(c.id).includes(sCity) || normalize(c.id).includes('shenzhen') || normalize(c.id).includes('guangzhou') || normalize(c.id).includes('suzhou'));
        if (t2Doc) return t2Doc;
      }
    }

    // 🇦🇪 UAE 3-TIER ROUTING (Tier 1 Dubai vs Tier 2 Abu Dhabi vs Tier 3 Northern Emirates & Al Ain)
    if (sCountry === 'united arab emirates' || sCountry === 'uae') {
      if (sCity.includes('dubai')) {
        const dubaiDoc = countryMatches.find((c: any) => normalize(c.id).includes('dubai'));
        if (dubaiDoc) return dubaiDoc;
      }
      if (sCity.includes('abudhabi') || sCity.includes('saadiyat') || sCity.includes('reem') || sCity.includes('mushrif') || sCity.includes('yas') || sCity.includes('khalifa')) {
        const adDoc = countryMatches.find((c: any) => normalize(c.id).includes('abudhabi') || normalize(c.id).includes('abu'));
        if (adDoc) return adDoc;
      }
      const northernCities = ['sharjah', 'ajman', 'rasalkhaimah', 'rak', 'fujairah', 'alain', 'ummalquwain'];
      if (northernCities.some(c => sCity.includes(c))) {
        const northDoc = countryMatches.find((c: any) => normalize(c.id).includes(sCity) || normalize(c.id).includes('sharjah') || normalize(c.id).includes('northern'));
        if (northDoc) return northDoc;
      }
    }

    // 🇪🇸 SPAIN 3-TIER ROUTING (Tier 1 Madrid/BCN vs Tier 2 Major Coastal/Regional vs Tier 3 Secondary Regional)
    if (sCountry === 'spain') {
      const tier1Cities = ['madrid', 'barcelona', 'castelldefels', 'santcugat', 'villaviciosa', 'pozuelo', 'alcobendas'];
      const tier2Cities = ['valencia', 'rocafort', 'bilbao', 'malaga', 'marbella', 'palma', 'sansebastian', 'donostia', 'mallorca'];
      if (tier1Cities.some(c => sCity.includes(c))) {
        const t1Doc = countryMatches.find((c: any) => normalize(c.id).includes(sCity) || normalize(c.id).includes('madrid') || normalize(c.id).includes('barcelona'));
        if (t1Doc) return t1Doc;
      }
      if (tier2Cities.some(c => sCity.includes(c))) {
        const t2Doc = countryMatches.find((c: any) => normalize(c.id).includes(sCity) || normalize(c.id).includes('valencia') || normalize(c.id).includes('marbella') || normalize(c.id).includes('bilbao'));
        if (t2Doc) return t2Doc;
      }
    }

    // 1. Exact city name or ID match
    const exactCity = countryMatches.find((c: any) => {
      const cCity = normalize(c.city || c.cityName || '');
      const cId = normalize(c.id);
      return (sCity && cCity && sCity === cCity) || (sCity && (cId === sCity || cId === sCity + sCountry || cId === sCity + '-' + sCountry || cId.startsWith(sCity + '-')));
    });
    if (exactCity) return exactCity;

    // 2. Primary city match (starts with sCity and not 'outside' / 'regional' unless sCity is outside)
    const primaryCity = countryMatches.find((c: any) => {
      const cCity = normalize(c.city || c.cityName || '');
      const cId = normalize(c.id);
      const isOutside = cId.includes('outside') || cCity.includes('outside') || cId.includes('regional') || cCity.includes('regional');
      return sCity && !isOutside && (cCity.startsWith(sCity) || cId.startsWith(sCity) || cId.startsWith(sCity + '-'));
    });
    if (primaryCity) return primaryCity;

    // 3. Substring city match (not outside/regional)
    const subCity = countryMatches.find((c: any) => {
      const cCity = normalize(c.city || c.cityName || '');
      const cId = normalize(c.id);
      const isOutside = cId.includes('outside') || cCity.includes('outside') || cId.includes('regional') || cCity.includes('regional');
      return sCity && !isOutside && (cCity.includes(sCity) || cId.includes(sCity));
    });
    if (subCity) return subCity;

    // 4. Regional / Outside match for secondary cities
    const regionalMatch = countryMatches.find((c: any) => {
      const cCity = normalize(c.city || c.cityName || '');
      const cId = normalize(c.id);
      return cId.includes('outside') || cCity.includes('outside') || cId.includes('regional') || cCity.includes('regional');
    });
    if (regionalMatch && sCity && !['tokyo', 'london', 'paris', 'beijing', 'shanghai', 'bangkok'].includes(sCity)) {
      return regionalMatch;
    }

    // 5. National country document
    const nationalDoc = countryMatches.find((c: any) => normalize(c.id) === sCountry);
    if (nationalDoc) return nationalDoc;

    return countryMatches[0];
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
    const salaryVal = getSchoolField(activeSchool, ['expectedSalary5Years', 'salary5YearsExp', 'startingSalary', 'salaryrange', 'monthlySalary', 'salary', 'netbase', 'netmonthlyusd', 'salaryrangeusd']);
    if (salaryVal) {
      const str = String(salaryVal).trim();
      const isUSD = str.includes("$") || str.toUpperCase().includes("USD") || activeSchool?.salaryCurrency === "USD" || Boolean(activeSchool?.startingSalaryUsd) || Boolean(activeSchool?.expectedSalaryNetUsd);

      const cleanRange = str
        .replace(/,/g, '')
        .replace(/\.\d+/g, '')
        .replace(/(\d+)\s*k\b/gi, '$1000');
      const range = cleanRange.match(/\d+/g);
      const validNums = range ? range.map(n => parseInt(n)).filter(n => !isNaN(n) && n > 0) : [];
      const min = validNums.length > 0 ? validNums[0] : 0;
      const max = validNums.length > 1 ? validNums[1] : min;
      let median = Math.round((min + max) / 2);

      const isExplicitMonthly = /month|monthly|\/mo/i.test(str);
      // Annual to Monthly Conversion: if median >= 10,000 in major currencies or >= 120,000 in local currencies, divide by 12 unless explicitly marked /mo
      const isHighValCurr = ['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD', 'SGD', 'NZD', 'AED', 'SAR', 'QAR', 'BHD', 'KWD', 'OMR', 'AZN'].includes(currency) || isUSD;
      const isAnnualVal = isHighValCurr ? median >= 10000 : median >= 120000;
      if (isAnnualVal && !isExplicitMonthly) {
        median = Math.round(median / 12);
      }

      // Convert from USD to local currency ONLY if original string was in USD and local currency is not USD
      let monthlyLocal = median;
      if (isUSD && currency !== "USD") {
        monthlyLocal = Math.round(usdToLocal(median));
      }

      setBenchmarkSalary(monthlyLocal.toString());
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

    // 🎯 STRICT FAMILY MAPPING PROTOCOL (OECD Equivalence Scaling)
    if (status === "Single") { personCount = 1; scalar = 1.0; pKey = "single"; }
    else if (status === "Couple") { personCount = 2; scalar = 1.6; pKey = "marriedDualIncome"; }
    else if (status === "Married (sole earner)" || status === "Married (dual income)") { personCount = 2; scalar = 1.6; pKey = "marriedDualIncome"; }
    else if (status === "Family +1") { personCount = 3; scalar = 2.0; pKey = "family1Child"; }
    else if (status === "Family +2") { personCount = 4; scalar = 2.4; pKey = "family2Children"; }
    else if (status === "Family +3") { personCount = 5; scalar = 2.8; pKey = "family3PlusChildren"; }

    const adults = (status === "Single") ? 1 : 2;
    const children = status === "Family +1" ? 1 : (status === "Family +2" ? 2 : (status === "Family +3" ? 3 : 0));

    const sCountry = canonicalCountry(String(getSchoolField(activeSchool, ['country', 'region']) || ''));
    const countryIntel = SALARY_INTEL[sCountry] || null;

    const rawNetInput = safeParse(settings.netSalary);
    const gbpRate = currentRates[currency] || 1.0;
    const rawNetInGBP = rawNetInput / gbpRate;
    // Normalized annual salary check: If salary converted to GBP equivalent is >= £18,000 net/yr, it's an annual salary input
    const isConvertedFromAnnual = rawNetInGBP >= 18000;
    const baseNet = isConvertedFromAnnual ? Math.round(rawNetInput / 12) : rawNetInput;

    const upliftFactor = (uplift13 ? 1 / 12 : 0) + (uplift14 ? 1 / 12 : 0);
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

    const housingStatusRaw = String(getSchoolField(activeSchool, ['housingprovision', 'housing', 'accommodation', 'housing_status']) || '');
    const isHousingProvidedByDefault = isHousingProvided(housingStatusRaw, activeSchool?.intel?.housing?.provided);

    // Extract subsidy percentage (e.g. 0.90 for 90% subsidy):
    let housingSubsidyRate: number = 0;
    const explicitSubsidy = safeParse(activeSchool?.housing_subsidy_rate ?? activeSchool?.housingSubsidyRate);
    if (explicitSubsidy > 0 && explicitSubsidy <= 1) {
      housingSubsidyRate = explicitSubsidy;
    } else if (/(\d+)\s*%/i.test(housingStatusRaw)) {
      const match = housingStatusRaw.match(/(\d+)\s*%/i);
      if (match) housingSubsidyRate = parseInt(match[1], 10) / 100;
    } else if (housingStatusRaw.toLowerCase().includes('subsid')) {
      housingSubsidyRate = 0.90;
    }

    const isSubsidized = housingSubsidyRate > 0 && housingSubsidyRate < 1;

    let isProvided = false;
    if (overrideBedrooms === 4) {
      isProvided = !isSubsidized;
    } else if (overrideBedrooms === null && isHousingProvidedByDefault) {
      isProvided = !isSubsidized;
    }

    const standardRentKey = (status === "Single") ? 'rent1br' : (status === "Couple" || status === "Family +1") ? 'rent2br' : 'rent3br';
    const activeRentKey = (overrideBedrooms !== null && overrideBedrooms !== 4) ? `rent${overrideBedrooms}br` : standardRentKey;

    // 🏠 PROPERTY ADVICE LOGIC
    const propertyLabels: Record<string, string> = {
      'rent0br': "Shared",
      'rent1br': "1-Bed Residence",
      'rent2br': "2-Bed Residence",
      'rent3br': "3-Bed Residence"
    };
    const isSubsidizedActive = (overrideBedrooms === 4 || (overrideBedrooms === null && isHousingProvidedByDefault) || overrideBedrooms === 1 || overrideBedrooms === 2 || overrideBedrooms === 3) && isSubsidized;
    const propertyLabel = isProvided
      ? "Provided"
      : isSubsidizedActive
      ? `Sub (${Math.round(housingSubsidyRate * 100)}%)`
      : (propertyLabels[activeRentKey] || "Standard Residence");

    const getF = (data: any, keys: string[]) => {
      const targetKeys = keys.map(k => k.toLowerCase().replace(/\s+/g, ''));
      const foundKey = Object.keys(data || {}).find(k => targetKeys.includes(k.toLowerCase().replace(/\s+/g, '')));
      return foundKey ? data[foundKey] : null;
    };

    const zoneWeights = getZoneLocationWeights(activeSchool || activeCOL?.city || activeCOL?.location);
    const rentMult = (lifestyleMode === "Saver" ? 0.75 : (lifestyleMode === "Full Expat" ? 1.4 : 1.0)) * zoneWeights.rentWeight;
    const groceryMult = lifestyleMode === "Saver" ? 0.8 : (lifestyleMode === "Full Expat" ? 1.25 : 1.0);
    const lifestyleMult = lifestyleMode === "Saver" ? 0.4 : (lifestyleMode === "Full Expat" ? 3.0 : 1.0);

    let baseRentUSD = 0;
    if (isProvided) {
      baseRentUSD = 0;
    } else if (overrideBedrooms === 0) {
      const rent3brVal = safeParse(getF(activeCOL, ['rent3br']) || getF(activeCOL, ['rent2br']) || getF(activeCOL, ['rent1br']) || 0);
      baseRentUSD = rent3brVal / 3;
    } else {
      baseRentUSD = safeParse(getF(activeCOL, [activeRentKey]) || getF(activeCOL, [standardRentKey]) || getF(activeCOL, ['rent1br']) || 0);
    }

    // Apply subsidy discount if subsidized and not in 100% free provided mode
    if (isSubsidized && !isProvided) {
      baseRentUSD = baseRentUSD * (1 - housingSubsidyRate);
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

    const transportPKeyMap: Record<string, string> = {
      "Single": "single",
      "Couple": "marriedDualIncome",
      "Married (sole earner)": "marriedDualIncome",
      "Married (dual income)": "marriedDualIncome",
      "Family +1": "family1Child",
      "Family +2": "family2Children",
      "Family +3": "family3PlusChildren"
    };
    const transportKey = transportPKeyMap[settings.familyStatus] || "single";

    const transitScalarMap: Record<string, number> = {
      "single": 1.0,
      "marriedDualIncome": 1.8,
      "family1Child": 2.1,
      "family2Children": 2.5,
      "family3PlusChildren": 2.9
    };

    let transportVal = 0;

    if (isCar) {
      // 🚗 CAR HIRE: Constant vehicle rate across all family status profiles
      if (typeof transportMap === 'object' && transportMap !== null) {
        transportVal = safeParse(transportMap.single || transportMap.base || Object.values(transportMap).find(v => typeof safeParse(v) === 'number' && safeParse(v) > 0) || 120);
      } else {
        transportVal = safeParse(transportMap) || 120;
      }
    } else {
      // 🚌 PUBLIC TRANSIT: Check if school reimburses 100% of daily commute pass
      const isTransitReimbursed = activeSchool?.commuteReimbursed === true ||
        String(activeSchool?.transportBenefit || '').toLowerCase().includes('reimburse') ||
        String(activeSchool?.transportBenefit || '').toLowerCase().includes('100%') ||
        String(activeSchool?.transport || '').toLowerCase().includes('reimburse');

      if (isTransitReimbursed) {
        transportVal = 0;
      } else if (sCountry === 'argentina') {
        const argSingleUsd = (130000 / (currentRates['ARS'] || 1200)) * (currentRates['USD'] || 1.27);
        transportVal = argSingleUsd * (transitScalarMap[transportKey] || 1.0);
      } else if (sCountry === 'vietnam') {
        const vnSingleUsd = (525000 / (currentRates['VND'] || 31614)) * (currentRates['USD'] || 1.27);
        transportVal = vnSingleUsd * (transitScalarMap[transportKey] || 1.0);
      } else if (typeof transportMap === 'object' && transportMap !== null) {
        if (transportMap[transportKey] !== undefined && safeParse(transportMap[transportKey]) > 0) {
          transportVal = safeParse(transportMap[transportKey]);
        } else {
          const baseSingle = safeParse(transportMap.single || transportMap.base || Object.values(transportMap).find(v => typeof safeParse(v) === 'number' && safeParse(v) > 0)) || 60;
          transportVal = baseSingle * (transitScalarMap[transportKey] || 1.0);
        }
      } else {
        const baseSingle = safeParse(transportMap) || 60;
        transportVal = baseSingle * (transitScalarMap[transportKey] || 1.0);
      }

      if (!isTransitReimbursed && (!transportVal || transportVal <= 0)) {
        transportVal = 60 * (transitScalarMap[transportKey] || 1.0);
      }
    }

    const transportCost = usdToLocal(transportVal);
    const rawSocialVal = getF(activeCOL, ['social', 'dining', 'diningsocial']);
    const socialVal = (rawSocialVal !== null && rawSocialVal !== undefined) ? rawSocialVal : 300;
    const socialCost = usdToLocal(getVal(socialVal, pKey, scalar) * lifestyleMult * zoneWeights.diningWeight);

    // Medical gaps cost
    const medicalVal = (safeParse(getF(activeCOL, ['uncoveredMedical', 'uncoveredmedical'])) || 50) * adults + (safeParse(getF(activeCOL, ['uncoveredMedical', 'uncoveredmedical'])) || 50) * 0.5 * children;
    const medicalCost = usdToLocal(medicalVal);

    const manualCost = safeParse(manualAdjustments);

    // Integer Sum Rounding: Calculate totalOut directly from the sum of already-rounded line item integers
    // so the displayed TOTAL OUTGOINGS always matches the exact sum of the numbers above it line-by-line.
    const rRent = isProvided ? 0 : Math.round(rentCost);
    const rGroceries = Math.round(groceriesCost);
    const rUtilities = Math.round(utilitiesCost);
    const rInternet = Math.round(internetCost);
    const rMobile = Math.round(mobileCost);
    const rTransport = Math.round(transportCost);
    const rSocial = Math.round(socialCost);
    const rMedical = Math.round(medicalCost);
    const rManual = Math.round(manualCost);

    const totalOut = rRent + rGroceries + rUtilities + rInternet + rMobile + rTransport + rSocial + rMedical + rManual;
    const surplus = totalIn - totalOut;
    const rateOfSaving = totalIn > 0 ? Math.round((surplus / totalIn) * 100) : 0;

    // Currency Benchmark Conversion
    const surplusBenchmark = (surplus / (currentRates[currency] || 1.0)) * (currentRates[benchmark] || 1.0);

    return {
      costs: { rent: rentCost, groceries: groceriesCost, utilities: utilitiesCost, connectivity: connectivityCost, internet: internetCost, mobile: mobileCost, transport: transportCost, social: socialCost, medical: medicalCost, manual: manualCost },
      propertyLabel, canDownsize, standardRentKey,
      totalIn, totalOut, surplus, surplusBenchmark, rateOfSaving,
      housingStatus: isProvided ? 'provided' : (isSubsidized ? 'subsidized' : 'custom'),
      housingSubsidyRate,
      isHousingProvidedByDefault,
      isConvertedFromAnnual, rawNetInput, baseNet,
      currency, reliability: activeCOL?.dataReliabilityScore,
      sCountry, activeSchool, countryIntel, uplift13, uplift14
    };
  }, [activeSchool, activeCOL, settings, responsibilityAllowance, manualAdjustments, extraIncome, currency, transportMode, benchmark, overrideBedrooms, currentRates, uplift13, uplift14, tIntel, lifestyleMode]);

  const surplusValStr = useMemo(() => {
    return Math.round(analysis?.surplus || 0).toLocaleString();
  }, [analysis?.surplus]);

  const surplusFontSizes = useMemo(() => {
    if (surplusValStr.length > 9) {
      return { number: "text-3xl", currency: "text-3xl", conversion: "text-xl" };
    }
    if (surplusValStr.length > 7) {
      return { number: "text-4xl", currency: "text-4xl", conversion: "text-2xl" };
    }
    return { number: "text-4xl", currency: "text-4xl", conversion: "text-2xl" };
  }, [surplusValStr]);

  const overallRatingNum = useMemo(() => {
    const raw = activeSchool?.totalscore ?? activeSchool?.score ?? activeSchool?.rating;
    const parsed = parseFloat(String(raw));
    if (!isNaN(parsed) && parsed > 0) return parsed;
    return 8.1;
  }, [activeSchool]);

  const subScores = useMemo(() => {
    const acad = parseFloat(String(activeSchool?.academicscore || activeSchool?.academic_rating || "8.5")) || 8.5;
    const fin = parseFloat(String(activeSchool?.financescore || activeSchool?.salaryScore || "8.2")) || 8.2;
    const wl = parseFloat(String(activeSchool?.worklifescore || activeSchool?.worklife || "7.8")) || 7.8;
    const lead = parseFloat(String(activeSchool?.techscore || activeSchool?.citySafety || activeSchool?.citysafety || "8.4")) || 8.4;
    return { academic: acad, finance: fin, worklife: wl, leadership: lead };
  }, [activeSchool]);

  const ratingTierConfig = useMemo(() => {
    const score = overallRatingNum;
    if (score >= 9.0) {
      return {
        tier: "Tier 1 Premier",
        desc: "World-class academic results, top-tier compensation & benefits, outstanding facilities.",
        textClass: "text-emerald-400"
      };
    }
    if (score >= 8.0) {
      return {
        tier: "Tier 1 / High Tier 2",
        desc: "Strong international reputation, high academic standards, competitive package.",
        textClass: "text-teal-400"
      };
    }
    if (score >= 7.0) {
      return {
        tier: "Tier 2 Standard",
        desc: "Solid international school framework, standard contract terms & benefits.",
        textClass: "text-amber-400"
      };
    }
    return {
      tier: "Tier 3 / Emerging",
      desc: "Basic international package, lower work/life balance rating, or operational challenges.",
      textClass: "text-rose-400"
    };
  }, [overallRatingNum]);

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
          <button onClick={() => {
            if (selectedOpportunity) {
              setLastSelectedOpportunity(selectedOpportunity);
              setSelectedOpportunity(null);
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.delete("jobId");
              newUrl.searchParams.delete("jobTitle");
              newUrl.searchParams.delete("department");
              newUrl.searchParams.delete("applyUrl");
              newUrl.searchParams.delete("closesDate");
              window.history.replaceState({}, "", newUrl.toString());
            } else {
              router.back();
            }
          }} className="flex items-center gap-1.5 text-[10px] font-black text-teal-400 uppercase tracking-[0.3em] mb-4 hover:text-white transition-colors cursor-pointer" title={selectedOpportunity ? "Return to school view" : "Go back"}><ArrowLeft className="size-3" /> Back</button>
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <p className="text-[11px] font-black text-[#d95f02] uppercase tracking-[0.4em] italic my-0">Search settings</p>
            <button
              onClick={() => setIsMobileFiltersOpen(prev => !prev)}
              className="lg:hidden flex items-center gap-1.5 text-[11px] font-black text-[#d95f02] uppercase tracking-wider bg-white/5 border border-white/10 px-2.5 py-1 rounded-sm cursor-pointer hover:bg-white/10 transition-colors"
            >
              <Sliders className="size-3 text-[#d95f02]" />
              <span>{isMobileFiltersOpen ? "Hide Filters" : "Filter Options"}</span>
              <ChevronDown className={cn("size-3 transition-transform duration-200", isMobileFiltersOpen && "rotate-180")} />
            </button>
          </div>

          <div className={cn("space-y-4", !isMobileFiltersOpen && "hidden lg:block")}>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed mb-2">Target country</label>
              <Select value={canonicalCountry(settings.country)} onValueChange={handleCountrySelect}>
                <SelectTrigger className="bg-black/40 border-white/10 h-10 text-xs font-bold uppercase text-left [&>span]:text-left [&>span]:flex-1 [&>span]:text-start"><SelectValue placeholder="Country">{formatCountry(canonicalCountry(settings.country))}</SelectValue></SelectTrigger>
                <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold uppercase text-xs">
                  {allSchools?.map((s: any) => canonicalCountry(s.country)).filter((v: any, i: any, a: any) => v && a.indexOf(v) === i).sort().map((c: any) => <SelectItem key={c} value={c} className="pl-3 pr-8 text-left [&>span:first-child]:left-auto [&>span:first-child]:right-2">{formatCountry(c)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed mb-2">Select school</label>
              <Select disabled={!settings.country} value={settings.schoolId} onValueChange={handleSchoolSelect}>
                <SelectTrigger className="bg-black/40 border-white/10 h-10 text-xs font-bold uppercase text-left [&>span]:text-left [&>span]:flex-1 [&>span]:text-start"><SelectValue placeholder="School" /></SelectTrigger>
                <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold uppercase text-xs">
                  {allSchools?.filter((s: any) => canonicalCountry(s.country) === canonicalCountry(settings.country))
                    .filter((s: any) => !s.isCampusStub)
                    .filter((s: any, idx: number, arr: any[]) => {
                      const cleanName = (s.schoolname || s.name || '').toLowerCase().trim();
                      return arr.findIndex((item: any) => (item.schoolname || item.name || '').toLowerCase().trim() === cleanName) === idx;
                    })
                    .sort((a: any, b: any) => (a.schoolname || a.name || '').localeCompare(b.schoolname || b.name || ''))
                    .map((s: any) => <SelectItem key={s.id || s.schoolname} value={s.id} className="pl-3 pr-8 text-left [&>span:first-child]:left-auto [&>span:first-child]:right-2">{s.schoolname || s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed mb-2">Family status</label>
              <Select value={settings.familyStatus} onValueChange={(v) => setSettings({ ...settings, familyStatus: v })}>
                <SelectTrigger className="bg-black/40 border-white/10 h-10 text-xs font-bold uppercase text-left [&>span]:text-left [&>span]:flex-1 [&>span]:text-start"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold uppercase text-xs">
                  <SelectItem value="Single" className="pl-3 pr-8 text-left [&>span:first-child]:left-auto [&>span:first-child]:right-2">Single</SelectItem>
                  <SelectItem value="Couple" className="pl-3 pr-8 text-left [&>span:first-child]:left-auto [&>span:first-child]:right-2">Couple</SelectItem>
                  <SelectItem value="Family +1" className="pl-3 pr-8 text-left [&>span:first-child]:left-auto [&>span:first-child]:right-2">Family +1</SelectItem>
                  <SelectItem value="Family +2" className="pl-3 pr-8 text-left [&>span:first-child]:left-auto [&>span:first-child]:right-2">Family +2</SelectItem>
                  <SelectItem value="Family +3" className="pl-3 pr-8 text-left [&>span:first-child]:left-auto [&>span:first-child]:right-2">Family +3</SelectItem>
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
                    Stress test your savings. Switch between Saver (modest digs & supermarket basics), Comfort (comfy flat & Friday pub pints), or Full Expat (swanky pad & dining out).
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex bg-black/40 p-0.5 rounded-sm border border-white/10 w-full justify-between">
                {(['Saver', 'Comfort', 'Full Expat'] as const).map((mode) => {
                  const tooltips: Record<string, string> = {
                    Saver: "Saver Mode (-25% Rent, -20% Groceries, -60% Social): Modest apartment slightly further out, local hypermarket shopping, and cooking at home.",
                    Comfort: "Comfort Mode (Baseline): Standard expat residence, average supermarket shopping, and regular dining out.",
                    "Full Expat": "Full Expat Mode (+40% Rent, +25% Groceries, +200% Social): High-end compound/waterfront pad, imported brand groceries, and weekend hotel dining & leisure."
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
                <div className="flex items-center justify-between gap-1 mb-2">
                  <div className="flex items-center gap-1.5">
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
                  {benchmarkSalary && benchmarkSalary !== "0" && settings.netSalary !== benchmarkSalary && (
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, netSalary: benchmarkSalary }))}
                      className="text-[8.5px] font-bold text-amber-400 hover:text-amber-300 underline tracking-wider uppercase transition-colors shrink-0"
                      title="Reset to 5-Year Benchmark"
                    >
                      Reset to Benchmark
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input type="number" value={settings.netSalary} onChange={(e) => setSettings({ ...settings, netSalary: e.target.value })} className={cn("bg-black/40 border-white/10 h-10 font-black text-sm pr-28", noSpinners)} />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    {benchmarkSalary && benchmarkSalary !== "0" && settings.netSalary !== benchmarkSalary ? (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Your Offer
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/40">
                        5-Yr Benchmark
                      </span>
                    )}
                  </div>
                </div>
                {analysis?.isConvertedFromAnnual && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 p-2 rounded-sm leading-snug">
                    <span>💡 Annual salary detected ({parseFloat(settings.netSalary).toLocaleString()} {currency}/yr) — converted to monthly net base of {currency} {analysis.baseNet.toLocaleString()}/mo.</span>
                  </div>
                )}
              </div>
              {settings.familyStatus !== "Single" && settings.familyStatus !== "Married (sole earner)" && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-relaxed mb-2">Partner net salary ({currency})</label>
                  <Input id="partner-salary-input" type="number" value={settings.partnerSalary} onChange={(e) => setSettings({ ...settings, partnerSalary: e.target.value })} className={cn("bg-black/40 border-white/10 h-10 font-black text-sm", noSpinners)} />
                </div>
              )}
            </div>

            <button
              onClick={() => router.push(`/decide?ids=${activeSchool?.id}`)}
              disabled={!activeSchool}
              className="hidden lg:block w-full bg-zinc-950/60 backdrop-blur-xl border border-[#d95f02] text-white font-bold rounded-none h-10 transition-all hover:bg-[#d95f02] hover:text-white shadow-[0_0_15px_rgba(249,115,22,0.15)] text-xs tracking-wider mt-2 disabled:opacity-50"
            >
              Compare Schools
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

                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-full text-[11px] font-sans font-bold text-slate-300">
                    <span className="size-2 rounded-full bg-[#38BDF8] animate-pulse" />
                    <span>{targetSchoolName || "Retrieving Target School..."}</span>
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
                        <h4 className="text-[14px] font-semibold text-white">Compare Schools</h4>
                        <p className="text-[12px] text-[#CBD5E1] mt-1 leading-normal">Click to view your projected savings and lifestyle match.</p>
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            )
          ) : isGuestOverLimit ? (
            <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-6">
              <div className="size-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-400">
                <Lock className="size-8" />
              </div>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-black uppercase tracking-widest">
                  🔒 3 FREE EVALUATIONS COMPLETED
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tight text-white italic">
                  Guest Limit Reached
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  You have explored your 3 complimentary school evaluations in Guest Mode. Register for your free verified educator account to unlock 25 evaluations daily, salary indexes, and contract audits.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 py-3.5 px-8 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white font-black uppercase text-xs tracking-wider rounded-sm shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Zap className="size-4" />
                  Claim 25 Free Evaluations & Unlock →
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center py-3.5 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold uppercase text-xs rounded-sm transition-all"
                >
                  Log In
                </Link>
              </div>
            </div>
          ) : isOverLimit ? (
            <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-6">
              <div className="size-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-400">
                <Lock className="size-8" />
              </div>
              <div className="space-y-2">
                <h4 className="text-2xl font-black uppercase italic tracking-tight text-white">
                  🔒 Daily Quota Reached ({allowance}/{allowance} Used)
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your daily evaluations refresh automatically at midnight local time (<strong>in {timeUntilReset || 'a few hours'}</strong>). Need to evaluate offers right now?
                </p>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/10 rounded-sm max-w-md mx-auto text-left space-y-1">
                <div className="flex items-center gap-1.5 text-[#d95f02] text-xs font-bold uppercase tracking-wider">
                  <Zap className="size-3.5" />
                  ⚡ Instant AI Recruitment Uplift
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Tell our AI desk your hiring research scenario for an instant <strong>+20 evaluation bonus</strong> with rollover protection.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto pt-2">
                <button
                  type="button"
                  onClick={handleOpenDataLock}
                  className="flex-1 py-3.5 px-4 bg-gradient-to-r from-primary via-orange-600 to-amber-600 text-white font-black uppercase text-xs tracking-wider rounded-sm shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  ⚡ Request AI Uplift (+20 Credits)
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-4 animate-in fade-in duration-500">
              {/* Guest Evaluation Counter Banner */}
              {!user && guestViewCount > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-sm text-xs text-amber-200">
                  <div className="flex items-center gap-2">
                    <Lock className="size-3.5 text-amber-400 shrink-0" />
                    <span>
                      <strong>Guest Evaluation:</strong> {guestViewCount} of 3 free school evaluations used.
                    </span>
                  </div>
                  <Link 
                    href="/signup" 
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline uppercase tracking-wider shrink-0"
                  >
                    Claim 25 Evaluations/Day Free →
                  </Link>
                </div>
              )}

              {/* 🎯 Replicated Evaluating Opportunity Card at Top of Page */}
              {selectedOpportunity && (
                <div className="relative group bg-gradient-to-br from-[#0b1224] via-[#0f172a] to-[#0b1224] border-x-2 border-y-0 border-[#FF6B35]/50 p-5 md:p-6 shadow-[0_0_25px_rgba(255,107,53,0.15)] rounded-sm animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-3">
                    <div className="space-y-1.5">
                      <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                        {translateJobTitleToEnglish(selectedOpportunity.jobTitle || '')}
                      </h1>

                      <div className="hidden sm:flex flex-wrap items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <span className="text-sm font-semibold text-[#38BDF8] tracking-tight flex items-center gap-1">
                          <Building className="size-3.5" /> {getSchoolField(activeSchool, ['schoolname', 'name', 'school'])}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5" /> {formatLocation(getSchoolField(activeSchool, ['city', 'town', 'location']), getSchoolField(activeSchool, ['country', 'region']))}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      {selectedOpportunity && (() => {
                        const rawSources = selectedOpportunity.sources && selectedOpportunity.sources.length > 0
                          ? selectedOpportunity.sources
                          : [selectedOpportunity.source || "Direct"];
                        const applyUrlLower = String(selectedOpportunity.applyUrl || "").toLowerCase();
                        const sMap = new Map<string, string>();

                        const isTaaleemSchoolJob = isTaaleemSchool(activeSchool?.id || (selectedOpportunity as any).schoolId, activeSchool?.schoolname || activeSchool?.name || (selectedOpportunity as any).schoolName, (activeSchool as any)?.ownership || (activeSchool as any)?.group || (selectedOpportunity as any).schoolGroup) ||
                          String((activeSchool as any)?.ownership || (activeSchool as any)?.group || (selectedOpportunity as any).schoolGroup || "").toUpperCase().includes("TAALEEM") ||
                          String(selectedOpportunity.source || "").toUpperCase().includes("TAALEEM") ||
                          rawSources.some((s: any) => String(s || "").toUpperCase().includes("TAALEEM")) ||
                          applyUrlLower.includes("taaleem.ae") ||
                          Boolean(selectedOpportunity.sourceUrls && (selectedOpportunity.sourceUrls["TAALEEM"] || selectedOpportunity.sourceUrls["Taaleem"]));

                        // Detect URL domain signatures to ensure engine pills are accurately assigned
                        if (applyUrlLower.includes("tes.com") || (selectedOpportunity.sourceUrls && (selectedOpportunity.sourceUrls["TES"] || selectedOpportunity.sourceUrls["tes"])) || rawSources.some((s: any) => String(s || "").toUpperCase() === "TES")) {
                          sMap.set("TES", "TES");
                        }
                        if (applyUrlLower.includes("careers.nordangliaeducation.com") || applyUrlLower.includes("nordangliaeducation.com")) {
                          sMap.set("NORD ANGLIA", "Nord Anglia");
                        }
                        if (applyUrlLower.includes("cognitapeople") || applyUrlLower.includes("cognita")) {
                          sMap.set("COGNITA", "Cognita");
                        }
                        if (applyUrlLower.includes("inspirededu")) {
                          sMap.set("INSPIRED", "Inspired");
                        }
                        if (applyUrlLower.includes("globeducate")) {
                          sMap.set("GLOBEDUCATE", "Globeducate");
                        }
                        if (applyUrlLower.includes("grcfair.org")) {
                          sMap.set("GRC", "GRC");
                        }
                        if (applyUrlLower.includes("teachaway")) {
                          sMap.set("TEACH AWAY", "Teach Away");
                        }
                        if (applyUrlLower.includes("gemseducation") || applyUrlLower.includes("gems.ae")) {
                          sMap.set("GEMS", "GEMS");
                        }
                        if (applyUrlLower.includes("theguardian.com") || applyUrlLower.includes("guardianjobs")) {
                          sMap.set("GUARDIAN", "Guardian Jobs");
                        }
                        if (isTaaleemSchoolJob) {
                          sMap.set("TAALEEM", "Taaleem");
                        }

                        rawSources.forEach((s: any) => {
                          if (!s) return;
                          const u = String(s).toUpperCase().trim();
                          let key = u;
                          let label = s;
                          if (u === "GLOBE" || u === "GLOBEDUCATE") { key = "GLOBEDUCATE"; label = "Globeducate"; }
                          else if (u.includes("COGNITA")) { key = "COGNITA"; label = "Cognita"; }
                          else if (u.includes("INSPIRED")) { key = "INSPIRED"; label = "Inspired"; }
                          else if (u.includes("MALVERN")) { key = "MALVERN"; label = "Malvern"; }
                          else if (u.includes("UWC") || u.includes("UNITED WORLD COLLEGE")) { key = "UWC"; label = "UWC"; }
                          else if (u.includes("ISP") || u.includes("INTERNATIONAL SCHOOLS PARTNERSHIP")) { key = "ISP"; label = "ISP"; }
                          else if (u === "TES") { key = "TES"; label = "TES"; }
                          else if (u.includes("NORD ANGLIA")) { key = "NORD ANGLIA"; label = "Nord Anglia"; }
                          else if (u.includes("GEMS")) { key = "GEMS"; label = "GEMS"; }
                          else if (u.includes("GUARDIAN")) { key = "GUARDIAN"; label = "Guardian Jobs"; }
                          else if (u.includes("TAALEEM")) { key = "TAALEEM"; label = "Taaleem"; }
                          else if (u.includes("GRC")) { key = "GRC"; label = "GRC"; }
                          else if (u.includes("TEACH AWAY")) { key = "TEACH AWAY"; label = "Teach Away"; }
                          else if (u.includes("OFFICIAL") || u.includes("WEBSITE") || u.includes("DIRECT") || u.includes("SCHOOL")) { key = "DIRECT"; label = "Direct"; }
                          else { key = "DIRECT"; label = "Direct"; }
                          sMap.set(key, label);
                        });

                        // Only add DIRECT if it is genuinely a direct school listing or dual-listed with a direct website
                        const isPureAggregator = applyUrlLower.includes("tes.com") || applyUrlLower.includes("theguardian.com") || applyUrlLower.includes("guardianjobs") || applyUrlLower.includes("grcfair.org") || applyUrlLower.includes("teachaway");
                        if (isPureAggregator && !rawSources.some(s => String(s).toUpperCase().includes("DIRECT") || String(s).toUpperCase().includes("OFFICIAL"))) {
                          sMap.delete("DIRECT");
                        }
                        if (sMap.has("GEMS") || applyUrlLower.includes("gemseducation") || applyUrlLower.includes("gems.ae") || rawSources.some((s: any) => String(s || "").toUpperCase().includes("GEMS"))) {
                          sMap.delete("DIRECT");
                        }
                        if (isTaaleemSchoolJob) {
                          sMap.delete("DIRECT");
                        }

                        // If no specific source was resolved, default to Direct
                        if (sMap.size === 0) {
                          sMap.set("DIRECT", "Direct");
                        }

                        const sortedEntries = Array.from(sMap.entries()).sort(([a], [b]) => {
                          if (a === "DIRECT") return -1;
                          if (b === "DIRECT") return 1;
                          return 0;
                        });

                        // Deduplicate display sources & prevent identical fallback URLs
                        const resolvedPills: { label: string; url: string; key: string }[] = [];
                        const seenPillUrls = new Set<string>();
                        const normalizeUrl = (urlStr: string) => urlStr.toLowerCase().replace(/\/+$/, '').trim();

                        sortedEntries.forEach(([key, label]) => {
                          const srcUpper = key;
                          const srcUrl = (() => {
                            let foundUrl: string | undefined = undefined;
                            if (selectedOpportunity.sourceUrls) {
                              if (selectedOpportunity.sourceUrls[label]) foundUrl = selectedOpportunity.sourceUrls[label];
                              else if (selectedOpportunity.sourceUrls[srcUpper]) foundUrl = selectedOpportunity.sourceUrls[srcUpper];
                              else if (selectedOpportunity.sourceUrls[label.toLowerCase()]) foundUrl = selectedOpportunity.sourceUrls[label.toLowerCase()];
                              else {
                                for (const [k, v] of Object.entries(selectedOpportunity.sourceUrls)) {
                                  if (k.toUpperCase().trim() === srcUpper && v && v !== "#") {
                                    foundUrl = v as string;
                                    break;
                                  }
                                }
                              }
                            }
                            if (foundUrl) {
                              const fUrl = String(foundUrl);
                              if (srcUpper === "TES" && !fUrl.includes("tes.com")) foundUrl = undefined;
                              if (srcUpper === "GUARDIAN" && (!fUrl.includes("theguardian.com") && !fUrl.includes("guardianjobs"))) foundUrl = undefined;
                              if (srcUpper === "DIRECT" && (fUrl.includes("tes.com") || fUrl.includes("grcfair.org") || fUrl.includes("theguardian.com"))) foundUrl = undefined;
                            }
                            if (!foundUrl && activeVacancies && activeVacancies.length > 0) {
                              const matchedJob = activeVacancies.find((j: any) =>
                                (selectedOpportunity.jobId && String(j.id) === String(selectedOpportunity.jobId)) ||
                                (j.title && selectedOpportunity.jobTitle && j.title.toLowerCase() === selectedOpportunity.jobTitle.toLowerCase())
                              );
                              if (matchedJob && matchedJob.sourceUrls) {
                                for (const [k, v] of Object.entries(matchedJob.sourceUrls)) {
                                  if (k.toUpperCase().trim() === srcUpper && v) {
                                    const candidate = String(v);
                                    if (srcUpper === "TES" && !candidate.includes("tes.com")) continue;
                                    if (srcUpper === "GUARDIAN" && (!candidate.includes("theguardian.com") && !candidate.includes("guardianjobs"))) continue;
                                    foundUrl = candidate;
                                    break;
                                  }
                                }
                              }
                            }
                            if (!foundUrl) {
                              const rawUrl = selectedOpportunity.applyUrl;
                              if (srcUpper.includes("NORD ANGLIA") && (applyUrlLower.includes("nordanglia") || activeSchool?.careersPageUrl?.includes("nordanglia"))) {
                                foundUrl = rawUrl || activeSchool?.careersPageUrl || "https://careers.nordangliaeducation.com";
                              } else if (srcUpper.includes("COGNITA")) {
                                foundUrl = rawUrl || activeSchool?.careersPageUrl || "https://www.cognita.com/careers/";
                              } else if (srcUpper.includes("INSPIRED")) {
                                foundUrl = rawUrl || activeSchool?.careersPageUrl || "https://inspirededu.com/careers";
                              } else if ((srcUpper.includes("GLOBE") || srcUpper.includes("GLOBEDUCATE")) && (applyUrlLower.includes("globeducate") || activeSchool?.careersPageUrl?.includes("globeducate"))) {
                                foundUrl = rawUrl || activeSchool?.careersPageUrl || "https://careers.globeducate.com";
                              } else if (srcUpper.includes("ISP") && (applyUrlLower.includes("internationalschools") || activeSchool?.careersPageUrl?.includes("internationalschools"))) {
                                foundUrl = rawUrl || activeSchool?.careersPageUrl || "https://internationalschools.wd3.myworkdayjobs.com/en-us/ispcareers";
                              } else if (srcUpper === "TES" && applyUrlLower.includes("tes.com")) {
                                foundUrl = rawUrl;
                              } else if (srcUpper === "GUARDIAN" && (applyUrlLower.includes("theguardian.com") || applyUrlLower.includes("guardianjobs"))) {
                                foundUrl = rawUrl;
                              } else if (srcUpper === "GRC" && applyUrlLower.includes("grcfair.org")) {
                                foundUrl = rawUrl;
                              } else if (srcUpper.includes("TEACH AWAY") && applyUrlLower.includes("teachaway")) {
                                foundUrl = rawUrl;
                              } else if ((srcUpper === "GEMS" || srcUpper.includes("GEMS")) && (applyUrlLower.includes("gemseducation") || applyUrlLower.includes("gems.ae") || rawSources.some((s: any) => String(s || "").toUpperCase().includes("GEMS")))) {
                                foundUrl = rawUrl || "https://careers.gemseducation.com";
                              } else if (srcUpper.includes("TAALEEM")) {
                                if (selectedOpportunity.applyUrl && selectedOpportunity.applyUrl.includes("taaleem.ae") && !selectedOpportunity.applyUrl.endsWith("/careers") && selectedOpportunity.applyUrl !== "https://careers.taaleem.ae/") {
                                  foundUrl = selectedOpportunity.applyUrl;
                                } else {
                                  foundUrl = resolveTaaleemDirectUrl(selectedOpportunity.jobTitle || "", activeSchool?.name || activeSchool?.schoolname || (selectedOpportunity as any).schoolName || "").canonicalUrl;
                                }
                              } else if (srcUpper === "DIRECT") {
                                foundUrl = activeSchool?.careersPageUrl || activeSchool?.website || activeSchool?.schooljp || rawUrl;
                              }
                            }

                            // Secondary aggregator/agency sources MUST have a valid dedicated engine URL, otherwise do not fall back to generic school URL
                            if (srcUpper !== "DIRECT" && !foundUrl) {
                              return "#";
                            }

                            if (!foundUrl || foundUrl === "#") {
                              foundUrl = selectedOpportunity.applyUrl || activeSchool?.careersPageUrl || activeSchool?.website || "#";
                            }
                            return foundUrl || "#";
                          })();

                          if (srcUrl === "#") return;

                          const norm = normalizeUrl(srcUrl);
                          // Suppress duplicate URLs for secondary non-direct sources if they match any already rendered pill URL
                          if (seenPillUrls.has(norm)) return;
                          seenPillUrls.add(norm);

                          resolvedPills.push({ label: label === "Official Website" ? "Direct" : label, url: srcUrl, key: srcUpper });
                        });

                        return resolvedPills.map(({ label, url, key }) => {
                          const srcUpper = key;
                          return (
                            <a
                              key={label}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-sm border transition-all cursor-pointer shadow-sm hover:scale-105",
                                srcUpper.includes("INSPIRED")
                                  ? "bg-sky-500/20 border-sky-500/40 text-sky-300 hover:bg-sky-500/30"
                                  : srcUpper === "TES"
                                    ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30"
                                    : srcUpper.includes("COGNITA")
                                      ? "bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30"
                                      : srcUpper.includes("MALVERN")
                                        ? "bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30"
                                        : srcUpper.includes("UWC")
                                          ? "bg-violet-500/20 border-violet-500/40 text-violet-300 hover:bg-violet-500/30"
                                          : srcUpper.includes("ISP")
                                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
                                            : (srcUpper.includes("GLOBE") || srcUpper.includes("GLOBEDUCATE"))
                                              ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30"
                                              : (srcUpper === "NORD ANGLIA" || srcUpper.includes("NORD ANGLIA"))
                                                ? "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
                                                : srcUpper.includes("TAALEEM")
                                                  ? "bg-teal-500/20 border-teal-500/40 text-teal-300 hover:bg-teal-500/30"
                                                  : srcUpper === "GUARDIAN"
                                                  ? "bg-sky-500/20 border-sky-500/40 text-sky-300 hover:bg-sky-500/30"
                                                  : (srcUpper === "GEMS" || srcUpper.includes("GEMS"))
                                                    ? "bg-orange-500/20 border-orange-500/40 text-orange-300 hover:bg-orange-500/30"
                                                    : srcUpper === "GRC"
                                                      ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30"
                                                      : "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
                              )}
                            >
                              {label}
                              <ArrowUpRight className="size-3.5" />
                            </a>
                          );
                        });
                      })()}
                      <button
                        onClick={() => {
                          setSelectedOpportunity(null);
                          const newUrl = new URL(window.location.href);
                          newUrl.searchParams.delete('jobId');
                          newUrl.searchParams.delete('jobTitle');
                          newUrl.searchParams.delete('department');
                          newUrl.searchParams.delete('applyUrl');
                          newUrl.searchParams.delete('closesDate');
                          window.history.replaceState({}, '', newUrl.toString());
                        }}
                        className="inline-flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white px-3 py-2.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer"
                        title="Return to school view with all vacancies"
                      >
                        <ArrowLeft className="size-3.5" /> All Vacancies
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="bg-[#0b1224] border border-white/5 p-5 md:p-6 shadow-2xl relative rounded-sm">

                {/* 💼 TOP ACTIVE VACANCIES SUMMARY ROW (ONLY SHOWN WHEN NOT EVALUATING A SPECIFIC OPPORTUNITY) */}
                {(!selectedOpportunity || !selectedOpportunity.jobTitle) && (
                  <>
                    {/* Mobile Only: Back to Featured Jobs Button */}
                    <div className="block lg:hidden mb-4">
                      <button
                        onClick={() => router.push(`/featured-jobs?search=${encodeURIComponent(getSchoolField(activeSchool, ['schoolname', 'name', 'school']) || '')}`)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900/90 border border-amber-500/30 hover:border-[#FF6B35] text-slate-200 hover:text-white font-extrabold text-xs uppercase tracking-wider rounded-md transition-all shadow-md cursor-pointer"
                      >
                        <ArrowLeft className="size-3.5 text-[#FF6B35]" />
                        Back to Featured Jobs
                      </button>
                    </div>

                    {/* Desktop Only: Full Vacancies Grid */}
                    <div className="hidden lg:block mb-5 p-3.5 md:p-4 bg-slate-900/90 border border-amber-500/20 rounded-md shadow-md">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
                        {lastSelectedOpportunity && (
                          <div className="w-full flex justify-end pb-1 border-b border-white/5 mb-1">
                            <button
                              onClick={() => setSelectedOpportunity(lastSelectedOpportunity)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6B35]/15 hover:bg-[#FF6B35]/25 border border-[#FF6B35]/40 text-[#FF6B35] text-xs font-bold rounded-sm transition-all cursor-pointer shadow-sm animate-in fade-in"
                              title={"Return to evaluating " + lastSelectedOpportunity.jobTitle}
                            >
                              <ArrowRight className="size-3.5 text-[#FF6B35]" />
                              <span className="text-[11px] font-bold uppercase tracking-wider">Return to {translateJobTitleToEnglish(lastSelectedOpportunity.jobTitle)} Evaluation</span>
                            </button>
                          </div>
                        )}
                        <div className="flex items-center gap-2.5">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className={cn(
                              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                              activeVacancies.length > 0 ? "bg-emerald-400" : "bg-slate-500"
                            )}></span>
                            <span className={cn(
                              "relative inline-flex rounded-full h-2.5 w-2.5",
                              activeVacancies.length > 0 ? "bg-emerald-500" : "bg-slate-600"
                            )}></span>
                          </span>
                          <h3 className="text-xs font-black uppercase tracking-widest text-slate-200 flex items-center gap-2">
                            <Briefcase className="size-3.5 text-[#FF6B35]" />
                            Current Open Vacancies
                            <span className={cn(
                              "px-2 py-0.5 text-[10px] font-mono rounded-full font-bold ml-1",
                              activeVacancies.length > 0 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-white/5 text-slate-400 border border-white/10"
                            )}>
                              {activeVacancies.length}
                            </span>
                          </h3>
                        </div>

                        <button
                          onClick={() => router.push(`/featured-jobs?search=${encodeURIComponent(getSchoolField(activeSchool, ['schoolname', 'name', 'school']) || '')}`)}
                          className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-[#FF6B35] transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          Browse All Vacancies <ArrowUpRight className="size-3" />
                        </button>
                      </div>

                      {activeVacancies.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 pt-0.5">
                          {activeVacancies.map((job: any, idx: number) => {
                            const isSelected = selectedOpportunity?.jobTitle?.toLowerCase() === job.title.toLowerCase() ||
                              (selectedOpportunity?.jobId && String(selectedOpportunity.jobId) === String(job.id));

                            const titleClean = sanitizeJobTitle(job.title);
                            const { text: closingText, dotClass } = formatVacancyClosingDate(job.closesDate);

                            const handleSelectJob = () => {
                              setSelectedOpportunity({
                                jobId: job.id,
                                jobTitle: titleClean,
                                department: job.department,
                                curriculum: job.curriculum,
                                applyUrl: job.applyUrl || job.source_url || activeSchool?.careersPageUrl || activeSchool?.website,
                                closesDate: job.closesDate,
                                savingsPotential: job.savingsPotential,
                                schoolRating: job.schoolRating,
                                source: job.source,
                                sources: job.sources && job.sources.length > 0 ? job.sources : [job.source || "Official Website"],
                                sourceUrls: job.sourceUrls || {},
                                city: job.city,
                                country: job.country
                              });

                              // Update URL without full page refresh
                              const newUrl = new URL(window.location.href);
                              newUrl.searchParams.set('schoolId', activeSchool.id);
                              if (job.id) newUrl.searchParams.set('jobId', String(job.id));
                              newUrl.searchParams.set('jobTitle', titleClean);
                              if (job.department) newUrl.searchParams.set('department', job.department);
                              if (job.applyUrl) newUrl.searchParams.set('applyUrl', job.applyUrl);
                              if (job.closesDate) newUrl.searchParams.set('closesDate', job.closesDate);
                              window.history.replaceState({}, '', newUrl.toString());
                            };

                            return (
                              <button
                                key={job.id || idx}
                                onClick={handleSelectJob}
                                title={`${titleClean} (${job.closesDate || 'Rolling'})`}
                                className={cn(
                                  "group w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-xs font-bold transition-all border text-left cursor-pointer",
                                  isSelected
                                    ? "bg-[#FF6B35]/20 text-white border-[#FF6B35] shadow-[0_0_12px_rgba(255,107,53,0.3)] ring-1 ring-[#FF6B35]"
                                    : "bg-white/5 hover:bg-slate-800/80 hover:border-emerald-500/40 text-slate-200 hover:text-white border-white/10"
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className={cn("size-2 rounded-full shrink-0 shadow-sm", dotClass)} />
                                  <span className="text-[11px] sm:text-xs font-bold leading-snug truncate">
                                    {titleClean}
                                  </span>
                                  <span className="text-[10px] text-slate-400 group-hover:text-slate-300 font-mono shrink-0 whitespace-nowrap">
                                    {closingText}
                                  </span>
                                </div>
                                <ArrowUpRight className={cn(
                                  "size-3.5 shrink-0 transition-all",
                                  isSelected
                                    ? "text-[#FF6B35]"
                                    : "text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                                )} />
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-slate-400 py-1 font-medium italic">
                          <Info className="size-3.5 text-slate-500 shrink-0" />
                          <span>No active vacancies currently listed for this campus.</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div id="section-financials" className="scroll-mt-28 flex justify-between items-start border-b border-white/5 pb-3">
                  <div className="space-y-2">
                    <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none italic">
                      {getSchoolField(activeSchool, ['schoolname', 'name', 'school'])}
                      <span className="text-slate-700 text-lg ml-3 not-italic">#{activeSchool.id}</span>
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-sm border border-white/10">
                        {formatLocation(getSchoolField(activeSchool, ['city', 'town', 'location']), getSchoolField(activeSchool, ['country', 'region']))}
                      </span>
                      <div className="flex gap-2">
                        {(() => {
                          const surplusUSD = (analysis?.surplus ?? 0) / (currentRates[currency] || 1.0);
                          const badge = getSavingsBadgeConfig(surplusUSD);
                          return (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    "cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-sm transition-all duration-200 shrink-0 group select-none hover:scale-105",
                                    badge.boxStyle
                                  )}
                                >
                                  <span>{badge.label}</span>
                                  <Info className="size-3 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent side="top" align="center" className="bg-[#0b1224] border border-white/10 text-white text-[11px] font-medium p-3 max-w-xs shadow-2xl z-50 leading-relaxed">
                                <p className="font-black text-[#d95f02] uppercase text-[10px] tracking-wider mb-1">{badge.label}</p>
                                <p className="text-slate-300 text-xs leading-relaxed">{badge.description}</p>
                              </PopoverContent>
                            </Popover>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-right cursor-help group select-none">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-relaxed group-hover:text-slate-200 transition-colors">Overall Rating</p>
                          <p className={cn("text-2xl font-black italic leading-tight transition-colors", ratingTierConfig.textClass)}>
                            {overallRatingNum.toFixed(1)}<span className="text-xs text-slate-600 not-italic ml-0.5">/10</span>
                          </p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="w-64 bg-[#0b1224]/95 backdrop-blur-md border border-white/15 text-white p-3 shadow-2xl rounded-lg z-50">
                        <div className="space-y-2">
                          <p className="text-[10px] text-slate-400 font-semibold border-b border-white/10 pb-1.5">
                            Derived from weighted scores across Financial Surplus (50%), Package Quality (30%), and Turnover Stability (20%).
                          </p>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-300">Academic Rigor</span>
                              <span className="font-mono font-black text-amber-400">{subScores.academic.toFixed(1)} / 10</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-300">Compensation &amp; Savings</span>
                              <span className="font-mono font-black text-emerald-400">{subScores.finance.toFixed(1)} / 10</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-300">Work/Life Balance</span>
                              <span className="font-mono font-black text-sky-400">{subScores.worklife.toFixed(1)} / 10</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-300">Leadership &amp; Stability</span>
                              <span className="font-mono font-black text-indigo-400">{subScores.leadership.toFixed(1)} / 10</span>
                            </div>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
              
      {/* 🪟 FULL-SCREEN EXPANDED DISCOVERED VACANCIES LEDGER MODAL */}
      {isLedgerModalOpen && activeSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#070d18] border border-white/15 rounded-xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-slate-900/70">
              <div className="space-y-1 min-w-0 flex-1 mr-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="size-2.5 rounded-full bg-teal-400 animate-pulse" />
                  <h3 className="text-sm sm:text-base font-black uppercase text-white tracking-wider truncate">
                    Discovered Vacancies Ledger
                  </h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 shrink-0">
                    {allProcessedJobs.filter(j => j.recruitmentCycle === "CURRENT").length} Current • {allProcessedJobs.filter(j => j.recruitmentCycle === "HISTORIC_Y1").length} Historic
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium truncate">
                  {activeSchool.schoolname || activeSchool.school || activeSchool.name} • {activeSchool.city || "—"}, {activeSchool.country || "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLedgerModalOpen(false)}
                className="size-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white border border-white/10 transition-colors shrink-0"
                title="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Filter / Search Bar */}
            <div className="p-3 sm:p-4 bg-white/[0.02] border-b border-white/5 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  value={ledgerSearchTerm}
                  onChange={(e) => setLedgerSearchTerm(e.target.value)}
                  placeholder="Search positions by title, subject, department, or portal..."
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {(["ALL", "CURRENT", "HISTORIC"] as const).map((cycle) => {
                  const count = cycle === "ALL" 
                    ? allProcessedJobs.length 
                    : cycle === "CURRENT" 
                      ? allProcessedJobs.filter(j => j.recruitmentCycle === "CURRENT").length 
                      : allProcessedJobs.filter(j => j.recruitmentCycle === "HISTORIC_Y1").length;
                  return (
                    <button
                      key={cycle}
                      type="button"
                      onClick={() => setLedgerFilterCycle(cycle)}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex-1 sm:flex-initial",
                        ledgerFilterCycle === cycle
                          ? "bg-teal-500 text-black shadow-lg shadow-teal-500/20"
                          : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                      )}
                    >
                      {cycle === "ALL" ? "All (" + count + ")" : cycle === "CURRENT" ? "Current (" + count + ")" : "Historic (" + count + ")"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Body - Scrollable Job List */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-2.5">
              {(() => {
                const searchLower = ledgerSearchTerm.toLowerCase().trim();
                const filtered = allProcessedJobs.filter((job) => {
                  if (ledgerFilterCycle === "CURRENT" && job.recruitmentCycle !== "CURRENT") return false;
                  if (ledgerFilterCycle === "HISTORIC" && job.recruitmentCycle !== "HISTORIC_Y1") return false;
                  if (!searchLower) return true;
                  const titleMatch = (job.title || "").toLowerCase().includes(searchLower);
                  const deptMatch = (job.department || "").toLowerCase().includes(searchLower);
                  const srcMatch = (job.source || "").toLowerCase().includes(searchLower);
                  const sourcesMatch = Array.isArray(job.sources) && job.sources.some((s: string) => String(s).toLowerCase().includes(searchLower));
                  return titleMatch || deptMatch || srcMatch || sourcesMatch;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-500 text-xs font-semibold">
                      No discovered vacancies matching your search criteria.
                    </div>
                  );
                }

                return filtered.map((job, idx) => (
                  <div 
                    key={"modal-job-" + idx} 
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className={cn("size-2 rounded-full border shrink-0", getSourceColorDot(job.source, job.applyUrl))} title={"Source: " + (job.source || 'Web Portal')} />
                      <span className="text-slate-500 font-bold tracking-tight text-[10px] shrink-0 w-5">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-200 text-xs truncate" title={job.title}>
                            {job.title || "Unknown Position"}
                          </span>
                          {job.department && (
                            <span className="text-[9px] font-bold text-slate-400 bg-white/5 px-1.5 py-0.5 rounded shrink-0">
                              {job.department}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                          <span>Source: <strong className="text-slate-400 font-semibold">{job.source}</strong></span>
                          {job.postedDate && (
                            <span>• Listed: <span className="text-slate-400">{job.postedDate}</span></span>
                          )}
                          {job.closesDate && (
                            <span>• Closes: <span className="text-slate-400">{job.closesDate}</span></span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-end pl-8 sm:pl-0">
                      <span className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded border shrink-0",
                        job.status === 'open'
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      )}>
                        {job.status === 'open' ? (job.closesDate ? "Closes: " + job.closesDate : 'Open') : 'Closed'}
                      </span>
                      {job.applyUrl && (
                        <a
                          href={job.applyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-teal-500/15 text-teal-300 hover:bg-teal-500 hover:text-black font-bold text-[10px] border border-teal-500/30 transition-all shrink-0"
                        >
                          <span>Portal</span>
                          <ArrowUpRight className="size-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-white/10 bg-black/40 flex items-center justify-between text-[11px] text-slate-400">
              <span className="text-[10px] text-slate-500 hidden sm:inline">
                * Dual-listed vacancies across multiple platforms are deduplicated and counted as a single position.
              </span>
              <button
                type="button"
                onClick={() => setIsLedgerModalOpen(false)}
                className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded font-bold text-xs transition-colors ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </TooltipProvider>
                </div>

                {/* Main Grid: Outgoings & Incomes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">

                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-[#d95f02] uppercase tracking-[0.35em] flex items-center gap-2 border-b border-[#d95f02]/10 pb-2.5 leading-normal"><Minus className="size-4" /> Monthly outgoings</h3>
                    <div className="space-y-3">
                      {/* Monthly Rent */}
                      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-2 lg:gap-0 border-b border-white/5 pb-2">
                        <div className="flex justify-between items-center w-full lg:w-auto lg:contents">
                          <div className="flex flex-col items-start shrink-0">
                            <div className="flex items-center gap-2 shrink-0">
                              <Home className="w-4 h-4 text-orange-500 shrink-0" />
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider cursor-help border-b border-dotted border-teal-500/60 leading-normal whitespace-nowrap shrink-0">
                                    Monthly Rent
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">
                                  {`Estimated market rent based on your specific household profile.${lifestyleMode !== "Comfort" ? ` (${lifestyleMode} Mode: ${lifestyleMode === "Saver" ? "-25%" : "+40%"})` : ""}`}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            {(canonicalCountry(getSchoolField(activeSchool, ['country', 'region']) || '') === 'monaco' || String(activeSchool?.id || '').toUpperCase() === 'FLIS0041' || activeSchool?.city?.toLowerCase() === 'monaco') && (
                              <span className="text-[9.5px] font-bold text-amber-400/90 italic tracking-wider ml-6 leading-tight mt-0.5">
                                (cross border living)
                              </span>
                            )}
                          </div>

                          <span className={cn("text-[13px] font-black tabular-nums text-white whitespace-nowrap lg:order-3 lg:ml-auto", analysis?.housingStatus === 'provided' && "italic")}>
                            {analysis?.housingStatus === 'provided' ? "covered" : `${currency} ${Math.round(analysis?.costs.rent || 0).toLocaleString()}`}
                          </span>
                        </div>

                        <div className="flex justify-end lg:justify-center w-full lg:w-auto lg:order-2 lg:flex-1 lg:px-4">
                          <div className="flex bg-white/5 rounded-sm p-0.5 border border-white/10 shrink-0">
                            <button onClick={() => setOverrideBedrooms(4)} className={cn("px-1.5 py-0.5 text-[9px] font-black rounded-sm transition-all", (overrideBedrooms === 4 || (overrideBedrooms === null && analysis?.isHousingProvidedByDefault)) ? "bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-sm" : "text-slate-400 hover:text-teal-400")}>
                              {analysis?.housingSubsidyRate ? `Sub (${Math.round(analysis.housingSubsidyRate * 100)}%)` : "Provided"}
                            </button>
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
                              {`Standard food and household supply indices for your household size.${lifestyleMode !== "Comfort" ? ` (${lifestyleMode} Mode: ${lifestyleMode === "Saver" ? "-20%" : "+25%"})` : ""}`}
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
                              {`A discretionary guide for dining out, cultural activities, and general socialising.${lifestyleMode !== "Comfort" ? ` (${lifestyleMode} Mode: ${lifestyleMode === "Saver" ? "-60%" : "+200%"})` : ""}`}
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

                        <div className="flex bg-slate-950 rounded-md p-1 border-2 border-slate-700/80 shrink-0 shadow-inner">
                          <button onClick={() => setTransportMode("P")} className={cn("px-2.5 py-1 text-[10px] font-extrabold rounded transition-all uppercase", transportMode === "P" ? "bg-teal-500 text-slate-950 shadow-[0_0_10px_rgba(20,184,166,0.4)]" : "text-slate-300 hover:text-white hover:bg-white/10")}>Transit</button>
                          <button onClick={() => setTransportMode("C")} className={cn("px-2.5 py-1 text-[10px] font-extrabold rounded transition-all uppercase", transportMode === "C" ? "bg-teal-500 text-slate-950 shadow-[0_0_10px_rgba(20,184,166,0.4)]" : "text-slate-300 hover:text-white hover:bg-white/10")}>Car Hire</button>
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
                      <div className="pt-3 mt-2">
                        <div className="flex justify-between items-center bg-black/40 border border-amber-500/35 p-2.5 rounded-md transition-colors hover:border-amber-500/50">
                          <div className="flex items-center gap-2">
                            <Wallet className="size-4 text-amber-400/90 shrink-0" />
                            <div className="flex flex-col">
                              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider leading-none">Custom Adjustments (+/-)</p>
                              <span className="text-[9px] font-medium text-slate-400 uppercase tracking-tight mt-0.5">Editable (+ extra expense / - savings)</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{currency}</span>
                            <Input
                              type="number"
                              value={manualAdjustments}
                              onChange={(e) => setManualAdjustments(e.target.value)}
                              className={cn("bg-black/60 border border-amber-500/40 w-24 h-9 px-2.5 text-right text-xs font-extrabold text-amber-300 focus:border-amber-400 outline-none rounded transition-all", noSpinners)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t-2 border-[#d95f02]/20 mt-[48px]">
                        <span className="text-[11px] font-black text-slate-400 uppercase italic tracking-widest leading-normal">Total outgoings</span>
                        <span className="text-[18px] font-black text-white tabular-nums leading-normal">{currency} {Math.round(analysis?.totalOut || 0).toLocaleString()}</span>
                      </div>

                      {/* 💍 UNIFIED COMPACT HOUSEHOLD & VISA ADVISORY (WITH INTEGRATED TUITION TABS) */}
                      {settings.familyStatus !== "Single" && (
                        <CoupleCountryAdvisoryPanel
                          country={analysis?.activeSchool?.country || activeSchool?.country || settings?.country || ""}
                          familyStatus={settings.familyStatus}
                          partnerSalary={settings.partnerSalary}
                          currency={currency}
                          onUpdatePartnerSalary={(val) => setSettings(prev => ({ ...prev, partnerSalary: val }))}
                          onUpdateFamilyStatus={(val) => setSettings(prev => ({ ...prev, familyStatus: val }))}
                          onFocusPartnerSalary={() => {
                            const partnerInput = document.getElementById('partner-salary-input');
                            if (partnerInput) {
                              partnerInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              partnerInput.focus();
                            }
                          }}
                        />
                      )}


                    </div>
                  </div>

                  <div className="space-y-5">
                    <h3 className="text-sm font-black text-[#d95f02] uppercase tracking-[0.35em] flex items-center gap-2 border-b border-[#d95f02]/10 pb-2.5 leading-normal"><Plus className="size-4" /> Monthly incomes</h3>
                    <div className="space-y-5">

                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2 shrink-0">
                          <Coins className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-normal whitespace-nowrap shrink-0">Monthly net base</span>
                            {benchmarkSalary && benchmarkSalary !== "0" && settings.netSalary !== benchmarkSalary ? (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Your Offer
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                5-Yr Benchmark
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[13px] font-black text-white whitespace-nowrap shrink-0">{currency} {parseFloat(settings.netSalary).toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center bg-black/40 border border-teal-500/35 p-2.5 rounded-md my-1 transition-colors hover:border-teal-500/50">
                        <div className="flex items-center gap-2">
                          <Banknote className="size-4 text-teal-400/90 shrink-0" />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider leading-none whitespace-nowrap shrink-0">Additional Income</span>
                            <span className="text-[9px] font-medium text-slate-400 uppercase tracking-tight mt-0.5">Editable (side hustle / tutoring)</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{currency}</span>
                          <Input type="number" value={extraIncome} onChange={(e) => setExtraIncome(e.target.value)} className={cn("bg-black/60 border border-teal-500/40 w-24 h-9 px-2.5 text-right text-xs font-extrabold text-teal-300 focus:border-teal-400 outline-none rounded transition-all", noSpinners)} />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t-2 border-[#d95f02]/20 mt-1">
                        <span className="text-[11px] font-black text-slate-400 uppercase italic tracking-widest leading-normal">Total monthly income</span>
                        <span className="text-[16px] font-black text-white tabular-nums leading-normal">{currency} {Math.round(analysis?.totalIn || 0).toLocaleString()}</span>
                      </div>

                      <div className="bg-[#d95f02]/5 p-7 border border-[#d95f02]/20 rounded-sm relative shadow-inner">
                        {/* 🎯 HEADING */}
                        <div className="text-left mb-1 overflow-hidden">
                          <p className="text-sm sm:text-base font-black text-[#d95f02] uppercase tracking-normal sm:tracking-[0.15em] italic leading-normal whitespace-nowrap overflow-hidden text-ellipsis">Monthly Disposable Surplus</p>
                        </div>
                        {/* 💡 SUB-HEADER EXPLANATION ROW */}
                        <div className="text-left mb-4 overflow-hidden">
                          <p className="text-[9.5px] sm:text-[10.5px] font-medium text-slate-300 italic tracking-tight whitespace-nowrap">the amount you can allocate to savings, holidays, and gym membership...</p>
                        </div>

                        <div className="flex flex-col items-end">
                          {(() => {
                            const cName = String(analysis?.activeSchool?.country || activeSchool?.country || settings?.country || "").toLowerCase().trim();
                            const currCode = String(currency || analysis?.activeSchool?.currency || "").toUpperCase().trim();
                            const isVolatileCurrency =
                              cName === "argentina" ||
                              cName === "egypt" ||
                              cName === "turkey" ||
                              cName === "venezuela" ||
                              cName === "lebanon" ||
                              cName === "nigeria" ||
                              cName === "south africa" ||
                              cName === "south-africa" ||
                              ["ARS", "EGP", "TRY", "VES", "LBP", "NGN", "ZAR"].includes(currCode) ||
                              analysis?.activeSchool?.isVolatileMarket === true ||
                              activeSchool?.isVolatileMarket === true;

                            return (
                              <div className="flex items-center gap-3 leading-tight flex-wrap justify-end">
                                {isVolatileCurrency && (
                                  <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded border bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.2)] animate-pulse shrink-0 self-center">
                                    Currency Risk
                                  </span>
                                )}
                                <div className="flex items-baseline gap-2 leading-tight">
                                  <span className={cn("font-black text-white/50 transition-all duration-300", surplusFontSizes.currency)}>{currency}</span>
                                  <span className={cn("font-black tracking-tighter tabular-nums text-white leading-tight transition-all duration-300", surplusFontSizes.number, (analysis?.surplus ?? 0) <= 0 && "text-rose-500")}>
                                    {surplusValStr}
                                    {(analysis?.uplift13 || analysis?.uplift14) && <span className="text-xl align-top text-[#d95f02] ml-1">*</span>}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}

                          {/* 🎯 CONVERSION LINE WITH BENCHMARK CURRENCY TOGGLE */}
                          <div className="flex items-center justify-between w-full mt-2">
                            <div className="flex bg-black/40 rounded-sm p-0.5 border border-white/5">
                              {BENCHMARKS.map(b => (
                                <button key={b.code} onClick={() => setBenchmark(b.code)} className={cn("px-2 py-1 text-[10px] font-black rounded-sm transition-all uppercase", benchmark === b.code ? "bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-sm" : "text-slate-400 hover:text-teal-400")}>{b.code}</button>
                              ))}
                            </div>
                            <span className={cn("font-black italic transition-all duration-300", surplusFontSizes.conversion, (analysis?.surplusBenchmark ?? 0) <= 0 ? "text-rose-500" : "text-emerald-500")}>
                              {benchmark} {Math.round(analysis?.surplusBenchmark || 0).toLocaleString()}
                            </span>
                          </div>

                          {/* 📊 OUTFLOWS vs SURPLUS RATIO BAR */}
                          {analysis && (analysis.totalIn ?? 0) > 0 && (() => {
                            const totalIn = analysis.totalIn ?? 0;
                            const surplus = analysis.surplus ?? 0;
                            const outflows = analysis.totalOut ?? 0;
                            const outflowPct = totalIn > 0 ? Math.round((outflows / totalIn) * 100) : 0;
                            const surplusPct = Math.max(0, 100 - outflowPct);
                            const isNegative = surplus <= 0;

                            return (
                              <div className="mt-6 w-full">
                                {/* The stacked bar */}
                                <div className="w-full h-7 rounded-lg overflow-hidden flex bg-black/40 border border-white/[0.06] shadow-[inset_0_1px_4px_rgba(0,0,0,0.4)]">
                                  {/* Outflows segment */}
                                  <div
                                    className={cn(
                                      "h-full transition-all duration-700 ease-out relative flex items-center justify-center",
                                      isNegative
                                        ? "bg-gradient-to-r from-rose-900/80 to-rose-800/70"
                                        : "bg-gradient-to-r from-slate-700/70 to-slate-600/60",
                                      !isNegative && "border-r-2 border-slate-900/80"
                                    )}
                                    style={{ width: `${Math.min(outflowPct, 100)}%` }}
                                  >
                                    {outflowPct >= 15 && (
                                      <span className="text-[10px] font-black text-white/80 tabular-nums tracking-wide">{outflowPct}%</span>
                                    )}
                                  </div>
                                  {/* Surplus segment */}
                                  {!isNegative && (
                                    <div
                                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700 ease-out shadow-[0_0_12px_rgba(52,211,153,0.35)] relative flex items-center justify-center"
                                      style={{ width: `${surplusPct}%` }}
                                    >
                                      {surplusPct >= 10 && (
                                        <span className="text-[10px] font-black text-emerald-950 tabular-nums tracking-wide">{surplusPct}%</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {/* Sub-legend */}
                                <div className="flex justify-between mt-2">
                                  <span className={cn("text-[10px] tabular-nums", isNegative ? "text-rose-400/70" : "text-slate-400/70")}>
                                    Outflows: <strong className={cn("font-extrabold", isNegative ? "text-rose-400" : "text-slate-300")}>{currency} {Math.round(outflows).toLocaleString()}</strong> ({outflowPct}%)
                                  </span>
                                  <span className={cn("text-[10px] tabular-nums", isNegative ? "text-rose-400/70" : "text-emerald-400/70")}>
                                    Net Surplus: <strong className={cn("font-extrabold", isNegative ? "text-rose-400" : "text-emerald-400")}>{currency} {Math.round(surplus).toLocaleString()}</strong> ({surplusPct}%)
                                  </span>
                                </div>
                              </div>
                            );
                          })()}

                          {/* ⚖️ FINANCIAL MICRO-DISCLAIMER (COMPRESSED TO 2 LINES) */}
                          <div className="text-[9.5px] sm:text-[10px] text-slate-400/90 mt-2.5 pt-2 px-0 border-t border-white/5 italic leading-tight space-y-0.5">
                            <p className="text-left pl-0 ml-0">*Indicative model based on OECD baselines and mid-payscale assumptions.</p>
                            <p className="flex items-center justify-between gap-1 text-left pl-0 ml-0">
                              <span>Individual savings vary.</span>
                              <button 
                                type="button"
                                onClick={() => openMethodologyModal()}
                                className="text-teal-400 hover:text-teal-300 hover:underline not-italic font-bold inline-flex items-center gap-0.5 cursor-pointer bg-transparent border-0 p-0 shrink-0"
                              >
                                View Methodology &rarr;
                              </button>
                            </p>
                          </div>

                          {/* 🇯🇵 JAPAN COMPENSATION STRUCTURE BREAKDOWN (COLLAPSIBLE DROPDOWN WITH BONUS MONTH CONTROLS INCLUDED) */}
                          {String(analysis?.activeSchool?.country || analysis?.sCountry || "").toLowerCase().includes("japan") && (
                            <div className="mt-4 w-full bg-sky-950/40 border border-sky-500/30 rounded-sm shadow-md overflow-hidden text-left transition-all duration-300">
                              <button
                                type="button"
                                onClick={() => setIsCompBreakdownOpen(!isCompBreakdownOpen)}
                                className="w-full p-3.5 flex items-center justify-between text-left hover:bg-sky-900/30 transition-all group"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="p-1.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 group-hover:scale-105 transition-transform">
                                    <FileText className="size-4 shrink-0" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-sky-300">
                                      Japan Compensation Structure Breakdown
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-mono">
                                      Click to {isCompBreakdownOpen ? "hide" : "view"} payroll & allowance details
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <ChevronDown className={cn("size-4 text-sky-400 transition-transform duration-300", isCompBreakdownOpen && "rotate-180")} />
                                </div>
                              </button>

                              {isCompBreakdownOpen && (
                                <div className="p-4 pt-2 border-t border-sky-500/20 animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                                  <div className="space-y-2 text-[11px] text-slate-300 leading-relaxed font-sans pt-1">
                                    <p>
                                      <strong className="text-white font-bold">12-Month Base Payroll:</strong> International schools in Japan disburse agreed annual base salaries across 12 equal monthly payments covering teaching terms and paid vacation periods.
                                    </p>
                                    <p>
                                      <strong className="text-white font-bold">Expatriate Gratuity Structure:</strong> Leading schools such as BST include an annual contract gratuity payment for overseas-recruited staff (per official 2024–25 benefits schedules) rather than statutory Japanese bonus splits.
                                    </p>
                                    <p>
                                      <strong className="text-white font-bold">Separate Allowances & Benefits:</strong> Key expat provisions (90% housing subsidies, annual return flights, relocation allowances, and 100% daily commuting pass reimbursements) are structured as dedicated contract line items.
                                    </p>
                                  </div>

                                  {/* BONUS MONTH CONTROLS INTEGRATED INSIDE THE BREAKDOWN SECTION */}
                                  {analysis?.countryIntel && (analysis.countryIntel.has13th || analysis.countryIntel.has14th) && (
                                    <div className="pt-3 border-t border-sky-500/20">
                                      {!showUpliftOptions && !uplift13 && !uplift14 ? (
                                        <button
                                          onClick={() => setShowUpliftOptions(true)}
                                          className="w-full py-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-sm hover:bg-emerald-500 hover:text-black transition-all group flex items-center justify-center gap-1.5"
                                        >
                                          Include bonus month salary <ArrowDownCircle className="size-3 group-hover:translate-y-0.5 transition-transform" />
                                        </button>
                                      ) : (
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic">
                                              Bonus Month Salary Options
                                            </span>
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
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 🕵️ TACTICAL SALARY UPLIFT FOR NON-JAPAN COUNTRIES */}
                          {analysis?.countryIntel && !String(analysis?.activeSchool?.country || analysis?.sCountry || "").toLowerCase().includes("japan") && (analysis.countryIntel.has13th || analysis.countryIntel.has14th) && (
                            <div className="mt-4 w-full p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-sm transition-all duration-500 overflow-hidden text-left">
                              {!showUpliftOptions && !uplift13 && !uplift14 ? (
                                <button
                                  onClick={() => setShowUpliftOptions(true)}
                                  className="w-full py-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-sm hover:bg-emerald-500 hover:text-black transition-all group flex items-center justify-center gap-1.5"
                                >
                                  Include bonus month salary <ArrowDownCircle className="size-3 group-hover:translate-y-0.5 transition-transform" />
                                </button>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic">
                                      Bonus Month Salary Options ({analysis.countryIntel.has14th ? "13th & 14th Month" : "13th Month"})
                                    </span>
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
                                </div>
                              )}
                            </div>
                          )}

                          {/* 🏷️ TACTICAL LIFESTYLE DOWNGRADE (SAVER MODE) */}
                          {(analysis?.surplus ?? 0) < 0 && lifestyleMode !== "Saver" && (
                            <div className="mt-3 w-full p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-sm transition-all duration-300">
                              <div className="flex items-start gap-2.5 mb-2.5">
                                <Sliders className="size-4 text-amber-400 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-[11px] font-bold text-amber-200 leading-tight">
                                    Surplus still in the red?
                                  </p>
                                  <p className="text-[10px] text-slate-300 leading-relaxed mt-0.5">
                                    Switch from <span className="font-bold text-amber-300">{lifestyleMode}</span> to <span className="font-bold text-emerald-400">Saver Mode</span> to trim rent (-25%), groceries (-20%), & discretionary spending (-60%).
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => setLifestyleMode("Saver")}
                                className="w-full py-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-black text-[10px] font-black uppercase tracking-widest rounded-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm group"
                              >
                                <ArrowDownCircle className="size-3.5 group-hover:translate-y-0.5 transition-transform" />
                                <span>Downgrade to Saver Lifestyle</span>
                              </button>
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

                          {(overrideBedrooms !== null || uplift13 || uplift14 || lifestyleMode !== "Comfort") && (
                            <button
                              onClick={() => {
                                setOverrideBedrooms(null);
                                setUplift13(false);
                                setUplift14(false);
                                setLifestyleMode("Comfort");
                              }}
                              className="mt-3 flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-sm hover:bg-slate-700 hover:border-slate-600 transition-all cursor-pointer"
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
                  <div className="mt-8 pt-4 pb-6 px-5 md:px-6 bg-white/[0.02] border border-white/5 rounded-sm shadow-sm space-y-6">
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

                    {/* 🛡️ COMPACT SECURITY & SAFETY INTELLIGENCE SECTION */}
                    {(() => {
                      const cName = canonicalCountry(getSchoolField(activeSchool, ['country', 'region']) || '');
                      const currCode = String(activeCOL?.currencyCode || activeSchool?.currency || (cName === 'argentina' ? 'ARS' : (cName === 'egypt' ? 'EGP' : (cName === 'turkey' ? 'TRY' : 'Local')))).toUpperCase();
                      const isVolatile =
                        cName === 'argentina' ||
                        cName === 'egypt' ||
                        cName === 'turkey' ||
                        cName === 'venezuela' ||
                        cName === 'lebanon' ||
                        cName === 'nigeria' ||
                        cName === 'south africa' ||
                        cName === 'south-africa' ||
                        ['ARS', 'EGP', 'TRY', 'VES', 'LBP', 'NGN', 'ZAR'].includes(currCode) ||
                        activeSchool?.isVolatileMarket === true;

                      // 1. Safe Neighborhoods & Commute Copy
                      let neighborhoodCopy = "High urban safety score. Teachers live in popular expat-friendly neighborhoods with reliable public transit & Uber.";
                      if (cName === 'czech republic' || cName === 'czechia') {
                        neighborhoodCopy = "World-class safety & walking score. Teachers live in vibrant expat hubs (Vinohrady, Karlín, Dejvice) with seamless 24/7 tram & metro access to school.";
                      } else if (cName === 'monaco' || cName === 'france') {
                        neighborhoodCopy = "Exceptional safety rating. Staff commute smoothly from Beausoleil, Cap-d'Ail, or Nice via the coastal TER train or direct bus lines.";
                      } else if (cName === 'argentina') {
                        neighborhoodCopy = "Gated/secure housing provided in expat zones (Palermo/Recoleta/Belgrano). High petty crime (snatch-and-grab); Uber recommended late at night.";
                      } else if (cName === 'south africa' || cName === 'south-africa') {
                        neighborhoodCopy = "Gated/secure estate housing in expat hubs (Dainfern, Sandton, Constantia). High property crime; anti-smash & grab vehicle film & Uber recommended.";
                      } else if (cName === 'egypt') {
                        neighborhoodCopy = "Secure compounds in expat hubs (Maadi, New Cairo, Zamalek). Heavy urban congestion; Uber/private drivers recommended for daily commutes.";
                      } else if (cName === 'china') {
                        neighborhoodCopy = "Extremely low violent and petty crime. Highly safe urban commuting via MRT/Subway and Didi at all hours.";
                      }

                      // 2. Digital Infrastructure & Streaming Copy
                      const isGfwOrCensored = ['china', 'united arab emirates', 'saudi arabia', 'qatar', 'oman', 'egypt', 'russia', 'turkey', 'vietnam', 'myanmar'].includes(cName);
                      let digitalCopy = "High-speed fiber & uncensored internet. Most expat educators set up their personal communication and streaming tools prior to arrival.";
                      if (cName === 'czech republic' || cName === 'czechia') {
                        digitalCopy = "Gigabit fiber internet & EU roaming. 100% uncensored access. Standard personal streaming tools used for home media (BBC iPlayer, US Hulu).";
                      } else if (cName === 'monaco' || cName === 'france') {
                        digitalCopy = "High-speed fiber & EU roaming. Fully uncensored. Standard personal streaming tools used for home-country media.";
                      } else if (cName === 'china') {
                        digitalCopy = "Connectivity & Digital Ecosystem: International communications and domestic platforms require specialized setup. Most expat educators configure their communication and connectivity tools prior to departure.";
                      } else if (['united arab emirates', 'qatar', 'saudi arabia', 'oman'].includes(cName)) {
                        digitalCopy = "Connectivity & VoIP Access: Local ISPs restrict certain VoIP and streaming portals. Most expat teachers set up their personal communication tools prior to arrival.";
                      } else if (['egypt', 'russia', 'turkey', 'vietnam', 'myanmar'].includes(cName)) {
                        digitalCopy = "Connectivity & Streaming Access: In-country bandwidth and external gateway access can be variable. Most educators configure their personal digital tools prior to relocation.";
                      } else if (cName === 'argentina') {
                        digitalCopy = "Uncensored internet. Standard personal digital tools used for accessing home-country streaming services (CNN, BBC iPlayer, Netflix) and overseas banking.";
                      }

                      // 3. Currency & Money Transfers Copy & Inflation Data
                      const inflationRateMap: Record<string, string> = {
                        'czech republic': '2.2%',
                        'czechia': '2.2%',
                        'monaco': '2.2%',
                        'france': '2.2%',
                        'germany': '2.2%',
                        'spain': '2.2%',
                        'italy': '2.2%',
                        'netherlands': '2.2%',
                        'austria': '2.2%',
                        'portugal': '2.2%',
                        'united kingdom': '2.2%',
                        'united states': '2.9%',
                        'switzerland': '1.3%',
                        'united arab emirates': '2.1%',
                        'saudi arabia': '1.6%',
                        'qatar': '1.2%',
                        'singapore': '2.4%',
                        'japan': '2.8%',
                        'china': '0.5%',
                        'hong kong': '1.8%',
                        'thailand': '0.8%',
                        'vietnam': '3.2%',
                        'south korea': '2.6%',
                        'malaysia': '1.9%',
                        'indonesia': '2.1%',
                        'india': '3.6%',
                        'egypt': '26.4%',
                        'turkey': '61.8%',
                        'argentina': '140.0%',
                        'south africa': '4.4%',
                        'brazil': '4.1%',
                        'mexico': '4.9%',
                        'nigeria': '33.4%',
                        'kenya': '4.3%',
                      };

                      const inflationRate = activeSchool?.inflationRate || activeSchool?.cpiInflation || activeSchool?.inflation || inflationRateMap[cName] || (isVolatile ? '15.0%+' : '2.5%');

                      let finCopy = "Stable currency framework. Zero capital controls—teachers easily transfer monthly savings home via Wise or Revolut with minimal FX fees.";
                      if (cName === 'czech republic' || cName === 'czechia') {
                        finCopy = "Stable Czech Koruna (CZK). Zero capital controls—teachers easily transfer monthly savings to home accounts using Wise or Revolut.";
                      } else if (cName === 'monaco' || cName === 'france') {
                        finCopy = "Euro (EUR) zone. Direct SEPA/IBAN transfers to home accounts with zero currency risk or capital controls.";
                      } else if (isVolatile) {
                        if (cName === 'argentina') {
                          finCopy = "High ARS volatility. Verify if salary is USD-pegged, split-paid, or deposited directly into an offshore hard-currency account.";
                        } else {
                          finCopy = `High ${currCode} volatility. Verify if salary is USD-pegged, split-paid, or deposited directly into an offshore hard-currency account.`;
                        }
                      }

                      return (
                        <div id="section-living-safety" className="scroll-mt-28 mt-0 space-y-3">
                          <h4 className="text-sm font-black text-[#d95f02] uppercase tracking-[0.4em] mb-3 leading-relaxed">
                            Security &amp; Safety Guide
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                            {/* 1. Safe Neighborhoods & Commute */}
                            <div className="bg-black/30 border border-white/5 rounded-sm p-3.5 space-y-1.5 hover:border-white/15 transition-all shadow-sm">
                              <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-wider">
                                Safe Neighborhoods &amp; Commute
                              </p>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                {neighborhoodCopy}
                              </p>
                            </div>

                            {/* 2. Digital Infrastructure & Streaming */}
                            <div className={cn(
                              "bg-black/30 border rounded-sm p-3.5 space-y-1.5 transition-all shadow-sm",
                              isGfwOrCensored ? "border-purple-500/40" : "border-white/5 hover:border-white/15"
                            )}>
                              <p className={cn(
                                "text-[10px] font-black uppercase tracking-wider",
                                isGfwOrCensored ? "text-purple-300" : "text-[#d95f02]"
                              )}>
                                {isGfwOrCensored ? "Streaming & Censorship Access" : "Digital Infrastructure & Streaming"}
                              </p>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                {digitalCopy}
                              </p>
                            </div>

                            {/* 3. Currency Risk */}
                            <div className={cn(
                              "bg-black/30 border rounded-sm p-3.5 space-y-1.5 transition-all shadow-sm",
                              isVolatile ? "border-rose-500/40" : "border-white/5 hover:border-white/15"
                            )}>
                              <div className="flex items-center justify-between gap-1">
                                <p className={cn(
                                  "text-[10px] font-black uppercase tracking-wider",
                                  isVolatile ? "text-rose-400" : "text-[#d95f02]"
                                )}>
                                  Currency Risk
                                </p>
                                <span className={cn(
                                  "text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-tight whitespace-nowrap shrink-0 transition-all",
                                  isVolatile
                                    ? "bg-rose-500/25 text-rose-200 border-rose-500/50 animate-pulse font-black"
                                    : "bg-white/5 text-slate-300 border-white/10"
                                )}>
                                  Inflation: {inflationRate}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                {finCopy}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div id="section-staffroom" className="scroll-mt-28 mt-8 space-y-4">
                      {/* 📅 Dynamic Staff Turnover Guide header — period reflects actual indexed history */}
                      {(() => {
                        const monthLabel = historicMonths === 1 ? '1 month' : historicMonths ? `${historicMonths} months` : null;
                        // Colour-code the coverage pill
                        const pillStyle = !historicMonths
                          ? 'bg-slate-800 text-slate-500 border-slate-700'
                          : historicMonths >= 6
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : historicMonths >= 3
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                        const pillIcon = !historicMonths ? '○' : historicMonths >= 6 ? '●' : historicMonths >= 3 ? '◑' : '◔';
                        const tooltipText = historicMonths
                          ? `Only ${monthLabel} of data is indexed — turnover estimates will improve as history grows.`
                          : 'No vacancy history has been indexed for this school yet. Turnover insights will appear once data is collected.';

                        return (
                          <div>
                            <h4 className="text-sm font-black text-[#d95f02] uppercase tracking-[0.4em] mb-3 flex flex-wrap items-center justify-between gap-2 leading-relaxed">
                              <span>Staff Turnover Guide</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      title={tooltipText}
                                      className={`text-[10px] font-black tracking-wider normal-case flex items-center gap-1.5 px-2 py-0.5 rounded-sm border cursor-help ${pillStyle}`}
                                    >
                                      <span>{pillIcon}</span>
                                      {monthLabel
                                        ? `${monthLabel} of history indexed`
                                        : 'History not yet indexed'}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="bg-[#0b1224] border border-white/15 text-white text-[11px] font-medium p-2.5 max-w-xs shadow-xl z-50 leading-relaxed">
                                    {tooltipText}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </h4>
                          </div>
                        );
                      })()}

                      <div className="space-y-6 text-[13px] text-slate-300 leading-relaxed">

                        {/* 🛸 STABILITY & CHURN ENGINE LEDGER */}
                        <div className="space-y-4">

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
                              const knownVacanciesCount = Math.max(processedJobs12.length, stabilityReport.metrics?.totalKnownVacancies || stabilityReport.total_known_vacancies || 0);
                              const churnRate = stabilityReport.metrics?.estimatedStaffBase
                                ? Math.round((knownVacanciesCount / stabilityReport.metrics.estimatedStaffBase) * 100)
                                : (stabilityReport.metrics?.estimatedChurnRatePercent || 0);

                              const currentJobs = allProcessedJobs.filter(j => j.recruitmentCycle === "CURRENT");
                              const historicJobs = allProcessedJobs.filter(j => j.recruitmentCycle === "HISTORIC_Y1");

                              const isUnavailable = (stabilityReport.category === "INSIGHT_UNAVAILABLE" || stabilityReport.metrics?.riskRating === "INSIGHT_UNAVAILABLE") && processedJobs12.length === 0;

                              let categoryTitle = "Low Turnover (<10%)";
                              let categoryTitleColor = "text-emerald-400";
                              let subtitle = "Settled Staffroom & High Renewal Rates";
                              let descriptor = "Staff routinely extend past initial 2-year contracts. Signals supportive SLT, manageable timetable hours, strong retention perks, and low cover demands.";

                              if (churnRate > 22) {
                                categoryTitle = "High Turnover (>22%)";
                                categoryTitleColor = "text-rose-400";
                                subtitle = "Revolving Door Territory";
                                descriptor = "High risk of unmanageable workload, unexpected curriculum shifts, or erratic leadership. Dig into staff morale, resignation timing, and contract completion rates before signing.";
                              } else if (churnRate > 15) {
                                categoryTitle = "Elevated Turnover (15–22%)";
                                categoryTitleColor = "text-amber-400";
                                subtitle = "Staffroom Restlessness";
                                descriptor = "Often points to recent SLT shakeups, middle-management churn, or shifting contact hours and cover duties. Worth probing department stability during interviews.";
                              } else if (churnRate >= 10) {
                                categoryTitle = "Moderate Turnover (10–15%)";
                                categoryTitleColor = "text-green-400";
                                subtitle = "Healthy Expat Cycle";
                                descriptor = "Standard replacement, as teachers complete 2- to 4-year stints, take international promotions, or repatriate home. This is normal staffroom momentum.";
                              }

                              return (
                                <div className="space-y-4">
                                  {/* Top Metrics Summary Bar matching Expatriate Package top bar */}
                                  <div className="bg-black/30 border border-white/5 rounded-sm p-4">
                                    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                      <li className="flex items-start">
                                        <div className="space-y-1">
                                          <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-widest">Est. Staff Base</p>
                                          <p className="text-sm font-black text-white tracking-tighter">
                                            {stabilityReport.metrics?.estimatedStaffBase || '—'}
                                          </p>
                                        </div>
                                      </li>
                                      <li className="flex items-start">
                                        <div className="space-y-1">
                                          <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-widest">Known Vacancies</p>
                                          <p className="text-sm font-black text-white tracking-tighter">
                                            {knownVacanciesCount}
                                          </p>
                                        </div>
                                      </li>
                                      <li className="flex items-start">
                                        <div className="space-y-1">
                                          <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-widest">Est. Churn Rate</p>
                                          <p className="text-sm font-black text-white tracking-tighter">
                                            {isUnavailable ? "—" : `${churnRate}%`}
                                          </p>
                                        </div>
                                      </li>
                                    </ul>
                                  </div>

                                  {/* Category Assessment Card matching Expatriate Package cards */}
                                  <div className="bg-black/30 border border-white/5 rounded-sm p-3.5 space-y-2">
                                    <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-wider">Turnover Assessment &amp; Category</p>
                                    <div className="text-xs text-slate-300 font-medium leading-relaxed">
                                      {isUnavailable ? (
                                        <div>
                                          <strong className="text-slate-400 font-black mr-1">Insight Unavailable:</strong>
                                          <strong className="text-white font-bold mr-1">Building the Ledger:</strong>
                                          <span>Vacancy tracking is currently limited for this campus. Historical retention patterns will surface as hiring season progresses.</span>
                                        </div>
                                      ) : (
                                        <div>
                                          <strong className={cn("font-black mr-1.5", categoryTitleColor)}>{categoryTitle}:</strong>
                                          <strong className="font-bold text-white mr-1.5">{subtitle}:</strong>
                                          <span>{descriptor}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* DISCOVERED VACANCIES LEDGER */}
                                  {allProcessedJobs.length > 0 && (
                                    <div className="mt-3">
                                      {!turnoverUnlocked ? (
                                        <div className="bg-black/30 border border-white/5 rounded-sm p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                                          <div className="space-y-0.5">
                                            <p className="text-[10px] font-black uppercase text-sky-400 tracking-wider">
                                              Discovered Vacancies Ledger
                                            </p>
                                            <p className="text-xs text-slate-300 font-medium">
                                              Indexed {processedJobs12.length} current &amp; {historicJobs.length} historic vacancies for this campus.
                                            </p>
                                          </div>
                                          <button
                                            onClick={() => setTurnoverUnlocked(true)}
                                            type="button"
                                            className="flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 px-5 py-2 rounded-sm cursor-pointer transition-all shadow-md shrink-0"
                                          >
                                            <span className="text-[11px] font-black uppercase tracking-widest text-teal-400 hover:text-white transition-colors">Find out more</span>
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="border border-white/5 bg-black/10 rounded-sm">
                                          <details className="group" open>
                                            <summary className="flex items-center justify-between p-2.5 cursor-pointer select-none text-[10px] font-black uppercase tracking-wider text-sky-400 hover:bg-white/5 transition-colors">
                                              <span className="truncate flex-1 mr-2">
                                                View Discovered Vacancies ({processedJobs12.length} Current, {historicJobs.length} Historic)
                                                {activeSchool && (
                                                  <span className="text-slate-300 font-bold tracking-normal normal-case ml-1.5">
                                                    {" "}— {activeSchool.schoolname || activeSchool.school || activeSchool.name}
                                                  </span>
                                                )}
                                              </span>
                                              <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setIsLedgerModalOpen(true);
                                                  }}
                                                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-colors text-[9px] font-bold"
                                                  title="Expand Full Discovered Vacancies Ledger"
                                                >
                                                  <Maximize2 className="size-3 text-teal-400" />
                                                  <span className="text-teal-300">Expand</span>
                                                </button>
                                                <ChevronDown className="size-3 text-slate-500 group-open:rotate-180 transition-transform" />
                                              </div>
                                            </summary>
                                            <div className="p-3 border-t border-white/5 space-y-4 bg-[#0b1224]/50 max-h-60 overflow-y-auto">
                                              <p className="text-[11px] text-slate-400 italic pb-2 border-b border-white/5">
                                                * Data Note: Staff turnover is calculated from known, publicly indexed vacancies relative to total estimated staff headcount. Figures normalise automatically across full 12-month recruitment cycles.
                                              </p>
                                              {currentJobs.length > 0 && (
                                                <div className="space-y-2">
                                                  <div className="text-[9px] font-black uppercase text-teal-400 px-2 pt-1 pb-0.5 tracking-wider border-b border-teal-500/10">Current Cycle (Last 12 Months)</div>
                                                  {currentJobs.map((job, idx) => (
                                                    <div key={`current-${idx}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 py-2 px-2 bg-white/[0.01] border-b border-white/5 hover:bg-white/[0.03] transition-colors text-[10px]">
                                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <span className={cn("size-2 rounded-full border shrink-0", getSourceColorDot(job.source, job.applyUrl))} title={`Source: ${job.source || 'Web Portal'}`} />
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
                                                        <span className={cn("size-2 rounded-full border shrink-0", getSourceColorDot(job.source, job.applyUrl))} title={`Source: ${job.source || 'Web Portal'}`} />
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
                                    </div>
                                  )}

                                  {/* 📱 MOBILE ONLY: Compare Schools Button rendered right under Staff Turnover section */}
                                  <div className="block lg:hidden mt-4 pt-3 border-t border-white/10">
                                    <button
                                      onClick={() => router.push(`/decide?ids=${activeSchool?.id}`)}
                                      disabled={!activeSchool}
                                      className="w-full bg-zinc-950/80 backdrop-blur-xl border border-[#d95f02] text-white font-bold rounded-md h-12 transition-all hover:bg-[#d95f02] hover:text-white shadow-[0_0_15px_rgba(249,115,22,0.2)] text-xs tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                      <span>Compare Schools</span>
                                      <ArrowRight className="size-4 text-[#d95f02]" />
                                    </button>
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


                  </div>
                )}

                {(() => {
                  const matrixItems = [
                    {
                      key: 'profit',
                      label: 'Profit Status',
                      icon: <Building className="size-5 text-sky-400" />,
                      value: (activeSchool as any).profitstatus || (activeSchool as any).profitStatus || (activeSchool as any).profit_status || (activeSchool as any).profit || 'For-Profit'
                    },


                    {
                      key: 'curriculum',
                      label: 'Curriculum',
                      icon: <BookOpen className="size-5 text-sky-400" />,
                      value: activeSchool.intel?.curriculum || activeSchool.curriculum || '—'
                    },

                    {
                      key: 'classSize',
                      label: 'Class Size',
                      icon: <Building className="size-5 text-sky-400" />,
                      value: activeSchool.intel?.classSize || activeSchool.classsize || (activeSchool as any).classSize || '—'
                    },
                    {
                      key: 'contact',
                      label: 'Non-Contact Time',
                      icon: <Clock className="size-5 text-sky-400" />,
                      value: (() => {
                        const raw = activeSchool.intel?.nonContactTime || (activeSchool as any).noncontacttime || (activeSchool as any).non_contact_time || (activeSchool as any).nonContactTime;
                        if (raw === undefined || raw === null || raw === '' || raw === '—') return '—';
                        const s = String(raw).trim();
                        return s.endsWith('%') ? s : `${s}%`;
                      })()
                    },
                    {
                      key: 'accreditation',
                      label: 'Accreditation',
                      icon: <Award className="size-5 text-sky-400" />,
                      value: activeSchool.intel?.accreditation || (activeSchool as any).approvals || (activeSchool as any).accreditation || 'International'
                    },
                  ];

                  return (
                    <div id="section-staffroom" className="scroll-mt-28 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div id="section-package-visa" className="scroll-mt-28 bg-[#1f2937]/25 border border-white/5 rounded-sm p-5 space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black uppercase tracking-widest text-[#d95f02]">Expatriate Package & Contract Intel</span>
                        </div>

                        {/* Consolidated School & Working Environment Box */}
                        <div className="bg-black/30 border border-white/5 rounded-sm p-4">
                          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                            {matrixItems.map(item => (
                              <li key={item.key} className="flex items-start">
                                <div className="mr-3 mt-0.5 text-sky-400 shrink-0">
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
                                    ) : item.value ? (
                                      item.value?.toString()
                                    ) : null}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                          {/* Visa & Deployment Intel */}
                          <div className="bg-black/30 border border-white/5 rounded-sm p-3 space-y-1.5">
                            <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-wider">Visa & Deployment Intel</p>
                            <div className="text-xs text-slate-300 font-medium leading-relaxed space-y-1.5">
                              <p>{(activeSchool.intel?.visaRestrictions || (activeSchool as any).visa || (activeSchool as any).visa_details || activeReq?.visa_notes || 'Standard regional requirements apply.').replace(/\.([A-Z])/g, '. $1')}</p>
                              <div className="pt-1.5 border-t border-white/5 text-xs text-slate-300 font-medium leading-relaxed flex flex-col gap-1.5">
                                {(activeReq?.max_age_f || activeReq?.max_age_m) && (
                                  <span className="leading-tight">• Max Age: {activeReq.max_age_f} (F) / {activeReq.max_age_m} (M)</span>
                                )}
                                {activeReq?.max_age_notes && (
                                  <span className="leading-tight">• {activeReq.max_age_notes.replace(/\.([A-Z])/g, '. $1')}</span>
                                )}
                                {(activeReq?.min_age || activeReq?.min_age_notes) && (
                                  <span className="leading-tight">• Min Age: {(activeReq.min_age_notes || activeReq.min_age || '21').replace(/\.([A-Z])/g, '. $1')}</span>
                                )}
                                {(activeSchool as any).dependent_visa_notes && (
                                  <span className="leading-tight">• Dependents: {((activeSchool as any).dependent_visa_notes).replace(/\.([A-Z])/g, '. $1')}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Candidate Qualifications */}
                          <div className="bg-black/30 border border-white/5 rounded-sm p-3 space-y-1.5">
                            <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-wider">Candidate Qualifications</p>
                            <div className="text-xs text-slate-300 font-medium leading-relaxed space-y-1.5">
                              {(activeReq?.academic_Degree_req || (activeSchool as any).academic_Degree_req) && (
                                <div className="leading-tight">• Degree: {(activeReq?.academic_Degree_req || (activeSchool as any).academic_Degree_req).replace(/\.([A-Z])/g, '. $1')}</div>
                              )}
                              {(activeReq?.license_req || (activeSchool as any).license_req) && (
                                <div className="leading-tight">
                                  • License: {(() => {
                                    const raw = (activeReq?.license_req || (activeSchool as any).license_req || '').trim();
                                    const first = raw.split(/\.(?=[A-Z\s]|$)/)[0].trim();
                                    return first || raw;
                                  })()}
                                </div>
                              )}
                              <div className="leading-tight">
                                • Experience: {(() => {
                                  const years = activeReq?.exp_years_Req || (activeSchool as any).experience_years_req || (activeSchool as any).minExperience;
                                  const rawNotes = (activeSchool.intel?.minQualifications || activeReq?.exp_notes || '').replace(/\.([A-Z])/g, '. $1').trim();
                                  const strippedNotes = rawNotes.replace(/^(minimum\s*)?\d+\+?\s*years?(\s*(experience|preferred|required))*\.\s*/i, '').trim();
                                  if (years) {
                                    return strippedNotes ? `${years} Years. ${strippedNotes}` : `${years} Years`;
                                  }
                                  return rawNotes || '2 Years preferred';
                                })()}
                              </div>
                            </div>
                          </div>

                          {activeSchool.taxExemptionStatus && (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-sm p-3 space-y-1 md:col-span-2 shadow-sm">
                              <p className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                                <span>⚖️ Tax Status & Bilateral Treaty Exemption</span>
                                <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded font-black tracking-widest border border-emerald-500/30">POSITIVE BENEFIT</span>
                              </p>
                              <p className="text-xs text-emerald-100 font-bold leading-relaxed">{activeSchool.taxExemptionStatus}</p>
                            </div>
                          )}
                          {((activeSchool as any).tax_details || (activeSchool as any).taxDetails || (activeSchool as any).taxation) && !activeSchool.taxExemptionStatus && (
                            <div className="bg-black/30 border border-white/5 rounded-sm p-3 space-y-1 md:col-span-2">
                              <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-wider">Tax & Payroll Structure</p>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed">{(activeSchool as any).tax_details || (activeSchool as any).taxDetails || (activeSchool as any).taxation}</p>
                            </div>
                          )}
                          {(activeSchool as any).payrollFramework && (
                            <div className="bg-black/30 border border-white/5 rounded-sm p-3 space-y-1 md:col-span-2">
                              <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-wider">14-Month Payroll Structure & Tax Advantage</p>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed">{(activeSchool as any).payrollFramework}</p>
                            </div>
                          )}
                          {(activeSchool as any).positionalAllowances && (
                            <div className="bg-black/30 border border-white/5 rounded-sm p-3 space-y-1">
                              <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-wider">Positional & Leadership Allowances</p>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed">{(activeSchool as any).positionalAllowances}</p>
                            </div>
                          )}
                          {(activeSchool.housingBenefit || (activeSchool as any).housingprovision || (activeSchool as any).housingAllowance || (activeSchool as any).housing_provision || (activeSchool as any).housing_status) && (
                            <div className="bg-black/30 border border-white/5 rounded-sm p-3 space-y-1">
                              <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-wider">Housing & Boarding Perks</p>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed">{activeSchool.housingBenefit || (activeSchool as any).housingprovision || (activeSchool as any).housingAllowance || (activeSchool as any).housing_provision || (activeSchool as any).housing_status}</p>
                            </div>
                          )}
                          {(activeSchool.healthcoverage || (activeSchool as any).healthInsurance || (activeSchool as any).healthCoverage || (activeSchool as any).health) && (
                            <div className="bg-black/30 border border-white/5 rounded-sm p-3 space-y-1">
                              <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-wider">Healthcare & Social Security</p>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed">{activeSchool.healthcoverage || (activeSchool as any).healthInsurance || (activeSchool as any).healthCoverage || (activeSchool as any).health}</p>
                            </div>
                          )}
                          {(activeSchool.tuitionBenefit || (activeSchool as any).tuition || (activeSchool as any).tuition_benefit) && (
                            <div className="bg-black/30 border border-white/5 rounded-sm p-3 space-y-1">
                              <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-wider">Dependent Child Tuition Benefit</p>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed">{activeSchool.tuitionBenefit || (activeSchool as any).tuition || (activeSchool as any).tuition_benefit}</p>
                            </div>
                          )}
                          {(activeSchool.relocationBenefit || (activeSchool as any).relocationAllowance || (activeSchool as any).relocation) && (
                            <div className="bg-black/30 border border-white/5 rounded-sm p-3 space-y-1">
                              <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-wider">Relocation & Immigration Support</p>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed">{activeSchool.relocationBenefit || (activeSchool as any).relocationAllowance || (activeSchool as any).relocation}</p>
                            </div>
                          )}
                          {(activeSchool.travelBenefit || (activeSchool as any).flightAllowance || (activeSchool as any).annualFlights || (activeSchool as any).flights) && (
                            <div className="bg-black/30 border border-white/5 rounded-sm p-3 space-y-1">
                              <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-wider">Travel & Home Leave Subsidies</p>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed">{activeSchool.travelBenefit || (activeSchool as any).flightAllowance || (activeSchool as any).annualFlights || (activeSchool as any).flights}</p>
                            </div>
                          )}
                          {(activeSchool as any).languageAndTechSupport && (
                            <div className="bg-black/30 border border-white/5 rounded-sm p-3 space-y-1">
                              <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-wider">Language & Tech Infrastructure</p>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed">{(activeSchool as any).languageAndTechSupport}</p>
                            </div>
                          )}
                          {(activeSchool as any).mealsBenefit && (
                            <div className="bg-black/30 border border-white/5 rounded-sm p-3 space-y-1">
                              <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-wider">Duty Meals & Refectory</p>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed">{(activeSchool as any).mealsBenefit}</p>
                            </div>
                          )}
                          {(activeSchool as any).cognitaMobility && (
                            <div className="bg-black/30 border border-white/5 rounded-sm p-3 space-y-1">
                              <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-wider">Cognita Network Mobility</p>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed">{(activeSchool as any).cognitaMobility}</p>
                            </div>
                          )}
                          {(activeSchool as any).lifestylePrivileges && (
                            <div className="bg-black/30 border border-white/5 rounded-sm p-3 space-y-1">
                              <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-wider">Lifestyle & Outdoor Privileges</p>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed">{(activeSchool as any).lifestylePrivileges}</p>
                            </div>
                          )}
                          {(activeSchool.pensionBenefit || (activeSchool as any).pensionDetails) && (
                            <div className="bg-black/30 border border-white/5 rounded-sm p-3 space-y-1">
                              <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-wider">Pension & Retirement Plan</p>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed">{activeSchool.pensionBenefit || (activeSchool as any).pensionDetails}</p>
                            </div>
                          )}
                          {activeSchool.shippingAllowance && (
                            <div className="bg-black/30 border border-white/5 rounded-sm p-3 space-y-1">
                              <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-wider">Shipping & Repatriation Allowances</p>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed">{activeSchool.shippingAllowance}</p>
                            </div>
                          )}
                          {activeSchool.pdAllowance && (
                            <div className="bg-black/30 border border-white/5 rounded-sm p-3 space-y-1">
                              <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-wider">Professional Development Fund</p>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed">{activeSchool.pdAllowance}</p>
                            </div>
                          )}
                          {(activeSchool.perks || (activeSchool as any).benefits) && (
                            <div className="bg-black/30 border border-white/5 rounded-sm p-3 space-y-1">
                              <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-wider">Staff Perks & Transport</p>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed">{activeSchool.perks || (activeSchool as any).benefits}</p>
                            </div>
                          )}
                          {activeSchool.holidayEntitlement && (
                            <div className="bg-black/30 border border-white/5 rounded-sm p-3 space-y-1">
                              <p className="text-[10px] font-black uppercase text-[#d95f02] tracking-wider">Holiday Entitlement</p>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed">{activeSchool.holidayEntitlement}</p>
                            </div>
                          )}
                        </div>
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