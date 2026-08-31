"use client";
export const dynamic = "force-dynamic";
/**
 * 🛸 PIPELINE 4 — HIGH-SPEED UI ENGINE
 *
 * Reads pre-scrubbed, pre-enriched documents from `featured_jobs_cache`
 * (maintained by Pipelines 1–3). Zero joins, zero server-side role/URL
 * filtering — all of that is done once at write-time.
 *
 * The only client-side computation retained is the family-status savings
 * multiplier, applied to the pre-computed `savingsPotentialSingle` baseline.
 */
import { parseClosingDate } from '@/lib/crawler/dateParser';

import { useState, useEffect, useMemo } from 'react';
import { 
  Search, SlidersHorizontal, MapPin, Calendar, Building, Star, BookOpen, 
  Coins, GraduationCap, ArrowUpRight, Loader2, AlertCircle, Users, Check, Trash2, RefreshCw, Clock
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useAuth, useDoc, db } from '@/firebase';
import { useTeacher } from '@/firebase/firestore/use-teacher';
import { collection, doc, updateDoc, collectionGroup, query, where } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { canonicalCountry, calculateSchoolSavingsForStatus, findCostOfLiving } from '@/lib/calculations';
import { sanitizeJobTitle } from '@/lib/crawler/titleSanitizer';

const cleanSchoolName = (raw: string): string => {
  if (!raw) return "";
  let clean = raw.trim();
  if (clean.includes(",")) {
    clean = clean.split(",")[0].trim();
  }
  if (clean.length > 60) {
    clean = clean.substring(0, 60).replace(/[-,\s]+$/, "").trim();
  }
  return clean;
};

// A helper to normalize strings for matching
const formatDateCustom = (dateInput: any): string => {
  if (!dateInput) return "";
  const dt = typeof dateInput === "object" && dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(dt.getTime())) return String(dateInput);
  const day = dt.getDate();
  const month = dt.toLocaleDateString("en-GB", { month: "long" });
  const year = dt.getFullYear();
  return `${day} ${month} ${year}`;
};

const normalize = (str: string) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, '').trim();

