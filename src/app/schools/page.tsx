import { Metadata } from 'next';
import { SCHOOLS } from '@/data/schools';
import { SchoolDirectoryClient } from '@/components/schools/school-directory-client';
import { ShieldCheck, Compass, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'International School Directory & Salary Data | Leopardfish Intel',
  description: 'Explore verified compensation benchmarks, contract packages, and financial intelligence across 490+ international schools worldwide.',
  alternates: {
    canonical: 'https://leopardfishintel.com/schools/',
  },
  openGraph: {
    title: 'International School Directory & Salary Data | Leopardfish Intel',
    description: 'Explore verified compensation benchmarks, contract packages, and financial intelligence across 490+ international schools worldwide.',
    url: 'https://leopardfishintel.com/schools/',
    siteName: 'Leopardfish Intel',
    type: 'website',
  },
};

export default function SchoolsDirectoryPage() {
  return (
    <main className="min-h-screen bg-[#020617] text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d95f02]/10 border border-[#d95f02]/30 text-[#d95f02] text-xs font-mono uppercase tracking-wider">
            <ShieldCheck className="size-3.5" />
            Global Intelligence Index
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white uppercase italic">
            International School Directory
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Access verified salary scale benchmarks, housing allowances, tax nuances, and live financial stability ratings for {SCHOOLS.length}+ international institutions.
          </p>
        </div>

        {/* School Directory Component with SSR Links */}
        <SchoolDirectoryClient initialSchools={SCHOOLS} />
      </div>
    </main>
  );
}