"use client";
import { isValidJobTitle } from "@/lib/crawler/titleSanitizer";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { User as UserIcon, LogOut, LogIn, Menu, X, RefreshCw, AlertTriangle, CheckCircle2, ShieldCheck, Database, Wrench, ChevronDown, ChevronUp, ExternalLink, AlertCircle, Check, Zap, Clock, Sparkles } from "lucide-react"; 
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "@/firebase"; 
import { doc, getDoc, collection, getDocs, writeBatch, onSnapshot } from "firebase/firestore";
import type { TeacherProfile } from "@/lib/types";
import { getTimeUntilLocalMidnight } from "@/lib/utils/timeUtils";
import { Input } from "@/components/ui/input";
import { AdminAuditDropdown } from "@/components/layout/AdminAuditDropdown";
import { CompensationAuditModal } from "@/components/audit/CompensationAuditModal";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface CachedJobDetail {
  id: string;
  title: string;
  source: string;
  applyUrl?: string;
  closingDate?: string | null;
}

interface FlaggedJobDetail {
  id: string;
  title: string;
  reason: string;
  source?: string;
  applyUrl?: string;
}

interface MismatchItem {
  schoolId: string;
  schoolName: string;
  featuredCount: number;
  schoolCount: number;
  cachedJobs: CachedJobDetail[];
  flaggedJobs: FlaggedJobDetail[];
}

interface ParityState {
  loading: boolean;
  totalFeatured: number;
  totalSchoolOpenJobs: number;
  isMatch: boolean;
  mismatches: MismatchItem[];
  conflictCount: number;
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [operativeName, setOperativeName] = useState<string>("FRED");
  const [teacherId, setTeacherId] = useState<string>("FLI007");
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [timeUntilReset, setTimeUntilReset] = useState<string>("");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Parity Monitor State
  const [isParityModalOpen, setIsParityModalOpen] = useState(false);
  const [isCompensationModalOpen, setIsCompensationModalOpen] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [parityState, setParityState] = useState<ParityState | null>(null);
  const [expandedSchoolId, setExpandedSchoolId] = useState<string | null>(null);

  const isUserAdmin = Boolean(user && (user.email === "fred@leopardfish.intel" || user.email?.includes("admin") || teacherProfile?.role === "admin" || teacherId === "FLI007"));
  const isAdmin = isUserAdmin;
  const allowance = isUserAdmin ? 1000 : (teacherProfile?.evaluations_allowance ?? 20);
  const used = teacherProfile?.evaluations_used ?? 0;
  const remainingEvaluations = Math.max(0, allowance - used);
  const percentUsed = Math.min(100, Math.round((remainingEvaluations / allowance) * 100));

