"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Search, MapPin, BookOpen, ArrowRight, Loader2 } from 'lucide-react';
import { useCollection, db } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default function SchoolDirectoryPage() {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // 🛡️ Hydration Guard
  useEffect(() => {
    setMounted(true);
  }, []);

  // 🛡️ Logic Gate: Prevent collection() call if db is undefined during build
  const schoolsCollection = db ? collection(db, 'schools') : null;
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

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center p-6 lg:p-12">
      <div className="w-full max-w-4xl space-y-8">
        
        {/* Navigation Header - Tightened py-10 to pt-4 */}
        <div className="text-center space-y-2 pt-4">
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
            Global <span className="text-[#f97316]">Navigator</span>
          </h1>
          <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em]">
            Search by school, city, country, or curriculum
          </p>
        </div>

        {/* Omni-Search Bar */}
        <form onSubmit={handleSearch} className="relative group max-w-2xl mx-auto w-full">
          <div className="absolute left-5 top-1/2 -translate-y-1/2">
            <Search className="size-5 text-[#f97316]" />
          </div>
          <Input 
            placeholder="ENTER SEARCH PARAMETERS..." 
            className="pl-14 h-16 bg-white/5 border-white/10 text-white text-lg font-black placeholder:text-slate-800 focus:border-[#f97316] rounded-none transition-all uppercase tracking-tight"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value === "") setHasSearched(false);
            }}
          />
          <button 
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#f97316] text-white p-2 hover:bg-white hover:text-black transition-colors"
          >
            <ArrowRight className="size-5" />
          </button>
        </form>

        {/* Results Area */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-[#f97316]" />
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
                  className="group flex items-center justify-between bg-[#0b1224] border border-white/5 p-4 hover:border-[#f97316] transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-black text-white uppercase tracking-tighter truncate group-hover:text-[#f97316] transition-colors">
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
                  <ArrowRight className="size-4 text-slate-800 group-hover:text-[#f97316] group-hover:translate-x-1 transition-all" />
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