"use client";

import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Search, MapPin, BookOpen, ArrowRight, Loader2, ShieldAlert, Lock, Compass } from 'lucide-react';
import { useCollection, useDoc, db, useAuth } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import type { TeacherProfile } from '@/lib/types';

export const dynamic = 'force-dynamic';

function SchoolDirectoryContent() {
  const { user, loading: isAuthLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const searchParams = useSearchParams();

  // 🛡️ Admin Verification Gate
  const teacherDocRef = useMemo(() => (user && db ? doc(db, 'teachers', user.uid) : null), [user]);
  const { data: teacherProfile } = useDoc<TeacherProfile>(teacherDocRef);

  const isAdmin = Boolean(
    user && (
      user.email === 'fred@leopardfish.intel' ||
      user.uid === 'FLI007' ||
      user.email?.includes('admin') ||
      (teacherProfile as any)?.role === 'admin' ||
      (teacherProfile as any)?.teacherId === 'FLI007'
    )
  );

  // 🛡️ Hydration Guard & Query Param Scanner
  useEffect(() => {
    setMounted(true);
    const q = searchParams.get('q');
    if (q) {
      setSearchQuery(q);
      setHasSearched(true);
    }
  }, [searchParams]);

  // 🛡️ Logic Gate: Prevent collection() call if db is undefined during build
  const schoolsCollection = db && isAdmin ? collection(db, 'schools') : null;
  const { data: schools, isLoading } = useCollection<any>(schoolsCollection);

  const filteredSchools = useMemo(() => {
    if (!schools || searchQuery.length < 2) return [];
    
    const query = searchQuery.toLowerCase();

    return schools.filter(school => {
      const name = (school.schoolname || school.name || school.schoolName || "").toLowerCase();
      if (!name) return false;

      const city = (school.city || "").toLowerCase();
      const country = (school.country || "").toLowerCase();
      const curriculum = (school.curriculum || school.intel?.curriculum || "").toLowerCase();

      return (
        name.includes(query) ||
        city.includes(query) ||
        country.includes(query) ||
        curriculum.includes(query)
      );
    });
  }, [schools, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.length >= 2) {
      setHasSearched(true);
    }
  };

  if (!mounted || isAuthLoading) {
    return (
      <div className="min-h-[70vh] bg-[#020617] flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#d95f02]" />
      </div>
    );
  }

  // 🔒 NON-ADMIN GATE SCREEN
  if (!isAdmin) {
    return (
      <div className="min-h-[80vh] bg-[#020617] flex items-center justify-center p-4 md:p-8">
        <div className="max-w-xl w-full space-y-6 bg-slate-950/80 border border-white/10 p-6 md:p-8 rounded-sm shadow-2xl backdrop-blur-md text-center">
          <div className="size-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-400">
            <Lock className="size-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono uppercase tracking-wider">
              <ShieldAlert className="size-3.5" />
              Administrative Staging Gate
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white italic">
              School Directory In Private Beta
            </h1>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
              The 490+ school dossier directory is currently undergoing administrative index calibration and is accessible exclusively to clearance administrators.
            </p>
          </div>

          <div className="p-4 rounded bg-white/[0.02] border border-white/10 text-xs text-slate-300 text-left space-y-1">
            <span className="text-white font-bold block uppercase tracking-wider text-[10px]">Public Intelligence Available:</span>
            <p className="text-slate-400">
              You can still freely use the <strong>Financial Forecaster</strong>, explore <strong>Featured Vacancies</strong>, and view <strong>Regional Discovery Hubs</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link href="/financial-forecaster" className="flex-1">
              <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold gap-2 text-xs">
                <Compass className="size-4" />
                Financial Forecaster
              </Button>
            </Link>
            <Link href="/featured-jobs" className="flex-1">
              <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 text-xs font-bold">
                Featured Vacancies
              </Button>
            </Link>
          </div>

          {!user && (
            <div className="pt-2 text-center">
              <Link href="/login" className="text-xs font-mono text-primary hover:underline uppercase tracking-wider">
                Admin Sign In →
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center p-6 lg:p-12">
      <div className="w-full max-w-4xl space-y-8">
        
        {/* Navigation Header - Tightened py-10 to pt-4 */}
        <div className="text-center space-y-2 pt-4">
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
            Global <span className="text-[#d95f02]">Navigator</span>
          </h1>
          <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em]">
            Search by school, city, country, or curriculum
          </p>
        </div>

        {/* Omni-Search Bar */}
        <form onSubmit={handleSearch} className="relative group max-w-2xl mx-auto w-full">
          <div className="absolute left-5 top-1/2 -translate-y-1/2">
            <Search className="size-5 text-[#d95f02]" />
          </div>
          <Input 
            placeholder="ENTER SEARCH PARAMETERS..." 
            className="pl-14 h-16 bg-white/5 border-white/10 text-white text-lg font-black placeholder:text-slate-800 focus:border-[#d95f02] rounded-none transition-all uppercase tracking-tight"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value === "") setHasSearched(false);
            }}
          />
          <button 
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#d95f02] text-white p-2 hover:bg-white hover:text-black transition-colors"
          >
            <ArrowRight className="size-5" />
          </button>
        </form>

        {/* Results Area */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-[#d95f02]" />
            </div>
          ) : !hasSearched ? (
            <div className="py-12 text-center border border-white/5 bg-white/[0.02]">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">
                Awaiting mission parameters
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-400">
              {filteredSchools.map((school) => (
                <Link 
                  key={school.id} 
                  href={`/schools/${school.id}`}
                  className="group flex items-center justify-between bg-[#0b1224] border border-white/5 p-4 hover:border-[#d95f02] transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-black text-white uppercase tracking-tighter truncate group-hover:text-[#d95f02] transition-colors">
                      {school.schoolname || school.name || school.schoolName || "RECON PENDING"}
                    </h3>
                    <div className="flex gap-4 mt-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <MapPin className="size-3 text-[#007FFF]" /> {school.city}, {school.country}
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <BookOpen className="size-3 text-[#007FFF]" /> {school.curriculum || school.intel?.curriculum || "N/A"}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-slate-800 group-hover:text-[#d95f02] group-hover:translate-x-1 transition-all" />
                </Link>
              ))}

              {filteredSchools.length === 0 && (
                <div className="py-10 text-center text-slate-600 font-black uppercase text-[10px] tracking-widest">
                  No dossiers found for "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SchoolDirectoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#d95f02]" />
      </div>
    }>
      <SchoolDirectoryContent />
    </Suspense>
  );
}