  useEffect(() => {
    const updateTime = () => {
      setTimeUntilReset(getTimeUntilLocalMidnight().formatted);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const runParityCheck = async () => {
    setParityState((prev) => ({
      loading: true,
      totalFeatured: prev?.totalFeatured || 0,
      totalSchoolOpenJobs: prev?.totalSchoolOpenJobs || 0,
      isMatch: prev?.isMatch ?? true,
      mismatches: prev?.mismatches || [],
      conflictCount: prev?.conflictCount || 0,
    }));
    try {
      const [featuredSnap, schoolSnap, conflictSnap] = await Promise.all([
        getDocs(collection(db, "featured_jobs_cache")),
        getDocs(collection(db, "schools")),
        getDocs(collection(db, "ingestion_conflict_alerts")).catch(() => ({ docs: [] })),
      ]);

      const conflictCount = (conflictSnap as any).docs ? (conflictSnap as any).docs.filter((d: any) => d.data().status === 'unresolved').length : 0;

      const schoolDocIds = new Set(schoolSnap.docs.map(doc => (doc.data().schoolId || doc.id).toUpperCase().trim()));

      const todayMs = Date.now();
      const seenUrls = new Set<string>();
      const seenJobKeys = new Set<string>();
      const countsBySchool: Record<string, number> = {};
      const schoolCacheJobs: Record<string, CachedJobDetail[]> = {};
      const schoolFlaggedJobs: Record<string, FlaggedJobDetail[]> = {};
      let totalFeatured = 0;

      featuredSnap.docs.forEach((d) => {
        const cacheDoc = d.data();
        const sId = (cacheDoc.schoolId || "").toUpperCase().trim();
        if (!sId || sId.startsWith("AGNT") || !schoolDocIds.has(sId)) return;

        if (!schoolCacheJobs[sId]) schoolCacheJobs[sId] = [];
        if (!schoolFlaggedJobs[sId]) schoolFlaggedJobs[sId] = [];

        const title = String(cacheDoc.title || cacheDoc.jobTitle || "").trim();
        const rawStatus = String(cacheDoc.status || "").toUpperCase();
        const applyUrl = String(cacheDoc.applyUrl || cacheDoc.source_url || "").trim();
        const applyUrlLower = applyUrl.toLowerCase();
        const source = String(cacheDoc.source || "Direct");

        if (rawStatus === "EXPIRED" || rawStatus === "CLOSED" || rawStatus === "REJECTED" || rawStatus === "PENDING_REVIEW" || rawStatus === "PENDING") {
          schoolFlaggedJobs[sId].push({ id: d.id, title, reason: `Inactive status (${rawStatus})`, source, applyUrl });
          return;
        }
        if (cacheDoc.closingDateMillis && cacheDoc.closingDateMillis < todayMs) {
          schoolFlaggedJobs[sId].push({ id: d.id, title, reason: "Expired deadline", source, applyUrl });
          return;
        }

        const sourceUpper = source.toUpperCase();
        const isTes = sourceUpper.includes("TES") || applyUrlLower.includes("tes.com");
        const isNae = sourceUpper.includes("NORD ANGLIA") || applyUrlLower.includes("nordangliaeducation.com");
        const isGrc = sourceUpper.includes("GRC") || applyUrlLower.includes("grcfair.org");
        const isInspired = sourceUpper.includes("INSPIRED") || applyUrlLower.includes("inspirededu.com");
        const isTeachAway = sourceUpper.includes("TEACH AWAY") || applyUrlLower.includes("teachaway.com");
        const isCognita = sourceUpper.includes("COGNITA") || applyUrlLower.includes("cognitapeople.csod.com");
        const schoolNameUpper = String(cacheDoc.schoolName || cacheDoc.schoolname || cacheDoc.name || "").toUpperCase();
        const schoolGroupUpper = String(cacheDoc.schoolGroup || cacheDoc.group || "").toUpperCase();
        const sIdUpper = String(cacheDoc.schoolId || "").toUpperCase();
        const isMalvern = sourceUpper.includes("MALVERN") || applyUrlLower.includes("malverncollege") || schoolGroupUpper.includes("MALVERN") || schoolNameUpper.includes("MALVERN") || ["FLIS0130", "FLIS0164"].includes(sIdUpper);
        const isUwc = sourceUpper.includes("UWC") || sourceUpper.includes("UNITED WORLD COLLEGE") || applyUrlLower.includes("uwc.org");
        const isIsp = sourceUpper.includes("ISP") || sourceUpper.includes("INTERNATIONAL SCHOOLS PARTNERSHIP") || applyUrlLower.includes("internationalschools.wd3.myworkdayjobs.com");
        const isGlobe = sourceUpper.includes("GLOBE") || sourceUpper.includes("GLOBEDUCATE") || applyUrlLower.includes("globeducate");
        const isTaylors = sourceUpper.includes("TAYLOR") || applyUrlLower.includes("taylors");
        const isEsf = sourceUpper.includes("ESF") || sourceUpper.includes("ENGLISH SCHOOLS FOUNDATION") || applyUrlLower.includes("esf.edu.hk") || applyUrlLower.includes("esf.org.hk");
        const isGems = sourceUpper.includes("GEMS") || applyUrlLower.includes("gemseducation") || applyUrlLower.includes("gems.ae");
        const isOfficial = sourceUpper.includes("OFFICIAL") || sourceUpper.includes("WEBSITE") || sourceUpper.includes("DIRECT") || sourceUpper.includes("SCHOOL");
        
        if (!isTes && !isNae && !isGrc && !isInspired && !isTeachAway && !isCognita && !isMalvern && !isUwc && !isIsp && !isGlobe && !isTaylors && !isEsf && !isGems && !isOfficial) {
          schoolFlaggedJobs[sId].push({ id: d.id, title, reason: `Unrecognized source (${source})`, source, applyUrl });
          return;
        }

        if (applyUrlLower && seenUrls.has(applyUrlLower)) {
          schoolFlaggedJobs[sId].push({ id: d.id, title, reason: "Duplicate apply URL", source, applyUrl });
          return;
        }
        if (applyUrlLower) seenUrls.add(applyUrlLower);

        if (!isValidJobTitle(title)) {
          schoolFlaggedJobs[sId].push({ id: d.id, title, reason: "Non-academic or support role (filtered by guardrail)", source, applyUrl });
          return;
        }

        const jobKey = `${sId.toLowerCase()}_${title.toLowerCase().trim()}`;
        if (seenJobKeys.has(jobKey)) {
          schoolFlaggedJobs[sId].push({ id: d.id, title, reason: "Duplicate job title already active for school", source, applyUrl });
          return;
        }
        seenJobKeys.add(jobKey);

        totalFeatured++;
        countsBySchool[sId] = (countsBySchool[sId] || 0) + 1;
        schoolCacheJobs[sId].push({
          id: d.id,
          title,
          source,
          applyUrl,
          closingDate: cacheDoc.closingDate || cacheDoc.date_closing || null,
        });
      });

      let totalSchoolOpenJobs = 0;
      const mismatches: MismatchItem[] = [];

      schoolSnap.docs.forEach((docSnap) => {
        const sData = docSnap.data();
        const sId = (sData.schoolId || docSnap.id).toUpperCase().trim();
        const actualCount = countsBySchool[sId] || 0;
        const reportedCount = typeof sData.openJobsCount === "number" ? sData.openJobsCount : actualCount;

        totalSchoolOpenJobs += reportedCount;

        if (actualCount !== reportedCount) {
          mismatches.push({
            schoolId: sId,
            schoolName: sData.schoolName || sData.name || sId,
            featuredCount: actualCount,
            schoolCount: reportedCount,
            cachedJobs: schoolCacheJobs[sId] || [],
            flaggedJobs: schoolFlaggedJobs[sId] || [],
          });
        }
      });

      setParityState({
        loading: false,
        totalFeatured,
        totalSchoolOpenJobs,
        isMatch: totalFeatured === totalSchoolOpenJobs && mismatches.length === 0,
        mismatches,
        conflictCount,
      });
    } catch (err) {
      console.error("Parity check failed:", err);
      setParityState((prev) => ({
        loading: false,
        totalFeatured: prev?.totalFeatured || 0,
        totalSchoolOpenJobs: prev?.totalSchoolOpenJobs || 0,
        isMatch: prev?.isMatch ?? true,
        mismatches: prev?.mismatches || [],
        conflictCount: prev?.conflictCount || 0,
      }));
    }
  };

  const handleAutoFixSync = async () => {
    setIsFixing(true);
    try {
      const [featuredSnap, schoolSnap] = await Promise.all([
        getDocs(collection(db, "featured_jobs_cache")),
        getDocs(collection(db, "schools")),
      ]);

      const todayMs = Date.now();
      const seenUrls = new Set<string>();
      const seenJobKeys = new Set<string>();
      const countsBySchool: Record<string, number> = {};

      featuredSnap.docs.forEach((d) => {
        const cacheDoc = d.data();
        const rawStatus = String(cacheDoc.status || '').toUpperCase();
        if (rawStatus === 'EXPIRED' || rawStatus === 'CLOSED' || rawStatus === 'REJECTED' || rawStatus === 'PENDING_REVIEW' || rawStatus === 'PENDING') return;
        if (cacheDoc.closingDateMillis && cacheDoc.closingDateMillis < todayMs) return;

        const sourceUpper = String(cacheDoc.source || '').toUpperCase();
        const applyUrlLower = String(cacheDoc.applyUrl || '').toLowerCase();
        const isTes = sourceUpper.includes('TES') || applyUrlLower.includes('tes.com');
        const isNae = sourceUpper.includes('NORD ANGLIA') || applyUrlLower.includes('nordangliaeducation.com');
        const isGrc = sourceUpper.includes('GRC') || applyUrlLower.includes('grcfair.org');
        const isInspired = sourceUpper.includes('INSPIRED') || applyUrlLower.includes('inspirededu.com');
        const isTeachAway = sourceUpper.includes('TEACH AWAY') || applyUrlLower.includes('teachaway.com');
        const isCognita = sourceUpper.includes('COGNITA') || applyUrlLower.includes('cognitapeople.csod.com');
        const schoolNameUpper = String(cacheDoc.schoolName || cacheDoc.schoolname || cacheDoc.name || "").toUpperCase();
        const schoolGroupUpper = String(cacheDoc.schoolGroup || cacheDoc.group || "").toUpperCase();
        const sIdUpper = String(cacheDoc.schoolId || "").toUpperCase();
        const isMalvern = sourceUpper.includes('MALVERN') || applyUrlLower.includes('malverncollege') || schoolGroupUpper.includes('MALVERN') || schoolNameUpper.includes('MALVERN') || ['FLIS0130', 'FLIS0164'].includes(sIdUpper);
        const isUwc = sourceUpper.includes('UWC') || sourceUpper.includes('UNITED WORLD COLLEGE') || applyUrlLower.includes('uwc.org');
        const isIsp = sourceUpper.includes('ISP') || sourceUpper.includes('INTERNATIONAL SCHOOLS PARTNERSHIP') || applyUrlLower.includes('internationalschools.wd3.myworkdayjobs.com');
        const isGlobe = sourceUpper.includes('GLOBE') || sourceUpper.includes('GLOBEDUCATE') || applyUrlLower.includes('globeducate');
        const isTaylors = sourceUpper.includes('TAYLOR') || applyUrlLower.includes('taylors');
        const isEsf = sourceUpper.includes('ESF') || sourceUpper.includes('ENGLISH SCHOOLS FOUNDATION') || applyUrlLower.includes('esf.edu.hk') || applyUrlLower.includes('esf.org.hk');
        const isGems = sourceUpper.includes('GEMS') || applyUrlLower.includes('gemseducation') || applyUrlLower.includes('gems.ae');
        const isOfficial = sourceUpper.includes('OFFICIAL') || sourceUpper.includes('WEBSITE') || sourceUpper.includes('DIRECT') || sourceUpper.includes('SCHOOL');
        if (!isTes && !isNae && !isGrc && !isInspired && !isTeachAway && !isCognita && !isMalvern && !isUwc && !isIsp && !isGlobe && !isTaylors && !isEsf && !isGems && !isOfficial) return;

        if (applyUrlLower && seenUrls.has(applyUrlLower)) return;
        if (applyUrlLower) seenUrls.add(applyUrlLower);

        const title = String(cacheDoc.title || cacheDoc.jobTitle || "").trim();
        if (!isValidJobTitle(title)) return;

        const sId = (cacheDoc.schoolId || "").toUpperCase();
        const jobKey = `${(cacheDoc.schoolId || '').toLowerCase().trim()}_${title.toLowerCase().trim()}`;
        if (seenJobKeys.has(jobKey)) return;
        seenJobKeys.add(jobKey);

        if (sId) {
          countsBySchool[sId] = (countsBySchool[sId] || 0) + 1;
        }
      });

      const batch = writeBatch(db);
      let fixCount = 0;

      schoolSnap.docs.forEach((docSnap) => {
        const sData = docSnap.data();
        const sId = (sData.schoolId || docSnap.id).toUpperCase();
        const actualCount = countsBySchool[sId] || 0;
        if (sData.openJobsCount !== actualCount) {
          batch.update(docSnap.ref, { openJobsCount: actualCount });
          fixCount++;
        }
      });

      if (fixCount > 0) {
        await batch.commit();
      }
      await runParityCheck();
    } catch (err) {
      console.error("Auto-fix sync failed:", err);
    } finally {
      setIsFixing(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    let unsubscribeProfile: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      if (u) {
        const docRef = doc(db, "teachers", u.uid);
        unsubscribeProfile = onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data() as TeacherProfile;
            setTeacherProfile(data);
            setOperativeName(data.name || (data as any).firstName || "FRED"); 
            setTeacherId(data.teacherId || data.id || "FLI007");
          }
        });
      } else {
        setTeacherProfile(null);
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  useEffect(() => {
    if (isAdmin) {
      runParityCheck();
    }
  }, [isAdmin]);

  const links = [
    { name: "Featured Jobs", href: "/featured-jobs" },
    { name: "Evaluate a School", href: "/financial-forecaster" },
    { name: "Compare Schools", href: "/decide" },
    { name: "Discover", href: "/find-your-fit" },
    { name: "Prepare", href: "/prepare" },
  ];

  return (
    <header className="sticky top-0 z-[100] border-b border-white/5 bg-[#020617]/90 backdrop-blur-md px-6 py-3">
      <nav className="flex justify-between items-center max-w-7xl mx-auto">
        
        {/* BRANDING */}
        <a href="/" className="text-xl font-bold tracking-tighter hover:opacity-80 transition-opacity">
          <span className="text-[#d95f02]">Leopard</span><span className="text-[#007FFF]">fish Intel</span>
        </a>

        {/* NAVIGATION */}
        <div className="hidden lg:flex gap-6 items-center border-r border-white/10 pr-6">
          {links.map((link) => (
            <a 
              key={link.href} 
              href={link.href} 
              className={cn(
                "text-[11px] font-bold uppercase tracking-widest transition-colors", 
                (pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))) ? "text-[#d95f02]" : "text-slate-400 hover:text-white"
              )}
            >
              {link.name}
            </a>
          ))}
        </div>

        {/* ACCOUNT & MOBILE MENU TOGGLE */}
        <div className="flex items-center gap-4">

          {/* ADMIN DATA PARITY & SYSTEM INTELLIGENCE DROPDOWN */}
          {isAdmin && (
            <AdminAuditDropdown
              parityState={parityState}
              onOpenJobParity={() => setIsParityModalOpen(true)}
              onOpenCompensationAudit={() => setIsCompensationModalOpen(true)}
            />
          )}

          {user ? (
            <div className="relative">
              {/* INTERACTIVE PROFILE PILL WITH CLEARANCE TRIGGER */}
              <button 
                type="button"
                onClick={() => setIsProfileMenuOpen(prev => !prev)}
                className={cn(
                  "flex items-center gap-2.5 bg-white/5 hover:bg-white/10 p-1 pr-3 rounded-full border transition-all cursor-pointer",
                  isProfileMenuOpen ? "border-primary bg-white/10 shadow-lg shadow-primary/10" : "border-white/10 hover:border-white/20"
                )}
              >
                <div className="size-8 bg-gradient-to-br from-[#0b1224] to-[#1f2937] border border-[#d95f02]/30 rounded-full flex items-center justify-center">
                  <UserIcon className="size-4 text-[#d95f02]" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-[10px] font-black uppercase text-white leading-none">{operativeName}</p>
                  <p className="text-[9px] font-bold text-[#007FFF] leading-none mt-1 tracking-widest uppercase">
                    {teacherId}
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/20">
                  ⚡ {remainingEvaluations}
                </span>
                <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform duration-200", isProfileMenuOpen && "rotate-180")} />
              </button>

              {/* PROFILE & CLEARANCE DROPDOWN POPOVER */}
              {isProfileMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsProfileMenuOpen(false)} 
                  />
                  <div className="absolute right-0 top-full mt-2 w-80 bg-[#0b1224]/95 border border-white/10 rounded-sm shadow-2xl backdrop-blur-xl p-4 space-y-3.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                    {/* USER HEADER IDENT */}
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <div>
                        <div className="text-xs font-black uppercase text-white">{operativeName}</div>
                        <div className="text-[10px] font-mono text-slate-400">{user.email}</div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#007FFF] px-2 py-0.5 bg-[#007FFF]/10 border border-[#007FFF]/20 rounded">
                        {teacherId}
                      </span>
                    </div>

                    {/* CLEARANCE BADGE */}
                    <div className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/5 rounded-sm">
                      <span className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                        <ShieldCheck className="size-3.5 text-emerald-400" />
                        Clearance
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        {isUserAdmin ? "Admin Intel (FLI007)" : "Verified K-12"}
                      </span>
                    </div>

                    {/* DAILY QUOTA & PROGRESS BAR */}
                    <div className="p-3 bg-slate-900/80 border border-white/5 rounded-sm space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                          ⚡ Evaluations Today
                        </span>
                        <span className="font-mono font-bold text-emerald-300">
                          {remainingEvaluations} / {allowance} left
                        </span>
                      </div>

                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 via-amber-500 to-primary h-full rounded-full transition-all duration-300" 
                          style={{ width: `${percentUsed}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="size-3 text-amber-400" />
                          Resets in: <strong className="text-slate-200">{timeUntilReset || "midnight"}</strong>
                        </span>
                      </div>
                    </div>

                    {/* EXTRA VIEWS ACTION BUTTON */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (typeof window !== "undefined") {
                          window.dispatchEvent(new CustomEvent("lfi:open-intel-modal", {
                            detail: { isDataLock: true, category: "Salary" }
                          }));
                        }
                      }}
                      className="w-full p-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-bold text-xs uppercase tracking-wider rounded-sm flex items-center justify-center transition-all cursor-pointer hover:scale-[1.01]"
                    >
                      <span>Request Extra Views (+20)</span>
                    </button>

                    {/* DOSSIER PROFILE LINK */}
                    <a
                      href="/profile"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center justify-between p-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 rounded-sm transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <UserIcon className="size-3.5 text-slate-400" />
                        Profile
                      </span>
                      <ExternalLink className="size-3 text-slate-500" />
                    </a>

                    <div className="h-px bg-white/5" />

                    {/* SIGN OUT */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        signOut(auth);
                      }}
                      className="w-full flex items-center gap-2 p-2 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-sm transition-colors cursor-pointer"
                    >
                      <LogOut className="size-3.5 text-rose-400" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <a 
                href="/login" 
                className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 px-3.5 py-2 rounded-none text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <LogIn className="size-3.5 text-slate-400" />
                Guest
              </a>
              <a 
                href="/signup" 
                className="flex items-center gap-1.5 bg-gradient-to-r from-[#d95f02] via-orange-600 to-amber-600 text-white px-4 py-2 rounded-none text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-md shadow-[#d95f02]/20 transition-all"
              >
                <ShieldCheck className="size-3.5" />
                Register
              </a>
            </div>
          )}

          {/* MOBILE MENU BUTTON */}
          <button 
            className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </nav>

      {/* MOBILE DROPDOWN NAVIGATION */}
      {isMobileMenuOpen && (
        <div className="lg:hidden mt-4 border-t border-white/10 pt-4 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200">
          {links.map((link) => (
            <a 
              key={link.href} 
              href={link.href} 
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "text-[12px] font-bold uppercase tracking-widest transition-colors block px-2 py-1", 
                pathname === link.href ? "text-[#d95f02]" : "text-slate-400 hover:text-white"
              )}
            >
              {link.name}
            </a>
          ))}
          {user ? (
            <div className="mt-2 p-3 bg-white/5 border border-white/10 rounded-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-black uppercase text-white">{operativeName}</div>
                  <div className="text-[10px] font-mono text-slate-400">{teacherId}</div>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  ⚡ {remainingEvaluations}/{allowance} Today
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("lfi:open-intel-modal", {
                      detail: { isDataLock: true, category: "Salary" }
                    }));
                  }
                }}
                className="w-full p-2 bg-primary/10 border border-primary/30 text-primary font-bold text-xs uppercase tracking-wider rounded-sm flex items-center justify-center"
              >
                <span>Request Extra Views (+20)</span>
              </button>
              <div className="flex gap-2 pt-1 border-t border-white/5">
                <a
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex-1 p-2 bg-white/5 text-center text-xs font-bold text-slate-200 rounded-sm"
                >
                  Profile
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    signOut(auth);
                  }}
                  className="p-2 bg-rose-500/10 text-rose-400 text-xs font-bold rounded-sm px-4"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              <a 
                href="/login" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 px-4 py-3 justify-center rounded-none text-[12px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                <LogIn className="size-4 text-slate-400" />
                Guest
              </a>
              <a 
                href="/signup" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 bg-gradient-to-r from-[#d95f02] via-orange-600 to-amber-600 text-white px-4 py-3 justify-center rounded-none text-[12px] font-black uppercase tracking-widest hover:brightness-110 shadow-md shadow-[#d95f02]/20 transition-all"
              >
                <ShieldCheck className="size-4" />
                Register Free
              </a>
            </div>
          )}
        </div>
      )}

      {/* DIAGNOSTIC PARITY MONITOR MODAL */}
      {isAdmin && (
        <Dialog open={isParityModalOpen} onOpenChange={setIsParityModalOpen}>
          <DialogContent className="max-w-3xl bg-slate-950 border border-slate-800 text-slate-100 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 text-slate-400 text-xs font-mono uppercase tracking-wider mb-1">
                <Database className="size-4 text-[#d95f02]" />
                System Intelligence Audit
              </div>
              <DialogTitle className="text-xl font-black text-white flex items-center justify-between">
                <span>Data Parity & Sync Monitor</span>
                {parityState?.isMatch ? (
                  <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5" /> 100% Synced
                  </span>
                ) : (
                  <span className="text-xs bg-amber-950 text-amber-300 border border-amber-500/50 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5" /> Discrepancy Detected
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs mt-1">
                Real-time validation between <code className="text-amber-400">featured_jobs_cache</code> count and aggregate school document <code className="text-amber-400">openJobsCount</code>.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Featured Jobs Cache</p>
                <p className="text-2xl font-black text-white mt-1">{parityState?.totalFeatured ?? "..."}</p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">School Open Jobs Total</p>
                <p className="text-2xl font-black text-white mt-1">{parityState?.totalSchoolOpenJobs ?? "..."}</p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status</p>
                <p className={cn("text-sm font-black mt-2 uppercase tracking-wider", parityState?.isMatch ? "text-emerald-400" : "text-amber-400")}>
                  {parityState?.isMatch ? "Matched" : "Unsynced"}
                </p>
              </div>
            </div>

            {parityState && parityState.mismatches.length > 0 ? (
              <div className="border border-amber-500/30 bg-amber-950/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="size-4" /> Detected Mismatched Schools ({parityState.mismatches.length})
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">Click to inspect active & flagged vacancies</span>
                </div>
                
                <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
                  {parityState.mismatches.map((item) => {
                    const isExpanded = expandedSchoolId === item.schoolId;
                    return (
                      <div 
                        key={item.schoolId} 
                        className="bg-slate-900/95 border border-slate-800 hover:border-slate-700 transition-all rounded-lg overflow-hidden"
                      >
                        {/* Accordion Row Header */}
                        <button
                          type="button"
                          onClick={() => setExpandedSchoolId(isExpanded ? null : item.schoolId)}
                          className="w-full flex justify-between items-center p-3 text-xs text-left cursor-pointer hover:bg-slate-800/40 transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate mr-2">
                            <span className="font-mono bg-slate-800 text-amber-400 font-bold px-1.5 py-0.5 rounded text-[11px] shrink-0">
                              [{item.schoolId}]
                            </span>
                            <span className="font-bold text-slate-100 truncate">{item.schoolName}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="font-mono text-[11px] text-slate-300">
                              Cache: <span className="text-emerald-400 font-bold">{item.featuredCount}</span> vs School: <span className="text-rose-400 font-bold">{item.schoolCount}</span>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="size-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="size-4 text-slate-400" />
                            )}
                          </div>
                        </button>

                        {/* Accordion Row Details */}
                        {isExpanded && (
                          <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/70 space-y-3 animate-in fade-in-50 duration-150">
                            {/* 1. Flagged / Dropped Vacancies */}
                            {item.flaggedJobs && item.flaggedJobs.length > 0 && (
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                                  <AlertCircle className="size-3" /> Filtered / Unindexed Postings ({item.flaggedJobs.length})
                                </p>
                                <div className="space-y-1">
                                  {item.flaggedJobs.map((fj, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-rose-950/30 border border-rose-900/40 p-2 rounded text-[11px]">
                                      <div className="flex items-center gap-1.5 truncate mr-2">
                                        <span className="text-slate-300 font-medium truncate">"{fj.title}"</span>
                                        {fj.source && (
                                          <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded font-mono">
                                            {fj.source}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-rose-300 bg-rose-950/80 border border-rose-700/50 px-2 py-0.5 rounded font-mono shrink-0">
                                        {fj.reason}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 2. Active Approved Vacancies in Cache */}
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                                <Check className="size-3" /> Approved Active Vacancies in Cache ({item.cachedJobs.length})
                              </p>
                              {item.cachedJobs.length > 0 ? (
                                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                  {item.cachedJobs.map((cj) => (
                                    <div key={cj.id} className="flex justify-between items-center bg-slate-900/80 border border-slate-800/80 p-2 rounded text-[11px]">
                                      <div className="flex items-center gap-1.5 truncate mr-2">
                                        <span className="text-slate-200 font-semibold truncate">"{cj.title}"</span>
                                        <span className="text-[9px] bg-slate-800 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-bold">
                                          {cj.source}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {cj.closingDate && (
                                          <span className="text-[10px] text-slate-400 font-mono">
                                            Closes: {cj.closingDate}
                                          </span>
                                        )}
                                        {cj.applyUrl && (
                                          <a
                                            href={cj.applyUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#d95f02] hover:text-white transition-colors"
                                            title="View Vacancy URL"
                                          >
                                            <ExternalLink className="size-3.5" />
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-500 italic">No approved vacancies currently indexed in cache.</p>
                              )}
                            </div>

                            {/* 3. Diagnostic Summary */}
                            <div className="text-[10px] text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-800 font-mono">
                              💡 <strong>Sync Diagnosis</strong>: School document reports <span className="text-amber-300 font-bold">{item.schoolCount}</span> vacancies, while verified academic cache has <span className="text-emerald-300 font-bold">{item.featuredCount}</span>. Click <strong>Auto-Fix & Sync</strong> to align the school counter.
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="border border-emerald-500/20 bg-emerald-950/20 rounded-lg p-4 text-center">
                <CheckCircle2 className="size-6 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">All Systems In Parity</p>
                <p className="text-[11px] text-slate-400 mt-1">Featured job counts match school page counters across all active international schools.</p>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-slate-800 mt-2">
              <button
                onClick={runParityCheck}
                disabled={parityState?.loading}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded transition-all disabled:opacity-50"
              >
                <RefreshCw className={cn("size-3.5", parityState?.loading && "animate-spin")} />
                Re-run Audit
              </button>

              {parityState && parityState.mismatches.length > 0 && (
                <button
                  onClick={handleAutoFixSync}
                  disabled={isFixing}
                  className="flex items-center gap-2 px-4 py-2 bg-[#d95f02] hover:bg-[#c45300] text-white text-xs font-extrabold uppercase tracking-wider rounded transition-all shadow-md disabled:opacity-50"
                >
                  <Wrench className={cn("size-3.5", isFixing && "animate-spin")} />
                  {isFixing ? "Syncing..." : "Auto-Fix & Sync"}
                </button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* COMPENSATION & NET BASELINE AUDIT MODAL */}
      <CompensationAuditModal
        isOpen={isCompensationModalOpen}
        onClose={() => setIsCompensationModalOpen(false)}
      />
    </header>
  );
}