// A helper to parse salary numbers (e.g., "$4,150.00" -> 4150)
const parseSalary = (val: any): number => {
  if (!val) return 0;
  const str = String(val).replace(/[^0-9.]/g, "");
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

// Deterministic fixed reference ID generator (replaces sequential rank numbers)

const getJobCardReference = (job: any): string => {
  if (!job) return "";
  const schoolNum = (job.schoolId || "").replace(/^FLIS/i, "");
  
  let jobIdNum = "";
  if (job.id) {
    const match = String(job.id).match(/(\d+)$/);
    if (match) {
      jobIdNum = match[1];
    }
  }
  if (!jobIdNum && job.source_url) {
    const match = String(job.source_url).match(/(\d+)\/?$/);
    if (match) {
      jobIdNum = match[1];
    }
  }
  if (!jobIdNum) {
    jobIdNum = getFixedJobRef(job).replace(/^REF-/i, "");
  }

  return schoolNum ? `${schoolNum}/${jobIdNum}` : jobIdNum;
};

const getFixedJobRef = (job: any): string => {
  if (!job) return "REF-1000";
  const str = job.id || job.jobFingerprint || job.applyUrl || job.title || "";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const code = Math.abs(hash % 9000) + 1000;
  return "REF-" + code;
};

/** Shape of a document in the `featured_jobs_cache` flat collection. */
interface FeaturedJobCacheDoc {
  id: string;
  title: string;
  source: string;
  applyUrl: string;
  datePosted: string | null;
  closingDate: string | null;
  closingDateMillis: number | null;
  schoolId: string;
  schoolName: string;
  city: string;
  country: string;
  status: string;
  ingestedAtMillis: number;
  isRollingDeadline: boolean;
  // Fields populated by Pipeline 2
  searchTokens?: string[];
  savingsPotentialSingle?: number;
  savingsByStatus?: Record<string, number>;
  salaryRange?: string;
  housingProvision?: string;
  department?: string;
  curriculum?: string;
  schoolRating?: number;
  schoolWebsite?: string;
  isVolatileMarket?: boolean;
  paidInUSD?: boolean;
}

/** Fully-resolved job shape consumed by the UI. */
interface StructuredJob {
  id: string;
  title: string;
  department: string;
  source: string;
  sources?: string[];
  source_url: string;
  sourceUrls?: Record<string, string>;
  date_listed: string | null;
  date_closing: string | null;
  status: string;
  schoolId: string;
  schoolName: string;
  schoolRating: number;
  curriculum: string;
  city: string;
  country: string;
  /** Dynamic savings — family-status multiplier applied to savingsPotentialSingle */
  savingsPotential: number;
  schoolWebsite: string;
  paidInUSD?: boolean;
  scrapedAtRaw?: any;
  closesDateRaw?: Date | null;
  isRollingDeadline?: boolean;
}

export default function FeaturedJobsPage() {
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const { data: teacherProfile } = useTeacher(user?.uid || "");
  const userDocQuery = useMemoFirebase(() => (mounted && firestore && user?.uid ? doc(firestore, 'users', user.uid) : null), [firestore, mounted, user?.uid]);
  const { data: userProfileData } = useDoc<any>(userDocQuery);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [activeTab, setActiveTab] = useState<'public' | 'admin_staging'>('public');

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSourceEngine, setSelectedSourceEngine] = useState<string>("ALL");
  const [selectedCurriculums, setSelectedCurriculums] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [minSavings, setMinSavings] = useState<number>(0);
  const [minRating, setMinRating] = useState<number>(0);
  const [familyStatus, setFamilyStatus] = useState<string>("Single");
  const [sortBy, setSortBy] = useState<string>("Projected Savings");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Refresh loading states
  const [refreshingSchools, setRefreshingSchools] = useState<Record<string, boolean>>({});
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine admin user state via token claims or teacher profile role
  useEffect(() => {
    if (user) {
      user.getIdTokenResult().then((idTokenResult) => {
        setIsAdminUser(!!idTokenResult.claims.admin);
      }).catch(() => {});
    } else {
      setIsAdminUser(false);
    }
  }, [user]);

  // Fallback to check document profile roles
  const calculatedIsAdmin = isAdminUser || user?.email === 'admin@leopardfish.intel' || user?.email === 'roger@leopardfishintel.com' || user?.email?.endsWith('@leopardfishintel.com') || userProfileData?.role === 'admin' || userProfileData?.isAdmin === true || (teacherProfile as any)?.role === 'admin' || (teacherProfile as any)?.isAdmin === true;

  // Auto-fill family status if registered or returning user
  useEffect(() => {
    if (teacherProfile?.familyStatus) {
      const dbStatus = String(teacherProfile.familyStatus).trim();
      const lowerStatus = dbStatus.toLowerCase();
      
      if (lowerStatus.includes("single")) {
        setFamilyStatus("Single");
      } else if (lowerStatus.includes("sole earner")) {
        setFamilyStatus("Married (sole earner)");
      } else if (lowerStatus.includes("dual income")) {
        setFamilyStatus("Married (dual income)");
      } else if (lowerStatus.includes("couple") || lowerStatus.includes("married")) {
        setFamilyStatus("Married (sole earner)");
      } else if (lowerStatus.includes("+1") || lowerStatus.includes("1 child")) {
        setFamilyStatus("Family +1");
      } else if (lowerStatus.includes("+2") || lowerStatus.includes("2 children")) {
        setFamilyStatus("Family +2");
      } else if (lowerStatus.includes("+3") || lowerStatus.includes("3 children") || lowerStatus.includes("3+")) {
        setFamilyStatus("Family +3");
      } else if (lowerStatus.includes("family")) {
        setFamilyStatus("Family +1");
      } else {
        const options = ["Single", "Married (sole earner)", "Married (dual income)", "Family +1", "Family +2", "Family +3"];
        const matched = options.find(o => o.toLowerCase() === lowerStatus);
        if (matched) setFamilyStatus(matched);
      }
    }
  }, [teacherProfile]);

  // ── Pipeline 4 Queries ─────────────────────────────────────────────────────
  // Query 1: Pre-enriched cache documents (approved public feed) — single flat collection, no joins
  const cacheQuery = useMemoFirebase(
    () => (mounted && firestore
      ? query(collection(firestore, 'featured_jobs_cache'), where('status', '==', 'approved'))
      : null),
    [firestore, mounted]
  );

  // Query 2: Admin staging — still reads from subcollections (source of truth)
  const adminJobsQuery = useMemoFirebase(
    () => (mounted && firestore && calculatedIsAdmin
      ? query(collectionGroup(firestore, 'jobs'), where('status', '==', 'pending_review'))
      : null),
    [firestore, mounted, calculatedIsAdmin]
  );

  // Schools collection — only needed for admin staging tab school metadata join
  const schoolsQuery = useMemoFirebase(
    () => (mounted && firestore && calculatedIsAdmin ? collection(firestore, 'schools') : null),
    [firestore, mounted, calculatedIsAdmin]
  );

  const { data: cacheData, isLoading: loadingCache, error: errorCache } = useCollection<any>(cacheQuery);
  const { data: adminJobsData, isLoading: loadingAdminJobs, error: errorAdmin } = useCollection<any>(adminJobsQuery);
  const { data: schoolsData, isLoading: loadingSchools, error: errorSchools } = useCollection<any>(schoolsQuery);
  // Query 3: Locations Cost of Living — loaded for dynamic status savings calculation
  const colQuery = useMemoFirebase(
    () => (mounted && firestore ? collection(firestore, 'locations_costOfLiving') : null),
    [firestore, mounted]
  );
  const { data: colData } = useCollection<any>(colQuery);


  // Aliases for loading/error state used in JSX (preserved for JSX compat)
  const loadingPublicJobs = loadingCache;
  const errorPublic = errorCache;
  const loadingCol = false;   // No longer needed — enrichment is pre-computed
  const errorCol = null;

  const schoolsMap = useMemo(() => {
    if (!schoolsData) return {};
    return schoolsData.reduce((acc: any, school: any) => {
      acc[school.id] = school;
      return acc;
    }, {});
  }, [schoolsData]);



  // Handle manual verify & sync for a single school via Cloud Task queue worker
  const handleRefreshSchool = async (schoolId: string, schoolName: string, city: string, country: string) => {
    setRefreshingSchools(prev => ({ ...prev, [schoolId]: true }));
    try {
      const docRef = doc(db, 'schools', schoolId);
      await updateDoc(docRef, {
        isRevalidating: true
      });

      await fetch('/api/tasks/scrape-worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          schoolName,
          city,
          country
        })
      });
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setTimeout(() => {
        setRefreshingSchools(prev => ({ ...prev, [schoolId]: false }));
      }, 6000);
    }
  };

  // Handle batch verify & sync for all visible filtered schools in parallel via Cloud Task queue worker
  const handleSyncAllVisible = async () => {
    setIsSyncingAll(true);
    const uniqueSchools = Array.from(new Set(filteredJobs.map(j => JSON.stringify({
      schoolId: j.schoolId,
      schoolName: j.schoolName,
      city: j.city,
      country: j.country
    })))).map(s => JSON.parse(s));

    try {
      await Promise.all(uniqueSchools.map(async (school) => {
        setRefreshingSchools(prev => ({ ...prev, [school.schoolId]: true }));
        try {
          const docRef = doc(db, 'schools', school.schoolId);
          await updateDoc(docRef, {
            isRevalidating: true
          });

          await fetch('/api/tasks/scrape-worker', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              schoolId: school.schoolId,
              schoolName: school.schoolName,
              city: school.city,
              country: school.country
            })
          });
        } catch (err) {
          console.error("Refresh failed for:", school.schoolName, err);
        } finally {
          setTimeout(() => {
            setRefreshingSchools(prev => ({ ...prev, [school.schoolId]: false }));
          }, 6000);
        }
      }));
    } catch (err) {
      console.error("Batch sync failed:", err);
    } finally {
      setTimeout(() => {
        setIsSyncingAll(false);
      }, 6000);
    }
  };

  const [isSweeping, setIsSweeping] = useState(false);

  const handleRunFullSweep = async () => {
    setIsSweeping(true);
    try {
      await fetch('/api/daily-sweep', { method: 'GET' });
    } catch (err) {
      console.error("Failed to run daily sweep:", err);
    } finally {
      setTimeout(() => {
        setIsSweeping(false);
      }, 5000);
    }
  };

  // Admin Actions
  const handleMoveToPending = async (schoolId: string, jobId: string) => {
    try {
      // 1. Update pre-enriched cache document
      const cacheRef = doc(db, 'featured_jobs_cache', jobId);
      await updateDoc(cacheRef, {
        status: 'pending_review',
        reviewedAt: new Date(),
        reviewedBy: user?.uid || "admin"
      });

      // 2. Update subcollection document if present
      try {
        const subRef = doc(db, 'schools', schoolId, 'jobs', jobId);
        await updateDoc(subRef, {
          status: 'pending_review',
          reviewedAt: new Date(),
          reviewedBy: user?.uid || "admin"
        });
      } catch (e) {
        /* subcollection document may not exist for cache-only items */
      }
    } catch (err) {
      console.error("Failed to move job to pending:", err);
    }
  };

  const handleApproveJob = async (schoolId: string, jobId: string) => {
    try {
      const cacheRef = doc(db, 'featured_jobs_cache', jobId);
      await updateDoc(cacheRef, {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: user?.uid || "admin"
      });

      try {
        const subRef = doc(db, 'schools', schoolId, 'jobs', jobId);
        await updateDoc(subRef, {
          status: 'approved',
          reviewedAt: new Date(),
          reviewedBy: user?.uid || "admin"
        });
      } catch (e) {}
    } catch (err) {
      console.error("Failed to approve job:", err);
    }
  };

  const handleRemoveJob = async (schoolId: string, jobId: string) => {
    try {
      const cacheRef = doc(db, 'featured_jobs_cache', jobId);
      await updateDoc(cacheRef, {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: user?.uid || "admin"
      });

      try {
        const subRef = doc(db, 'schools', schoolId, 'jobs', jobId);
        await updateDoc(subRef, {
          status: 'rejected',
          reviewedAt: new Date(),
          reviewedBy: user?.uid || "admin"
        });
      } catch (e) {}
    } catch (err) {
      console.error("Failed to reject job:", err);
    }
  };

  const handleUpdateClosingDate = async (schoolId: string, jobId: string, dateStr: string) => {
    try {
      const ref = doc(db, 'schools', schoolId, 'jobs', jobId);
      const { Timestamp } = await import('firebase/firestore');
      if (!dateStr) {
        await updateDoc(ref, {
          closingDate: null,
          isRollingDeadline: true
        });
      } else {
        const parsedDate = new Date(dateStr);
        await updateDoc(ref, {
          closingDate: Timestamp.fromDate(parsedDate),
          isRollingDeadline: false
        });
      }
    } catch (err) {
      console.error("Failed to update job closing date:", err);
    }
  };

  // ── Process & Extract Open Vacancies ──────────────────────────────────────
  const allJobs = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const seenJobKeys = new Set<string>();
    const seenUrls = new Set<string>();
    const jobsList: StructuredJob[] = [];

    // ── PUBLIC TAB: read from pre-enriched featured_jobs_cache ───────────────
    if (activeTab === 'public') {
      if (!cacheData || cacheData.length === 0) return [];



      cacheData.forEach((cacheDoc: FeaturedJobCacheDoc) => {
        // MULTI-ENGINE SOURCE FILTER
        const sourceUpper = String(cacheDoc.source || '').toUpperCase();
        const applyUrlLower = String(cacheDoc.applyUrl || '').toLowerCase();
        const isTes = sourceUpper === 'TES' && applyUrlLower.includes('tes.com/jobs/vacancy/');
        const isNae = sourceUpper === 'NORD ANGLIA' && applyUrlLower.includes('careers.nordangliaeducation.com/job/');
        const isGrc = sourceUpper === 'GRC' && (applyUrlLower.includes('grcfair.org/job-details/') || applyUrlLower.includes('grcfair.org/job/'));
        const isInspired = (sourceUpper.includes('INSPIRED') || applyUrlLower.includes('inspirededu.com/job/'));
        if (!isTes && !isNae && !isGrc && !isInspired) return;
        // Status guard (janitor may not have run yet for very stale docs)
        const rawStatus = String(cacheDoc.status || '').toUpperCase();
        if (rawStatus === 'EXPIRED' || rawStatus === 'CLOSED' || rawStatus === 'REJECTED' || rawStatus === 'PENDING_REVIEW' || rawStatus === 'PENDING') return;

        // Closing date guard
        if (cacheDoc.closingDateMillis && cacheDoc.closingDateMillis < todayMs) return;

        // Deduplication by unique applyUrl & title + schoolId
        if (applyUrlLower && seenUrls.has(applyUrlLower)) return;
        if (applyUrlLower) seenUrls.add(applyUrlLower);

        const jobKey = `${cacheDoc.schoolId.toLowerCase()}_${(cacheDoc.title || '').toLowerCase().trim()}`;
        const newSrc = cacheDoc.source || "Official Source";

        if (seenJobKeys.has(jobKey)) {
          // Dual listing detected! Append source and URL to existing job record
          const existing = jobsList.find(j => `${j.schoolId.toLowerCase()}_${j.title.toLowerCase().trim()}` === jobKey);
          if (existing) {
            if (!existing.sources) existing.sources = [existing.source];
            if (!existing.sources.includes(newSrc)) existing.sources.push(newSrc);
            if (!existing.sourceUrls) existing.sourceUrls = { [existing.source]: existing.source_url };
            if (cacheDoc.applyUrl) existing.sourceUrls[newSrc] = cacheDoc.applyUrl;
          }
          return;
        }
        seenJobKeys.add(jobKey);

        // Leopardfish grounded calculation for target family status
        let savingsPotential = cacheDoc.savingsByStatus?.[familyStatus];
        if (savingsPotential === undefined) {
          const school = schoolsMap[cacheDoc.schoolId];
          const salaryNum = parseFloat(String(school?.salaryRange || school?.salary || cacheDoc.salaryRange || "").replace(/[^0-9.]/g, "")) || 3500;
          const colRecord = findCostOfLiving(cacheDoc.city || school?.city, cacheDoc.country || school?.country, colData || []);
          const housingProvision = school?.housingprovision || cacheDoc.housingProvision || "";
          savingsPotential = calculateSchoolSavingsForStatus(
            salaryNum,
            familyStatus,
            colRecord,
            housingProvision,
            cacheDoc.country || school?.country || "",
            cacheDoc.paidInUSD
          );
        }

        let closesDate: Date | null = null;
        if (cacheDoc.closingDateMillis) {
          closesDate = new Date(cacheDoc.closingDateMillis);
        } else if (cacheDoc.closingDate) {
          const parsed = parseClosingDate(cacheDoc.closingDate);
          closesDate = parsed.closingDate;
        }

        jobsList.push({
          id: cacheDoc.id,
          title: sanitizeJobTitle(cacheDoc.title || 'Teaching Vacancy', cacheDoc.schoolName),
          department: cacheDoc.department || 'Secondary',
          source: cacheDoc.source || 'Official Source',
          source_url: cacheDoc.applyUrl || '',
          date_listed: cacheDoc.datePosted
            ? formatDateCustom(cacheDoc.datePosted)
            : formatDateCustom(cacheDoc.ingestedAtMillis || Date.now()),
          date_closing: closesDate
            ? formatDateCustom(closesDate)
            : 'Rolling',
          status: cacheDoc.status,
          schoolId: cacheDoc.schoolId,
          schoolName: cleanSchoolName(cacheDoc.schoolName),
          schoolRating: cacheDoc.schoolRating ?? 0,
          curriculum: cacheDoc.curriculum || 'British',
          city: cacheDoc.city || '',
          country: cacheDoc.country || '',
          savingsPotential,
          schoolWebsite: cacheDoc.schoolWebsite || '',
          paidInUSD: cacheDoc.paidInUSD,
          scrapedAtRaw: cacheDoc.ingestedAtMillis
            ? { seconds: Math.floor(cacheDoc.ingestedAtMillis / 1000) }
            : null,
          closesDateRaw: closesDate,
          isRollingDeadline: cacheDoc.isRollingDeadline ?? !closesDate,
        });
      });

      return jobsList;
    }

    // ── ADMIN STAGING TAB: reads from subcollections (source of truth) ────────
    if (!adminJobsData || adminJobsData.length === 0) return [];

    adminJobsData.forEach((jobDoc: any) => {
      const schoolId = jobDoc.ref?.parent?.parent?.id;
      if (!schoolId) return;
      const school = schoolsMap[schoolId];

      const rawStatus = String(jobDoc.status || '').toUpperCase();
      if (rawStatus === 'CLOSED' || rawStatus === 'EXPIRED' || rawStatus === 'REJECTED') return;

      const cycle = String(jobDoc.recruitmentCycle || '').toUpperCase();
      if (cycle === 'HISTORIC_Y1' || cycle.startsWith('HISTORIC')) return;

      let closesDate: Date | null = null;
      if (jobDoc.closingDate?.seconds) {
        closesDate = new Date(jobDoc.closingDate.seconds * 1000);
      } else if (jobDoc.closingDate) {
        closesDate = new Date(jobDoc.closingDate);
      } else if (jobDoc.date_closing) {
        const parsed = parseClosingDate(jobDoc.date_closing);
        closesDate = parsed.closingDate;
      }
      if (closesDate && !isNaN(closesDate.getTime()) && closesDate.getTime() < todayMs) return;

      const jobKey = `${schoolId}_${(jobDoc.title || '').toLowerCase().trim()}`;
      if (seenJobKeys.has(jobKey)) return;
      seenJobKeys.add(jobKey);

      const rawSourceUrl = jobDoc.applyUrl || jobDoc.source_url || '';
      const lowerTitle = (jobDoc.title || '').toLowerCase();
      let department = jobDoc.department || 'Secondary';
      if (lowerTitle.includes('primary') || lowerTitle.includes('prep') || lowerTitle.includes('early years') ||
          lowerTitle.includes('eyfs') || lowerTitle.includes('kindergarten') || lowerTitle.includes('ks1')) {
        department = 'Primary';
      } else if (lowerTitle.includes('head') || lowerTitle.includes('director') || lowerTitle.includes('principal') ||
          lowerTitle.includes('coordinator')) {
        department = 'Leadership';
      }

      jobsList.push({
        id: jobDoc.id || schoolId + '_' + Math.random().toString(36).substring(2, 7),
        title: jobDoc.title || 'Teaching Vacancy',
        department,
        source: jobDoc.sourceName || jobDoc.source || 'Official Source',
        source_url: rawSourceUrl,
        date_listed: jobDoc.scrapedAt
          ? new Date(jobDoc.scrapedAt.seconds ? jobDoc.scrapedAt.seconds * 1000 : jobDoc.scrapedAt).toLocaleDateString()
          : (jobDoc.date_listed || null),
        date_closing: closesDate
          ? formatDateCustom(closesDate)
          : 'Rolling',
        status: jobDoc.status || 'pending_review',
        schoolId: schoolId,
        schoolName: school?.schoolname || school?.name || jobDoc.schoolName || '',
        schoolRating: parseFloat(school?.academicscore || school?.rating || '0'),
        curriculum: school?.curriculum || 'British',
        city: school?.city || jobDoc.city || '',
        country: school?.country || jobDoc.country || '',
        savingsPotential: 0, // Not pre-computed for pending — admin reviews raw data
        schoolWebsite: school?.website || '',
        paidInUSD: school?.paidInUSD,
        scrapedAtRaw: jobDoc.scrapedAt,
        closesDateRaw: closesDate,
        isRollingDeadline: jobDoc.isRollingDeadline ?? !closesDate,
      });
    });

    return jobsList;
  }, [cacheData, adminJobsData, schoolsMap, familyStatus, activeTab, colData]);

  // Derived filters data
  const availableCurriculums = useMemo(() => {
    const list = allJobs.map(j => j.curriculum);
    return Array.from(new Set(list)).filter(Boolean).sort();
  }, [allJobs]);

  // Public job count for admin tab badge (raw cache size, not filtered)
  // Public job count for admin tab badge (raw cache size, not filtered)
  const publicJobsCount = allJobs.length;

  // Search Engine Protocol counts for header buttons
  const engineCounts = useMemo(() => {
    let tes = 0;
    let nae = 0;
    let grc = 0;
    let inspired = 0;
    allJobs.forEach(job => {
      const jobSrcUpper = String(job.source || "").toUpperCase();
      const sourcesUpper = (job.sources || [job.source]).map((s) => String(s || "").toUpperCase());
      if (jobSrcUpper === "TES" || sourcesUpper.includes("TES")) tes++;
      if (jobSrcUpper === "NORD ANGLIA" || sourcesUpper.includes("NORD ANGLIA")) nae++;
      if (jobSrcUpper === "GRC" || sourcesUpper.includes("GRC")) grc++;
      if (jobSrcUpper.includes("INSPIRED") || sourcesUpper.some((s) => String(s || "").toUpperCase().includes("INSPIRED"))) inspired++;
    });
    return { ALL: allJobs.length, TES: tes, "NORD ANGLIA": nae, GRC: grc, INSPIRED: inspired };
  }, [allJobs]);



  const availableSubjects = [
    "Maths", "Science", "Physics", "Chemistry", "Biology", 
    "English", "History", "Geography", "Art", "Music", 
    "Primary", "Leadership", "Computing"
  ];

  // Filter Logic
  const filteredJobs = useMemo(() => {
    return allJobs.filter(job => {
      // Search text query (matches title, school, city, country)
      const matchesQuery = 
        normalize(job.title).includes(normalize(searchQuery)) ||
        normalize(job.schoolName).includes(normalize(searchQuery)) ||
        normalize(job.city).includes(normalize(searchQuery)) ||
        normalize(job.country).includes(normalize(searchQuery));
      if (!matchesQuery) return false;

      // Curriculum match
      if (selectedCurriculums.length > 0 && !selectedCurriculums.includes(job.curriculum)) {
        return false;
      }

      // Subject tags match
      if (selectedSubjects.length > 0) {
        const matchesSubject = selectedSubjects.some(sub => 
          normalize(job.title).includes(normalize(sub)) || 
          normalize(job.department).includes(normalize(sub))
        );
        if (!matchesSubject) return false;
      }

      // Minimum Savings Potential match
      if (job.savingsPotential < minSavings) return false;

      // Minimum Rating match
      if (job.schoolRating < minRating) return false;

      // Search Engine Protocol Filter
      if (selectedSourceEngine !== "ALL") {
        const jobSrcUpper = String(job.source || "").toUpperCase();
        const sourcesUpper = (job.sources || [job.source]).map((s) => String(s || "").toUpperCase());
        const hasTes = jobSrcUpper === "TES" || sourcesUpper.includes("TES");
        const hasNae = jobSrcUpper === "NORD ANGLIA" || sourcesUpper.includes("NORD ANGLIA");
        const hasGrc = jobSrcUpper === "GRC" || sourcesUpper.includes("GRC");
        const hasInspired = jobSrcUpper.includes("INSPIRED") || sourcesUpper.some((s) => String(s || "").toUpperCase().includes("INSPIRED"));
        if (selectedSourceEngine === "TES" && !hasTes) return false;
        if (selectedSourceEngine === "NORD ANGLIA" && !hasNae) return false;
        if (selectedSourceEngine === "GRC" && !hasGrc) return false;
        if (selectedSourceEngine === "INSPIRED" && !hasInspired) return false;
      }

      return true;
    });
  }, [allJobs, searchQuery, selectedCurriculums, selectedSubjects, minSavings, minRating, selectedSourceEngine]);

  // Sort Logic
  const sortedJobs = useMemo(() => {
    const jobs = [...filteredJobs];
    if (sortBy === "Projected Savings") {
      return jobs.sort((a, b) => b.savingsPotential - a.savingsPotential);
    } else if (sortBy === "School Score") {
      return jobs.sort((a, b) => b.schoolRating - a.schoolRating);
    } else if (sortBy === "Most recent") {
      return jobs.sort((a, b) => {
        const dateA = a.date_listed ? new Date(a.date_listed).getTime() : 0;
        const dateB = b.date_listed ? new Date(b.date_listed).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sortBy === "Oldest (by closing date)") {
      return jobs.sort((a, b) => {
        if (!a.date_closing) return 1;
        if (!b.date_closing) return -1;
        return new Date(a.date_closing).getTime() - new Date(b.date_closing).getTime();
      });
    }
    return jobs;
  }, [filteredJobs, sortBy]);

  // Toggle Filters helper
  const handleCurriculumToggle = (cur: string) => {
    setSelectedCurriculums(prev => 
      prev.includes(cur) ? prev.filter(c => c !== cur) : [...prev, cur]
    );
  };

  const handleSubjectToggle = (sub: string) => {
    setSelectedSubjects(prev => 
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-4 md:p-8 lg:p-12 font-sans selection:bg-[#d95f02]">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-6 gap-4">
          <div className="space-y-2">
            <div className="brand-title text-2xl md:text-3xl font-sans font-bold tracking-wide">
              <span className="brand-orange text-[#FF6B35]">Leopardfish</span><span className="brand-blue text-[#0073E6]">Intel</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase italic leading-none text-white">
              Featured Vacancies
            </h1>
            <p className="text-sm text-slate-300 font-normal leading-relaxed max-w-3xl">
              We curate active international school jobs across the globe and break down the real numbers—tax-adjusted pay, local living costs, and net savings—so you know exactly what your package is worth before you apply.
            </p>
          </div>
          
          <div className="flex gap-3">
            {calculatedIsAdmin && (
              <>
                <button
                  onClick={handleRunFullSweep}
                  disabled={isSweeping}
                  className="bg-[#D96B27]/10 hover:bg-[#D96B27] border border-[#D96B27]/30 text-[#D96B27] hover:text-white px-4 py-2 text-xs font-black uppercase tracking-wider transition-all rounded-sm flex items-center gap-1.5"
                >
                  {isSweeping ? (
                    <>
                      <Loader2 className="animate-spin size-3.5" /> Sweeping
                    </>
                  ) : (
                    <>
                      <RefreshCw className="size-3.5" /> Run DB Sweep + Janitor
                    </>
                  )}
                </button>

                <div className="flex bg-[#0b1224] border border-white/10 p-1 rounded-sm">
                  <button
                    onClick={() => setActiveTab('public')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1",
                      activeTab === 'public' ? "bg-[#FF6B35] text-white" : "text-slate-400 hover:text-white"
                    )}
                  >
                    Live Feed ({publicJobsCount})
                  </button>
                  <button
                    onClick={() => setActiveTab('admin_staging')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1",
                      activeTab === 'admin_staging' ? "bg-[#FF6B35] text-white" : "text-slate-400 hover:text-white"
                    )}
                  >
                    Pending ({adminJobsData?.length || 0})
                  </button>
                </div>
              </>
            )}
            
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden flex items-center gap-2 bg-[#0b1224] border border-white/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-[#FF6B35]"
            >
              <SlidersHorizontal className="size-4" />
              Filters ({selectedCurriculums.length + selectedSubjects.length + (minSavings > 0 ? 1 : 0) + (minRating > 0 ? 1 : 0)})
            </button>
          </div>
        </div>

        {/* Debug errors */}
        {(errorSchools || errorPublic || errorAdmin) && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-sm text-red-400 text-xs font-mono space-y-1">
            <h4 className="font-bold uppercase">Uplink Database Warnings:</h4>
            {errorSchools && <p>Schools Error: {errorSchools.message}</p>}
            {errorPublic && <p>Cache Feed Error: {errorPublic.message}</p>}
            {errorAdmin && <p>Pending Jobs Error: {errorAdmin.message}</p>}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* FILTER SIDEBAR */}
          <aside className={cn(
            "w-full md:w-80 shrink-0 bg-[#0b1224]/80 border border-white/5 p-6 rounded-sm shadow-2xl relative space-y-8 backdrop-blur-md transition-all duration-300 md:block",
            sidebarOpen ? "block" : "hidden"
          )}>
            <div className="absolute top-0 left-0 w-1 h-full bg-[#d95f02]/30" />
            
            {/* Search Input */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Search className="size-3.5" /> Text Query
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Title, school, country..."
                  className="w-full bg-black/40 border border-white/10 text-white rounded-md h-11 pl-4 pr-10 text-sm focus:border-[#FF6B35] outline-none"
                />
              </div>
            </div>

            {/* Family Status Filter */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Users className="size-3.5" /> Family Status
              </label>
              <select 
                value={familyStatus}
                onChange={(e) => setFamilyStatus(e.target.value)}
                className="w-full bg-black/40 border border-white/10 text-white rounded-md h-11 px-4 text-sm focus:border-[#FF6B35] outline-none font-bold"
              >
                <option value="Single">Single</option>
                <option value="Married (sole earner)">Married (sole earner)</option>
                <option value="Married (dual income)">Married (dual income)</option>
                <option value="Family +1">Family +1 Child</option>
                <option value="Family +2">Family +2 Children</option>
                <option value="Family +3">Family +3+ Children</option>
              </select>
            </div>

            {/* Savings Potential Filter */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Coins className="size-3.5" /> Est. Savings Potential
              </label>
              <select 
                value={minSavings}
                onChange={(e) => setMinSavings(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 text-white rounded-md h-11 px-4 text-sm focus:border-[#FF6B35] outline-none font-bold"
              >
                <option value={0}>Any Savings</option>
                <option value={500}>Min $500 / mo</option>
                <option value={1000}>Min $1,000 / mo</option>
                <option value={1500}>Min $1,500 / mo</option>
                <option value={2000}>Min $2,000 / mo</option>
                <option value={2500}>Min $2,500 / mo</option>
              </select>
            </div>



            {/* Curriculum Filter */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <BookOpen className="size-3.5" /> Curriculum
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableCurriculums.map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => handleCurriculumToggle(cur)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all uppercase",
                      selectedCurriculums.includes(cur)
                        ? "bg-[#0073E6]/20 border-[#0073E6] text-[#0073E6]"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                    )}
                  >
                    {cur}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Filter */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <GraduationCap className="size-3.5" /> Common Subjects
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableSubjects.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => handleSubjectToggle(sub)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all",
                      selectedSubjects.includes(sub)
                        ? "bg-[#D96B27]/20 border-[#D96B27] text-[#D96B27]"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                    )}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Filters */}
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCurriculums([]);
                setSelectedSubjects([]);
                setMinSavings(0);
                setMinRating(0);
                setFamilyStatus("Single");
                setSortBy("Projected Savings");
              }}
              className="w-full h-11 border border-white/10 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white hover:border-white/20 transition-all rounded-md"
            >
              Reset Filters
            </button>
          </aside>

          {/* MAIN JOBS FEED */}
          <main className="flex-1 w-full space-y-6">
            
            {/* Loading States */}
            {(loadingPublicJobs || (calculatedIsAdmin && loadingAdminJobs)) && (
              <div className="h-96 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin size-10 text-[#FF6B35]" />
                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Compiling Active Listings...</p>
              </div>
            )}

            {/* Search Engine Selection Protocol Control Bar */}
            {!(loadingPublicJobs || loadingAdminJobs) && (
              <div className="bg-[#1e293b]/90 border border-slate-700/60 p-3.5 rounded-md mb-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xl">
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: "ALL", label: `All Vacancies (${engineCounts.ALL})` },
                    { id: "TES", label: `TES (${engineCounts.TES})` },
                    { id: "NORD ANGLIA", label: `Nord Anglia (${engineCounts["NORD ANGLIA"]})` },
                    { id: "GRC", label: `GRC Search (${engineCounts.GRC})` },
                    { id: "INSPIRED", label: `Inspired Edu (${engineCounts.INSPIRED || 0})` }
                  ].map((engine) => (
                    <button
                      key={engine.id}
                      type="button"
                      onClick={() => setSelectedSourceEngine(engine.id)}
                      className={cn(
                        "px-4 py-2 rounded-md text-xs font-black transition-all uppercase tracking-wider flex items-center gap-2 border shadow-sm cursor-pointer",
                        selectedSourceEngine === engine.id
                          ? "bg-[#FF6B35] border-[#FF6B35] text-white shadow-md shadow-[#FF6B35]/20"
                          : "bg-black/40 border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-800/60"
                      )}
                    >
                      {engine.id === "TES" && <span className="size-2 rounded-full bg-indigo-400 animate-pulse" />}
                      {engine.id === "NORD ANGLIA" && <span className="size-2 rounded-full bg-amber-400 animate-pulse" />}
                      {engine.id === "GRC" && <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />}
                      {engine.id === "INSPIRED" && <span className="size-2 rounded-full bg-purple-400 animate-pulse" />}
                      {engine.id === "ALL" && <span className="size-2 rounded-full bg-emerald-400" />}
                      {engine.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sort & Count Header */}
            {!(loadingPublicJobs || loadingAdminJobs) && filteredJobs.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#0b1224]/50 border border-white/5 p-4 rounded-sm gap-4 w-full">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Showing {filteredJobs.length} active vacancies
                  </span>
                  
                  <span className="text-slate-700">|</span>
                  
                  {isSyncingAll ? (
                    <span className="flex items-center gap-1.5 text-xs text-[#FF6B35] font-black uppercase tracking-wider">
                      <Loader2 className="animate-spin size-3.5" /> Syncing Listings
                    </span>
                  ) : (
                    <button
                      onClick={handleSyncAllVisible}
                      className="text-xs text-[#FF6B35] hover:text-white font-black uppercase tracking-wider transition-colors flex items-center gap-1.5"
                      title="Force refresh vacancies for all currently listed schools"
                    >
                      Verify & Sync Listings
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sort By:</span>
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-black/40 border border-white/10 text-white rounded-md h-9 px-3 text-xs focus:border-[#FF6B35] outline-none font-bold cursor-pointer"
                  >
                    <option value="Projected Savings">Projected Savings</option>
                    <option value="School Score">School Score</option>
                    <option value="Most recent">Most Recent</option>
                    <option value="Oldest (by closing date)">Oldest (by closing date)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!(loadingPublicJobs || loadingAdminJobs) && filteredJobs.length === 0 && (
              <div className="bg-[#0b1224]/50 border border-white/5 p-12 text-center rounded-sm space-y-6">
                <AlertCircle className="size-12 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white uppercase tracking-tight">No Active Vacancies</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    No active vacancies currently match your search filters.
                  </p>
                </div>

                {/* Scan School for vacancies if they exist in DB but aren't scanned */}
                {searchQuery.trim().length > 0 && schoolsData && (
                  (() => {
                    const queryLower = searchQuery.toLowerCase();
                    const unscannedSchools = schoolsData.filter((school: any) => {
                      const name = (school.schoolname || "").toLowerCase();
                      const city = (school.city || "").toLowerCase();
                      const country = (school.country || "").toLowerCase();
                      const matches = name.includes(queryLower) || city.includes(queryLower) || country.includes(queryLower);
                      
                      const hasJobs = Array.isArray(school.scrapedJobsList) && school.scrapedJobsList.length > 0;
                      return matches && !hasJobs;
                    });

                    if (unscannedSchools.length === 0) return null;

                    return (
                      <div className="border-t border-white/5 pt-6 space-y-3 text-left max-w-lg mx-auto">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
                          We found matching schools in our registry. Scan them for live jobs:
                        </h4>
                        <div className="space-y-2.5">
                          {unscannedSchools.slice(0, 5).map((school: any) => (
                            <div key={school.id} className="flex justify-between items-center bg-black/30 border border-white/5 px-4 py-2.5 rounded-sm">
                              <div>
                                <p className="text-xs font-bold text-white leading-tight">{school.schoolname}</p>
                                <p className="text-[10px] text-slate-500">{school.city}, {school.country}</p>
                              </div>
                              {refreshingSchools[school.id] || school.revalidationStatus === 'syncing' ? (
                                <span className="flex items-center gap-1 text-[10px] text-[#FF6B35] font-bold uppercase">
                                  <Loader2 className="animate-spin size-3" /> Syncing
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleRefreshSchool(school.id, school.schoolname, school.city || "", school.country || "")}
                                  className="text-[10px] bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/30 hover:bg-[#FF6B35] hover:text-white px-3 py-1 rounded-sm font-black uppercase tracking-wider transition-all"
                                >
                                  Scan School
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            )}

            {/* Jobs Grid */}
            {!(loadingPublicJobs || loadingAdminJobs) && filteredJobs.length > 0 && (
              <div className="grid grid-cols-1 gap-6">
                {sortedJobs.map((job, idx) => (
                  <div 
                    key={job.schoolId + "-" + job.title + "-" + idx}
                    className="bg-[#243147] border border-[#334155] px-6 py-4 rounded-sm shadow-md relative hover:border-[#FF6B35]/30 transition-all duration-300 group flex flex-col justify-between space-y-3"
                  >
                    {/* Top Accents */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#38BDF8]/20 group-hover:bg-[#FF6B35]/60 transition-all duration-300" />
                    
                    {/* Top Header Block */}
                    <div className="flex justify-between items-start w-full gap-4">
                      {/* Left Header Title & Subheader */}
                      <div className="space-y-1 text-left flex-1">
                        <h3 className="text-lg font-bold tracking-tight text-[#F8FAFC] leading-tight flex flex-wrap items-center gap-2">
                          <a 
                            href={job.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[#FF6B35] transition-colors duration-200 cursor-pointer"
                            title="View official vacancy listing (opens in new tab)"
                          >
                            {job.title}
                          </a>
                          {job.schoolId.startsWith('AGNT') && (
                            <span className="bg-purple-500/10 border border-purple-500/30 text-purple-300 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-sm flex items-center gap-1">
                              🏷️ School Agent Placement
                            </span>
                          )}
                          {activeTab === 'admin_staging' && (
                            <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-sm">
                              Pending Review
                            </span>
                          )}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 font-medium">
                          <span className="text-sm font-semibold text-[#38BDF8] tracking-tight flex items-center gap-1">
                            <Building className="size-3.5" /> {job.schoolName}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3.5" /> {job.city}, {job.country}
                          </span>
                          <span>•</span>
                          <span className="bg-white/5 border border-white/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-sm text-slate-400">
                            [{job.curriculum}]
                          </span>
                        </div>
                      </div>

                      {/* Right Header Deadline & Leopardfish ID */}
                      <div className="flex flex-col items-end shrink-0 pt-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                          <Calendar className="size-3.5 text-[#FF6B35]" />
                          {activeTab === 'admin_staging' ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Closes:</span>
                              <input
                                type="date"
                                value={
                                  job.closesDateRaw
                                    ? job.closesDateRaw.toISOString().substring(0, 10)
                                    : ""
                                }
                                onChange={(e) => handleUpdateClosingDate(job.schoolId, job.id, e.target.value)}
                                className="bg-black/60 border border-white/10 text-white rounded px-2 py-0.5 text-[10px] focus:border-[#FF6B35] outline-none font-bold cursor-pointer"
                              />
                            </div>
                          ) : (
                            <span>{job.closesDateRaw ? `Closes: ${job.date_closing}` : `Added: ${job.date_listed || "Recently"}`}</span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 font-bold tracking-wider mt-0.5">
                          {getJobCardReference(job)}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/5 my-1" />

                    {/* Bottom Metrics & Actions Block */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full pt-1">
                      {/* Left Column: Badges & Metric Pills */}
                      <div className="flex flex-wrap items-center justify-start gap-2.5">
                        {/* NEW, CLOSING SOON & Search Engine Source Badges */}
                        {(() => {
                          const now = new Date();
                          
                          let isNew = false;
                          if (job.scrapedAtRaw) {
                            const scrapedTime = job.scrapedAtRaw.seconds 
                              ? job.scrapedAtRaw.seconds * 1000 
                              : new Date(job.scrapedAtRaw).getTime();
                            if ((now.getTime() - scrapedTime) <= 3 * 24 * 60 * 60 * 1000) {
                              isNew = true;
                            }
                          }

                          let isClosingSoon = false;
                          if (job.closesDateRaw) {
                            const closesTime = job.closesDateRaw.getTime();
                            const diffTime = closesTime - now.getTime();
                            if (diffTime > 0 && diffTime <= 5 * 24 * 60 * 60 * 1000) {
                              isClosingSoon = true;
                            }
                          }

                          return (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isNew && (
                                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-sm animate-pulse">
                                  NEW
                                </span>
                              )}

                              {/* Multi-Engine Dual Source Badges */}
                              {(job.sources && job.sources.length > 0 ? job.sources : [job.source]).map((src) => {
                                const srcUpper = String(src).toUpperCase();
                                const srcUrl = (job.sourceUrls && job.sourceUrls[src]) || job.source_url;
                                return (
                                  <a
                                    key={src}
                                    href={srcUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                      "px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-sm border transition-all cursor-pointer flex items-center gap-1 hover:scale-105",
                                      srcUpper === "NORD ANGLIA"
                                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                                        : srcUpper === "GRC"
                                        ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                                        : "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20"
                                    )}
                                    title={`Open official ${src} vacancy link (opens in new tab)`}
                                  >
                                    {src} ↗
                                  </a>
                                );
                              })}

                              {isClosingSoon && (
                                <span className="bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-sm">
                                  CLOSING SOON
                                </span>
                              )}

                              {(job.isRollingDeadline || !job.closesDateRaw) && (
                                <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-sm flex items-center gap-1">
                                  <Clock className="size-2.5" /> ROLLING DEADLINE
                                </span>
                              )}
                            </div>
                          );
                        })()}

                        {/* Estimated Savings Pill */}
                        <span 
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/20 border border-white/5 rounded-full text-xs font-bold text-[#FF6B35] shrink-0"
                        >
                          <Coins className="size-3" />
                          <span>${job.savingsPotential.toLocaleString()}/mo Est. Savings</span>
                        </span>

                        {/* Volatile Market Guardrails visual badge */}
                        {(job.country === "Argentina") && !job.paidInUSD && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-bold text-amber-500 shrink-0">
                            ⚠️ Volatile Market (0.25x Surplus Applied)
                          </span>
                        )}
                      </div>

                      {/* Right Column: CTA or Admin Controls */}
                      <div className="shrink-0 flex items-center gap-2">
                        {activeTab === 'admin_staging' ? (
                          <>
                            <button
                              onClick={() => handleApproveJob(job.schoolId, job.id)}
                              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-green-500 hover:text-white hover:bg-green-500 border border-green-500 px-3 py-2 rounded-sm transition-all"
                              title="Approve job listing and publish to live feed"
                            >
                              <Check className="size-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleRemoveJob(job.schoolId, job.id)}
                              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-rose-500 hover:text-white hover:bg-rose-500 border border-rose-500 px-3 py-2 rounded-sm transition-all"
                              title="Reject job listing (soft delete)"
                            >
                              <Trash2 className="size-3.5" /> Remove
                            </button>
                            <button
                              onClick={() => handleRefreshSchool(job.schoolId, job.schoolName, job.city, job.country)}
                              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#38BDF8] hover:text-white hover:bg-[#38BDF8] border border-[#38BDF8] px-3 py-2 rounded-sm transition-all"
                              title="Force sync live sweep in background"
                            >
                              <RefreshCw className="size-3.5" /> Force Sync
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            {calculatedIsAdmin && (
                              <button
                                onClick={() => handleMoveToPending(job.schoolId, job.id)}
                                className="inline-flex items-center justify-center p-2 text-amber-400 hover:text-white hover:bg-amber-500/20 border border-amber-400/40 rounded-sm transition-all cursor-pointer"
                                title="Unpublish from live feed and move to Staging / Pending Review"
                              >
                                <Clock className="size-4" />
                              </button>
                            )}
                            <a 
                              href={`/financial-forecaster?schoolId=${job.schoolId}&jobId=${job.id}&jobTitle=${encodeURIComponent(job.title)}&department=${encodeURIComponent(job.department || '')}&curriculum=${encodeURIComponent(job.curriculum || '')}&applyUrl=${encodeURIComponent(job.source_url || (job as any).applyUrl || '')}&closesDate=${encodeURIComponent(job.date_closing || '')}&savingsPotential=${job.savingsPotential || 0}&schoolRating=${job.schoolRating || ''}&source=${encodeURIComponent(job.source || '')}&city=${encodeURIComponent(job.city || '')}&country=${encodeURIComponent(job.country || '')}`}
                              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#FF6B35] hover:text-white hover:bg-[#FF6B35] border border-[#FF6B35] px-3.5 py-2 rounded-sm transition-all shadow-[0_0_10px_rgba(255,107,53,0.05)]"
                            >
                            Evaluate Opportunity
                            <ArrowUpRight className="size-3.5" />
                          </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
          </main>
        </div>
      </div>
    </div>
  );
}
