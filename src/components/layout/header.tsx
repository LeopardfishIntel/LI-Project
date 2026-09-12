"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { User as UserIcon, LogOut, LogIn, Menu, X, RefreshCw, AlertTriangle, CheckCircle2, ShieldCheck, Database, Wrench } from "lucide-react"; 
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "@/firebase"; 
import { doc, getDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface MismatchItem {
  schoolId: string;
  schoolName: string;
  featuredCount: number;
  schoolCount: number;
}

interface ParityState {
  loading: boolean;
  totalFeatured: number;
  totalSchoolOpenJobs: number;
  isMatch: boolean;
  mismatches: MismatchItem[];
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [operativeName, setOperativeName] = useState<string>("FRED");
  const [teacherId, setTeacherId] = useState<string>("FLI007");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Parity Monitor State
  const [isParityModalOpen, setIsParityModalOpen] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [parityState, setParityState] = useState<ParityState | null>(null);

  const isAdmin = Boolean(user && (teacherId === "FLI007" || user.email?.includes("admin")));

  const runParityCheck = async () => {
    setParityState((prev) => ({
      loading: true,
      totalFeatured: prev?.totalFeatured || 0,
      totalSchoolOpenJobs: prev?.totalSchoolOpenJobs || 0,
      isMatch: prev?.isMatch ?? true,
      mismatches: prev?.mismatches || [],
    }));
    try {
      const [featuredSnap, schoolSnap] = await Promise.all([
        getDocs(collection(db, "featured_jobs_cache")),
        getDocs(collection(db, "schools")),
      ]);

      const schoolDocIds = new Set(schoolSnap.docs.map(doc => (doc.data().schoolId || doc.id).toUpperCase().trim()));

      const todayMs = Date.now();
      const seenUrls = new Set<string>();
      const seenJobKeys = new Set<string>();
      const countsBySchool: Record<string, number> = {};
      let totalFeatured = 0;

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
        const isMalvern = sourceUpper.includes('MALVERN') || applyUrlLower.includes('malverncollege');
        const isUwc = sourceUpper.includes('UWC') || sourceUpper.includes('UNITED WORLD COLLEGE') || applyUrlLower.includes('uwc.org');
        const isIsp = sourceUpper.includes('ISP') || sourceUpper.includes('INTERNATIONAL SCHOOLS PARTNERSHIP') || applyUrlLower.includes('internationalschools.wd3.myworkdayjobs.com');
        const isGlobe = sourceUpper.includes('GLOBE') || sourceUpper.includes('GLOBEDUCATE') || applyUrlLower.includes('globeducate');
        const isOfficial = sourceUpper.includes('OFFICIAL') || sourceUpper.includes('WEBSITE') || sourceUpper.includes('DIRECT') || sourceUpper.includes('SCHOOL');
        if (!isTes && !isNae && !isGrc && !isInspired && !isTeachAway && !isCognita && !isMalvern && !isUwc && !isIsp && !isGlobe && !isOfficial) return;

        if (applyUrlLower && seenUrls.has(applyUrlLower)) return;
        if (applyUrlLower) seenUrls.add(applyUrlLower);

        const sId = (cacheDoc.schoolId || "").toUpperCase().trim();
        if (!sId || sId.startsWith("AGNT") || !schoolDocIds.has(sId)) return;

        const jobKey = `${sId.toLowerCase()}_${(cacheDoc.title || '').toLowerCase().trim()}`;
        if (seenJobKeys.has(jobKey)) return;
        seenJobKeys.add(jobKey);

        totalFeatured++;
        countsBySchool[sId] = (countsBySchool[sId] || 0) + 1;
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
          });
        }
      });

      setParityState({
        loading: false,
        totalFeatured,
        totalSchoolOpenJobs,
        isMatch: mismatches.length === 0,
        mismatches,
      });
    } catch (err) {
      console.error("Parity check failed:", err);
      setParityState((prev) => ({
        loading: false,
        totalFeatured: prev?.totalFeatured || 0,
        totalSchoolOpenJobs: prev?.totalSchoolOpenJobs || 0,
        isMatch: prev?.isMatch ?? true,
        mismatches: prev?.mismatches || [],
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
        const isMalvern = sourceUpper.includes('MALVERN') || applyUrlLower.includes('malverncollege');
        const isUwc = sourceUpper.includes('UWC') || sourceUpper.includes('UNITED WORLD COLLEGE') || applyUrlLower.includes('uwc.org');
        const isIsp = sourceUpper.includes('ISP') || sourceUpper.includes('INTERNATIONAL SCHOOLS PARTNERSHIP') || applyUrlLower.includes('internationalschools.wd3.myworkdayjobs.com');
        const isGlobe = sourceUpper.includes('GLOBE') || sourceUpper.includes('GLOBEDUCATE') || applyUrlLower.includes('globeducate');
        const isOfficial = sourceUpper.includes('OFFICIAL') || sourceUpper.includes('WEBSITE') || sourceUpper.includes('DIRECT') || sourceUpper.includes('SCHOOL');
        if (!isTes && !isNae && !isGrc && !isInspired && !isTeachAway && !isCognita && !isMalvern && !isUwc && !isIsp && !isGlobe && !isOfficial) return;

        if (applyUrlLower && seenUrls.has(applyUrlLower)) return;
        if (applyUrlLower) seenUrls.add(applyUrlLower);

        const sId = (cacheDoc.schoolId || "").toUpperCase();
        const jobKey = `${(cacheDoc.schoolId || '').toLowerCase().trim()}_${(cacheDoc.title || '').toLowerCase().trim()}`;
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
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const docRef = doc(db, "teachers", u.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            // Pulling Fred and FLI007 from your Firestore 'teachers' collection
            setOperativeName(data.firstName || "FRED"); 
            setTeacherId(data.teacherId || data.id || "FLI007");
          }
        } catch (error) {
          console.error("Intelligence Retrieval Failed:", error);
        }
      }
    });
    return () => unsubscribe();
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

          {/* ADMIN DATA PARITY MONITOR STATUS PILL */}
          {isAdmin && parityState && (
            <button
              onClick={() => setIsParityModalOpen(true)}
              className={cn(
                "hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border transition-all cursor-pointer shadow-lg",
                parityState.loading
                  ? "bg-slate-900 text-slate-400 border-slate-800"
                  : parityState.isMatch
                  ? "bg-emerald-950/80 text-emerald-400 border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-900/50"
                  : "bg-amber-950/90 text-amber-300 border-amber-500/60 hover:border-amber-400 hover:bg-amber-900/60"
              )}
              title="Data Parity & Sync Monitor (Admin Only)"
            >
              {parityState.loading ? (
                <>
                  <RefreshCw className="size-3 animate-spin text-slate-400" />
                  Checking...
                </>
              ) : parityState.isMatch ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Parity 100% ({parityState.totalFeatured} / {parityState.totalSchoolOpenJobs})</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="size-3 text-amber-400 animate-pulse" />
                  <span>Sync Alert ({parityState.mismatches.length} Mismatch{parityState.mismatches.length > 1 ? "es" : ""})</span>
                </>
              )}
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-3">
              {/* THE CLICKABLE DOSSIER LINK */}
              <a 
                href="/profile" 
                className="flex items-center gap-3 bg-white/5 p-1 pr-4 rounded-full border border-white/10 group hover:bg-white/10 hover:border-[#d95f02]/50 transition-all cursor-pointer"
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
              </a>

              {/* LOGOUT */}
              <button 
                onClick={() => signOut(auth)} 
                title="Abort Mission"
                className="p-2 hover:bg-rose-500/10 rounded-full group transition-colors"
              >
                <LogOut className="size-4 text-slate-500 group-hover:text-rose-500" />
              </button>
            </div>
          ) : (
            <a href="/login" className="hidden sm:flex items-center gap-2 bg-[#d95f02] text-white px-4 py-2 rounded-none text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
              <LogIn className="size-4" />
              Secure Access
            </a>
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
          {!user && (
            <a 
              href="/login" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="mt-2 flex items-center gap-2 bg-[#d95f02] text-white px-4 py-3 justify-center rounded-none text-[12px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
            >
              <LogIn className="size-4" />
              Secure Access
            </a>
          )}
        </div>
      )}

      {/* DIAGNOSTIC PARITY MONITOR MODAL */}
      {isAdmin && (
        <Dialog open={isParityModalOpen} onOpenChange={setIsParityModalOpen}>
          <DialogContent className="max-w-2xl bg-slate-950 border border-slate-800 text-slate-100 shadow-2xl p-6">
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
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="size-4" /> Detected Mismatched Schools ({parityState.mismatches.length})
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {parityState.mismatches.map((item) => (
                    <div key={item.schoolId} className="flex justify-between items-center bg-slate-900/90 border border-slate-800 p-2.5 rounded text-xs">
                      <div>
                        <span className="font-mono text-slate-400 font-bold mr-2">[{item.schoolId}]</span>
                        <span className="font-semibold text-slate-200">{item.schoolName}</span>
                      </div>
                      <div className="font-mono text-slate-300">
                        Cache: <span className="text-emerald-400 font-bold">{item.featuredCount}</span> vs School: <span className="text-rose-400 font-bold">{item.schoolCount}</span>
                      </div>
                    </div>
                  ))}
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
    </header>
  );
}
