"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  Search, SlidersHorizontal, MapPin, Calendar, Building, Star, BookOpen, 
  Coins, GraduationCap, ArrowUpRight, Loader2, AlertCircle
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
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

// Reconstruct active vacancy details using the Staff Turnover Guide search protocols
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

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCurriculums, setSelectedCurriculums] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [minSavings, setMinSavings] = useState<number>(0);
  const [minRating, setMinRating] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Firestore Data
  const schoolsQuery = useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'schools') : null), [firestore, mounted]);
  const colQuery = useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'locations_costOfLiving') : null), [firestore, mounted]);

  const { data: schoolsData, isLoading: loadingSchools } = useCollection<any>(schoolsQuery);
  const { data: colData, isLoading: loadingCol } = useCollection<any>(colQuery);

  // Process & Extract Open Vacancies from all schools
  const allJobs = useMemo(() => {
    if (!schoolsData || schoolsData.length === 0) return [];

    const jobsList: StructuredJob[] = [];
    const today = new Date();

    schoolsData.forEach((school: any) => {
      const scrapedList = Array.isArray(school.scrapedJobsList) ? school.scrapedJobsList : [];
      if (scrapedList.length === 0) return;

      // Match Cost of Living for this school to estimate savings potential
      const sCity = normalize(school.city || school.town || school.location || "");
      const sCountry = canonicalCountry(school.country || school.region || "");
      
      const matchedCol = colData ? colData.find((c: any) =>
        normalize(c.city || c.city_name) === sCity ||
        canonicalCountry(c.country || '') === sCountry ||
        normalize(c.id) === sCity || normalize(c.id) === sCountry
      ) : null;

      // Savings Potential Calculation
      const baseSalary = parseSalary(school.salaryRange || school.salary || school.netbase);
      let rentCost = 0;
      let otherCost = 0;

      if (matchedCol) {
        const isProvided = String(school.housingprovision || "").toLowerCase().includes("provided");
        rentCost = isProvided ? 0 : (matchedCol.rent1br || 0);
        otherCost = (matchedCol.groceries || 0) + 
                    (matchedCol.utilities || 0) + 
                    (matchedCol.mobilePhone || 0) + 
                    (matchedCol.internet || 0) + 
                    (matchedCol.diningSocial || 0);
      } else {
        // Fallbacks
        rentCost = String(school.housingprovision || "").toLowerCase().includes("provided") ? 0 : 1200;
        otherCost = 800; // estimated standard cost of living
      }

      const calculatedSavings = Math.max(0, Math.round(baseSalary - rentCost - otherCost));

      // Parse individual vacancy strings
      scrapedList.forEach((jobStr: string) => {
        // Reconstruct structured data (similar to reconstructStructuredVacancies)
        const lastDashIdx = jobStr.lastIndexOf(' - ');
        let main = jobStr;
        let source = 'Web';
        if (lastDashIdx !== -1) {
          main = jobStr.substring(0, lastDashIdx).trim();
          source = jobStr.substring(lastDashIdx + 3).trim();
        }

        const parenIdx = main.indexOf('(');
        const rawTitle = parenIdx !== -1 ? main.substring(0, parenIdx).trim() : main.trim();
        let title = rawTitle.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();

        // Caps at 80 characters
        if (title.length > 80) title = title.substring(0, 80).trim();

        const parentheticalMatches = [...jobStr.matchAll(/\(([^)]+)\)/g)];
        let date_listed = '';
        let closesDate = '';
        if (parentheticalMatches.length > 0) {
          const dateParenthetical = parentheticalMatches.find(m => {
            const text = m[1].toLowerCase();
            return text.includes('posted:') || text.includes('closes:') || /202[4-7]|cycle/i.test(text);
          }) || parentheticalMatches[parentheticalMatches.length - 1];
          
          const content = dateParenthetical[1];
          const parts = content.split(';').map(s => s.trim());
          const postedPart = parts.find(p => p.toLowerCase().includes('posted:'));
          if (postedPart) date_listed = postedPart.replace(/posted:\s*/i, '').trim();
          const closesPart = parts.find(p => p.toLowerCase().includes('closes:'));
          if (closesPart) closesDate = closesPart.replace(/closes:\s*/i, '').trim();
        }

        // Status classification: check closing date
        let status = "OPEN";
        if (jobStr.toLowerCase().includes("closes:") && !jobStr.toLowerCase().includes("posted:")) {
          status = "CLOSED";
        }
        if (/202[4-5]|archive|cycle/i.test(jobStr)) {
          status = "CLOSED";
        }

        const date_listed_val = date_listed || "21 May 2026";
        const date_closing_val = closesDate || null;

        if (status === "OPEN" && date_closing_val) {
          const closes = new Date(date_closing_val);
          if (!isNaN(closes.getTime()) && closes < today) {
            status = "CLOSED";
          }
        }

        // Filter: Keep ONLY currently open jobs
        if (status !== "OPEN") return;

        // Determine department
        let department = "Secondary";
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes("primary") || lowerTitle.includes("prep") || lowerTitle.includes("early years") || lowerTitle.includes("preschool") || lowerTitle.includes("kindergarten") || lowerTitle.includes("eyfs") || lowerTitle.includes("ks1") || lowerTitle.includes("class teacher")) {
          department = "Primary";
        } else if (lowerTitle.includes("head") || lowerTitle.includes("director") || lowerTitle.includes("principal") || lowerTitle.includes("coordinator")) {
          department = "Leadership";
        }

        jobsList.push({
          title,
          department,
          source,
          source_url: school.website || `https://www.google.com/search?q=${encodeURIComponent(school.schoolname + ' jobs')}`,
          date_listed: date_listed_val,
          date_closing: date_closing_val,
          status,
          schoolId: school.id,
          schoolName: school.schoolname,
          schoolRating: parseFloat(school.academicscore || school.rating || "0"),
          curriculum: school.curriculum || "British",
          city: school.city || "",
          country: school.country || "",
          savingsPotential: calculatedSavings,
          schoolWebsite: school.website || ""
        });
      });
    });

    // Sort by closing date nearest first
    return jobsList.sort((a, b) => {
      if (!a.date_closing) return 1;
      if (!b.date_closing) return -1;
      return new Date(a.date_closing).getTime() - new Date(b.date_closing).getTime();
    });
  }, [schoolsData, colData]);

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
                        ? "bg-[#D96B27]/20 border-[#D96B27] text-[#FF6B35]"
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
              }}
              className="w-full h-11 border border-white/10 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white hover:border-white/20 transition-all rounded-md"
            >
              Reset Filters
            </button>
          </aside>

          {/* MAIN JOBS FEED */}
          <main className="flex-1 w-full space-y-6">
            
            {/* Loading States */}
            {(loadingSchools || loadingCol) && (
              <div className="h-96 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin size-10 text-[#FF6B35]" />
                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Compiling Active Listings...</p>
              </div>
            )}

            {/* Empty State */}
            {!loadingSchools && !loadingCol && filteredJobs.length === 0 && (
              <div className="bg-[#1E293B] border border-[#334155] p-12 text-center rounded-sm space-y-4">
                <AlertCircle className="size-12 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white uppercase tracking-tight">No Vacancies Spotted</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    No active job listings match your current filters. Try relaxing savings thresholds or broadening the subject selections.
                  </p>
                </div>
              </div>
            )}

            {/* Jobs Grid */}
            {!loadingSchools && !loadingCol && filteredJobs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredJobs.map((job, idx) => (
                  <div 
                    key={job.schoolId + "-" + job.title + "-" + idx}
                    className="bg-[#1E293B] border border-[#334155] p-6 rounded-sm shadow-xl relative hover:border-[#FF6B35]/30 transition-all duration-300 group flex flex-col justify-between space-y-6"
                  >
                    {/* Top Accents */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#38BDF8]/20 group-hover:bg-[#FF6B35]/60 transition-all duration-300" />
                    
                    <div className="space-y-4">
                      {/* Top Badges & Meta */}
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/10 px-2.5 py-1 text-slate-400 rounded-sm">
                          {job.curriculum}
                        </span>
                        
                        {/* Closing date */}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                          <Calendar className="size-3.5 text-[#FF6B35]" />
                          <span>Closes: {job.date_closing || "Rolling"}</span>
                        </div>
                      </div>

                      {/* Job Title & School Name */}
                      <div className="space-y-2 text-left">
                        <h3 className="text-xl font-bold tracking-tight text-[#F8FAFC] leading-tight">
                          {job.title}
                        </h3>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-[#38BDF8] tracking-tight flex items-center gap-1.5">
                            <Building className="size-3.5" /> {job.schoolName}
                          </span>
                          <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                            <MapPin className="size-3.5" /> {job.city}, {job.country}
                          </span>
                        </div>
                      </div>

                      {/* School Scoring */}
                      <div className="grid grid-cols-2 gap-4 bg-black/20 p-3 rounded-md text-left">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">School Score</span>
                          <div className="flex items-center gap-1 text-xs font-bold text-white">
                            <Star className="size-3 text-amber-500 fill-amber-500" />
                            <span>{job.schoolRating ? `${job.schoolRating}/10` : "N/A"}</span>
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Est. Savings</span>
                          <div className="flex items-center gap-1 text-xs font-bold text-[#FF6B35]">
                            <Coins className="size-3" />
                            <span>${job.savingsPotential.toLocaleString()} / mo</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="flex justify-between items-center pt-4 border-t border-white/5 gap-2">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        Source: {job.source}
                      </span>
                      
                      <a 
                        href={`/financial-forecaster?schoolId=${job.schoolId}`}
                        className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#FF6B35] hover:text-white hover:bg-[#d95f02] border border-[#d95f02] px-3.5 py-2 rounded-sm transition-all shadow-[0_0_10px_rgba(255,107,53,0.05)]"
                      >
                        Evaluate School
                        <ArrowUpRight className="size-3.5" />
                      </a>
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
