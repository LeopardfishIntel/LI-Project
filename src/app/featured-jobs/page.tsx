"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  Search, SlidersHorizontal, MapPin, Calendar, Building, Star, BookOpen, 
  Coins, GraduationCap, ArrowUpRight, Loader2, AlertCircle, Users
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useAuth, db } from '@/firebase';
import { useTeacher } from '@/firebase/firestore/use-teacher';
import { collection, doc, updateDoc, collectionGroup, query, where } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { canonicalCountry } from '@/lib/calculations';

// A helper to normalize strings for matching
const normalize = (str: string) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, '').trim();

// A helper to parse salary numbers (e.g., "$4,150.00" -> 4150)
const parseSalary = (val: any): number => {
  if (!val) return 0;
  const str = String(val).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

interface StructuredJob {
  title: string;
  department: string;
  source: string;
  source_url: string;
  date_listed: string | null;
  date_closing: string | null;
  status: string;
  schoolId: string;
  schoolName: string;
  schoolRating: number; // based on academic score
  curriculum: string;
  city: string;
  country: string;
  savingsPotential: number; // calculated USD/month
  schoolWebsite: string;
}

export default function FeaturedJobsPage() {
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const { data: teacherProfile } = useTeacher(user?.uid || "");

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
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

  // Fetch Firestore Data (Collection Group Query)
  const schoolsQuery = useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'schools') : null), [firestore, mounted]);
  const jobsQuery = useMemoFirebase(() => (mounted && firestore ? query(collectionGroup(firestore, 'jobs'), where('status', '==', 'active')) : null), [firestore, mounted]);
  const colQuery = useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'locations_costOfLiving') : null), [firestore, mounted]);

  const { data: schoolsData, isLoading: loadingSchools } = useCollection<any>(schoolsQuery);
  const { data: jobsData, isLoading: loadingJobs } = useCollection<any>(jobsQuery);
  const { data: colData, isLoading: loadingCol } = useCollection<any>(colQuery);

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

  // Process & Extract Open Vacancies from all schools
  const allJobs = useMemo(() => {
    if (!jobsData || !schoolsData || schoolsData.length === 0) return [];

    const jobsList: StructuredJob[] = [];
    const today = new Date();

    jobsData.forEach((jobDoc: any) => {
      const jobData = jobDoc;
      const schoolId = jobDoc.ref?.parent?.parent?.id;
      if (!schoolId) return;

      const school = schoolsMap[schoolId];
      if (!school) return;

      // Extract closing date
      let closesDate: Date | null = null;
      if (jobData.closingDate) {
        if (jobData.closingDate.seconds) {
          closesDate = new Date(jobData.closingDate.seconds * 1000);
        } else {
          closesDate = new Date(jobData.closingDate);
        }
      }

      // Filter: Keep ONLY currently open/active jobs
      if (closesDate && closesDate < today) return;
      if (jobData.status === 'expired') return;

      // Match Cost of Living for this school to estimate savings potential
      const sCity = normalize(school.city || school.town || school.location || "");
      const sCountry = canonicalCountry(school.country || school.region || "");
      
      const matchedCol = colData ? colData.find((c: any) =>
        normalize(c.city || c.city_name) === sCity ||
        canonicalCountry(c.country || '') === sCountry ||
        normalize(c.id) === sCity || normalize(c.id) === sCountry
      ) : null;

      // Match Family status scaling multiplier
      let rentKey = "rent1br";
      let scalar = 1.0;
      
      if (familyStatus === "Single") {
        rentKey = "rent1br";
        scalar = 1.0;
      } else if (familyStatus === "Married (sole earner)" || familyStatus === "Married (dual income)") {
        rentKey = "rent2br";
        scalar = 1.9;
      } else if (familyStatus === "Family +1") {
        rentKey = "rent3br";
        scalar = 2.3;
      } else if (familyStatus === "Family +2") {
        rentKey = "rent3br";
        scalar = 2.65;
      } else if (familyStatus === "Family +3") {
        rentKey = "rent3br";
        scalar = 3.0;
      }

      // Savings Potential Calculation
      const baseSalary = parseSalary(school.salaryRange || school.salary || school.netbase);
      let rentCost = 0;
      let otherCost = 0;

      if (matchedCol) {
        const isProvided = String(school.housingprovision || "").toLowerCase().includes("provided") || school.housingProvided === true;
        rentCost = isProvided ? 0 : (matchedCol[rentKey] || 0);
        
        // Volatile Market Guardrails (e.g. Argentine Peso ARS)
        const isVolatile = school.country === "Argentina" || (school.currency && school.currency === "ARS");
        const paidInUSD = school.paidInUSD === true;
        const volatileMultiplier = (isVolatile && !paidInUSD) ? 0.25 : 1.0;

        otherCost = ((matchedCol.groceries || 0) + 
                    (matchedCol.utilities || 0) + 
                    (matchedCol.mobilePhone || 0) + 
                    (matchedCol.internet || 0) + 
                    (matchedCol.diningSocial || 0)) * scalar;
        
        // Outgoings Formula: Outgoings = (Base Living Cost * Family Status Multiplier) + Rent Expense
        const adjustedOutgoings = otherCost + rentCost;
        
        let calculatedSavings = Math.max(0, Math.round(baseSalary - adjustedOutgoings));
        calculatedSavings = Math.round(calculatedSavings * volatileMultiplier);

        // Determine department
        let department = "Secondary";
        const lowerTitle = jobData.title.toLowerCase();
        if (lowerTitle.includes("primary") || lowerTitle.includes("prep") || lowerTitle.includes("early years") || lowerTitle.includes("preschool") || lowerTitle.includes("kindergarten") || lowerTitle.includes("eyfs") || lowerTitle.includes("ks1") || lowerTitle.includes("class teacher")) {
          department = "Primary";
        } else if (lowerTitle.includes("head") || lowerTitle.includes("director") || lowerTitle.includes("principal") || lowerTitle.includes("coordinator")) {
          department = "Leadership";
        }

        jobsList.push({
          title: jobData.title,
          department,
          source: jobData.sourceName || "Web",
          source_url: jobData.applyUrl || school.website || ("https://www.google.com/search?q=" + encodeURIComponent(school.schoolname + ' jobs')),
          date_listed: jobData.scrapedAt ? new Date(jobData.scrapedAt.seconds * 1000).toLocaleDateString() : null,
          date_closing: closesDate ? closesDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "Rolling",
          status: jobData.status,
          schoolId: school.id,
          schoolName: school.schoolname,
          schoolRating: parseFloat(school.academicscore || school.rating || "0"),
          curriculum: school.curriculum || "British",
          city: school.city || "",
          country: school.country || "",
          savingsPotential: calculatedSavings,
          schoolWebsite: school.website || ""
        });
      }
    });

    return jobsList;
  }, [jobsData, schoolsData, colData, familyStatus, schoolsMap]);

  // Derived filters data
  const availableCurriculums = useMemo(() => {
    const list = allJobs.map(j => j.curriculum);
    return Array.from(new Set(list)).filter(Boolean).sort();
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

      return true;
    });
  }, [allJobs, searchQuery, selectedCurriculums, selectedSubjects, minSavings, minRating]);

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
            <p className="text-sm text-slate-400 font-medium">
              Live school vacancies processed and analyzed with active recruitment trackers.
            </p>
          </div>
          
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden flex items-center gap-2 bg-[#0b1224] border border-white/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-[#FF6B35]"
          >
            <SlidersHorizontal className="size-4" />
            Filters ({selectedCurriculums.length + selectedSubjects.length + (minSavings > 0 ? 1 : 0) + (minRating > 0 ? 1 : 0)})
          </button>
        </div>

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

            {/* School Rating Filter */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Star className="size-3.5" /> Minimum Academic Score
              </label>
              <div className="flex gap-2">
                {[0, 6, 7, 8, 9].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setMinRating(rating)}
                    className={cn(
                      "flex-1 py-2 text-xs font-bold border transition-all",
                      minRating === rating 
                        ? "bg-[#FF6B35] border-[#FF6B35] text-white" 
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                    )}
                  >
                    {rating === 0 ? "Any" : `${rating}+`}
                  </button>
                ))}
              </div>
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
            {(loadingSchools || loadingJobs || loadingCol) && (
              <div className="h-96 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin size-10 text-[#FF6B35]" />
                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Compiling Active Listings...</p>
              </div>
            )}

            {/* Sort & Count Header */}
            {!loadingSchools && !loadingJobs && !loadingCol && filteredJobs.length > 0 && (
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
            {!loadingSchools && !loadingJobs && !loadingCol && filteredJobs.length === 0 && (
              <div className="bg-[#0b1224]/50 border border-white/5 p-12 text-center rounded-sm space-y-6">
                <AlertCircle className="size-12 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white uppercase tracking-tight">No Active Vacancies Found</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    No active job listings match your current filters in the live database.
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
                              {refreshingSchools[school.id] ? (
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
            {!loadingSchools && !loadingJobs && !loadingCol && filteredJobs.length > 0 && (
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
                        <h3 className="text-lg font-bold tracking-tight text-[#F8FAFC] leading-tight">
                          {job.title}
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

                      {/* Right Header Deadline */}
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold shrink-0 pt-1">
                        <Calendar className="size-3.5 text-[#FF6B35]" />
                        <span>Closes: {job.date_closing || "Rolling"}</span>
                      </div>
                    </div>

                    <div className="border-t border-white/5 my-1" />

                    {/* Bottom Metrics & Actions Block */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full pt-1">
                      {/* Left Column: Source Link */}
                      <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center shrink-0">
                        SOURCE:&nbsp;
                        <a 
                          href={job.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-[#FF6B35] underline decoration-slate-600 hover:decoration-[#FF6B35] underline-offset-2 transition-colors duration-200"
                        >
                          {job.source.toUpperCase()}
                        </a>
                      </div>

                      {/* Center Column: Metric Pills */}
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <span 
                          title="Data Reliability & Completeness Score" 
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/20 border border-white/5 rounded-full text-xs font-bold text-white cursor-help shrink-0"
                        >
                          <Star className="size-3 text-amber-500 fill-amber-500" />
                          <span>{job.schoolRating ? `${job.schoolRating}/10` : "N/A"} Reliability</span>
                        </span>
                        
                        <span 
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/20 border border-white/5 rounded-full text-xs font-bold text-[#FF6B35] shrink-0"
                        >
                          <Coins className="size-3" />
                          <span>${job.savingsPotential.toLocaleString()}/mo Est. Savings</span>
                        </span>
                      </div>

                      {/* Right Column: CTA Button */}
                      <div className="shrink-0">
                        <a 
                          href={`/financial-forecaster?schoolId=${job.schoolId}`}
                          className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#FF6B35] hover:text-white hover:bg-[#FF6B35] border border-[#FF6B35] px-3.5 py-2 rounded-sm transition-all shadow-[0_0_10px_rgba(255,107,53,0.05)]"
                        >
                          Evaluate School
                          <ArrowUpRight className="size-3.5" />
                        </a>
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
