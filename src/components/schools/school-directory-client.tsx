'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, MapPin, BookOpen, DollarSign, Building, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { SchoolData } from '@/data/schools';

interface Props {
  initialSchools: SchoolData[];
}

export function SchoolDirectoryClient({ initialSchools }: Props) {
  const [query, setQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');

  const filteredSchools = useMemo(() => {
    let result = initialSchools;

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (s) =>
          (s.name || '').toLowerCase().includes(q) ||
          (s.city || '').toLowerCase().includes(q) ||
          (s.country || '').toLowerCase().includes(q) ||
          (s.curriculum || '').toLowerCase().includes(q) ||
          (s.id || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [initialSchools, query]);

  return (
    <div className="space-y-8">
      {/* Tactical Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-950/60 p-4 rounded-xl border border-white/10 backdrop-blur-md">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search 490+ schools, cities, countries, curricula..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-[#d95f02] text-sm"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 self-end sm:self-center">
          <span className="text-[#d95f02] font-bold">{filteredSchools.length}</span> / {initialSchools.length} Dossiers Indexed
        </div>
      </div>

      {/* Crawlable Link Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSchools.map((school) => (
          <Link
            key={school.id}
            href={`/schools/${school.id}/`}
            className="group block p-6 bg-slate-900/70 border border-white/10 rounded-xl hover:border-[#d95f02]/60 hover:bg-slate-900/90 hover:shadow-[0_0_20px_rgba(217,95,2,0.15)] transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold px-2.5 py-1 bg-white/5 border border-white/10 rounded text-slate-300 flex items-center gap-1.5">
                <MapPin className="size-3 text-[#d95f02]" />
                {school.country || 'International'}
              </span>
              <span className="text-[11px] text-amber-400/90 font-mono tracking-wider font-semibold">
                {school.id}
              </span>
            </div>

            <h2 className="text-lg font-bold text-white group-hover:text-[#d95f02] transition-colors mb-2 line-clamp-1">
              {school.name}
            </h2>

            <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
              {school.city ? `${school.city}, ` : ''}{school.country} • {school.curriculum} • Verified Package & Cost Intelligence
            </p>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-300">
                  <BookOpen className="size-3 text-slate-400" />
                  {String(school.curriculum || 'IB').split('/')[0].trim()}
                </span>
                {school.financescore && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                    ★ {school.financescore}
                  </span>
                )}
              </div>

              <span className="text-[#d95f02] font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1 text-xs">
                View Dossier &rarr;
              </span>
            </div>
          </Link>
        ))}
      </div>

      {filteredSchools.length === 0 && (
        <div className="text-center py-16 bg-white/[0.02] border border-white/5 rounded-xl">
          <p className="text-slate-400 text-sm">No school dossiers matched &ldquo;{query}&rdquo;.</p>
        </div>
      )}
    </div>
  );
}
