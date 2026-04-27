"use client";

import React, { useState, useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { findFitAction, FitFinderState } from "./actions";
import { cn } from "@/lib/utils";
import { 
  Loader2, Zap, MapPin, Target, GraduationCap, 
  Compass, User, Trophy, Wallet, Briefcase, ShieldCheck, AlertTriangle 
} from "lucide-react";
import { Input } from "@/components/ui/input";

const initialState: FitFinderState = { result: null, error: null, pending: false };

const AGE_RANGES = ["25-34", "35-49", "50-54", "55-60", "61-64", "65+"];
const QUALS = ["PGCE/IPGCE", "B.Ed", "MA/M.Ed", "NPQSL", "QTS"];
const REGIONS = ["SE Asia", "East Asia", "Middle East", "Europe", "Africa", "Americas", "Oceania"];
const MISSION_OBJECTIVES = ["Savings", "Career Progression", "Adventure", "Balance"];
const FAMILY_STATUS = ["Single", "Family", "Family +1", "Family +2", "Family +3"];

function SubmitButton({ hasResult, isPending, isDirty }: { hasResult: boolean, isPending: boolean, isDirty: boolean }) {
  const [loadingText, setLoadingText] = useState("Analysing profile...");

  useEffect(() => {
    if (isPending) {
      setLoadingText("Analysing profile...");
      const t1 = setTimeout(() => setLoadingText("Cross-referencing global requirements..."), 3000);
      const t2 = setTimeout(() => setLoadingText("Evaluating safety & lifestyle data..."), 6000);
      const t3 = setTimeout(() => setLoadingText("Compiling your personalised dossier..."), 9000);
      const t4 = setTimeout(() => setLoadingText("Good intel takes time..."), 13000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
    } else {
      setLoadingText("Analysing profile...");
    }
  }, [isPending]);

  if (!isPending && hasResult && !isDirty) {
    return (
      <div className="space-y-3 animate-in fade-in duration-500">
        <button 
          type="button" 
          disabled
          className="w-full h-16 bg-[#007FFF]/20 text-[#007FFF] text-lg font-black tracking-widest uppercase border-2 border-[#007FFF]/50 flex items-center justify-center gap-3 shadow-xl italic"
        >
          <ShieldCheck className="size-5" /> Report Complete! See Below
        </button>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center italic">* Change any setting above to automatically unlock a new search.</p>
      </div>
    );
  }

  return (
    <button 
      type="submit" 
      disabled={isPending} 
      className="w-full h-16 bg-[#f97316] text-white text-lg font-black tracking-widest uppercase hover:bg-white hover:text-black transition-all border-2 border-[#f97316] flex items-center justify-center gap-3 shadow-xl italic disabled:opacity-50 disabled:grayscale animate-in fade-in duration-300"
    >
      {isPending ? (
        <><Loader2 className="animate-spin size-5" /> {loadingText}</>
      ) : (
        <><Zap className="size-5" /> {isDirty ? "Generate New Dossier" : "Generate my dossier"}</>
      )}
    </button>
  );
}

export default function FindYourFitPage() {
  const [mounted, setMounted] = useState(false);
  const [state, formAction, isPending] = useActionState(findFitAction, initialState);
  const [isDirty, setIsDirty] = useState(false);
  
  const [formData, setFormData] = useState({
    age: '35-49', familyStatus: 'Single', 
    currentCity: '', currentSalary: '', experience: '',
    qualifications: [] as string[],
    objectives: [] as string[],
    regions: [] as string[],
  });

  useEffect(() => { setMounted(true); }, []);

  // Track if user changes inputs after generating a report
  useEffect(() => {
    if (state.result && !isPending) setIsDirty(true);
  }, [formData]);

  // Reset dirty state when a new generation begins
  useEffect(() => {
    if (isPending) setIsDirty(false);
  }, [isPending]);

  // 🛡️ STRICT LIMIT LOGIC: Only allows 2 selections for Objectives/Regions
  const toggleArrayItem = (key: 'qualifications' | 'objectives' | 'regions', value: string, limit?: number) => {
    setFormData(prev => {
      const current = prev[key];
      if (current.includes(value)) return { ...prev, [key]: current.filter(i => i !== value) };
      if (limit && current.length >= limit) return prev;
      return { ...prev, [key]: [...current, value] };
    });
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 lg:p-10 font-sans selection:bg-[#f97316]">
      {isPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="text-center space-y-6 max-w-md p-8 border border-[#f97316]/30 bg-[#0b1224] shadow-2xl">
            <Loader2 className="animate-spin size-12 text-[#f97316] mx-auto" />
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">Compiling Intel...</h2>
            <p className="text-slate-400 text-sm italic">LeopardfishIntel is analysing your profile this may take up to 30 seconds. <strong>Good Intel takes time.</strong></p>
          </div>
        </div>
      )}
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* BRITISH HEADINGS */}
        <div className="flex justify-between items-end border-b-2 border-[#f97316]/20 pb-4">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
              Find your <span className="text-[#f97316]">fit</span>
            </h1>
            <p className="text-slate-500 font-black uppercase tracking-widest text-[9px] mt-1">
              Intel Intake // Ver. 2026.04
            </p>
          </div>
          <span className="text-[#007FFF] text-[10px] font-black uppercase tracking-widest italic">Status: Ready</span>
        </div>

        <form action={formAction} className="bg-[#0b1224]/90 border border-white/5 p-8 md:p-12 space-y-10 shadow-2xl relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#f97316]" />

          {/* 1. PERSONAL PROFILE */}
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase italic flex items-center gap-2 tracking-widest"><User className="size-3 text-[#f97316]" /> Age Range</label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
                {AGE_RANGES.map(v => (
                  <button key={v} type="button" onClick={() => setFormData({...formData, age: v})} className={cn("py-2 text-[10px] font-bold border transition-all", formData.age === v ? "bg-[#f97316] border-[#f97316] text-white" : "bg-white/5 border-white/10 text-slate-600 hover:text-white")}>{v}</button>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase italic flex items-center gap-2 tracking-widest"><Briefcase className="size-3 text-[#f97316]" /> Family Status</label>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-1">
                {FAMILY_STATUS.map(v => (
                  <button key={v} type="button" onClick={() => setFormData({...formData, familyStatus: v})} className={cn("py-2 text-[9px] font-bold border transition-all uppercase", formData.familyStatus === v ? "bg-[#f97316] border-[#f97316] text-white" : "bg-white/5 border-white/10 text-slate-600 hover:text-white")}>
                    {v.replace('Family ', '')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. MISSION OBJECTIVES (MAX 2) */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <label className="text-[10px] font-black text-[#007FFF] uppercase italic flex items-center gap-2 tracking-widest"><Trophy className="size-3" /> Mission Objective (Max 2)</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
              {MISSION_OBJECTIVES.map(v => (
                <button key={v} type="button" onClick={() => toggleArrayItem('objectives', v, 2)} className={cn("py-3 text-[10px] font-bold border transition-all uppercase", formData.objectives.includes(v) ? "bg-[#007FFF] border-[#007FFF] text-white" : "bg-white/5 border-white/10 text-slate-600 hover:text-white")}>{v}</button>
              ))}
            </div>
          </div>

          {/* 3. CURRENT ROLE & FINANCES */}
          <div className="grid md:grid-cols-3 gap-6 border-y border-white/5 py-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 italic tracking-widest">Current City <span className="text-red-500">*</span></label>
              <Input name="currentCity" required value={formData.currentCity} onChange={e => setFormData({...formData, currentCity: e.target.value})} placeholder="E.G. LONDON, UK" className="bg-black/40 border-white/10 h-12 text-white font-bold rounded-none uppercase text-xs italic focus:border-[#f97316] transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 italic tracking-widest">Current Salary <span className="text-red-500">*</span></label>
              <Input name="currentSalary" required value={formData.currentSalary} onChange={e => setFormData({...formData, currentSalary: e.target.value})} placeholder="E.G. £45,000" className="bg-black/40 border-white/10 h-12 text-white font-bold rounded-none uppercase text-xs italic focus:border-[#f97316] transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 italic tracking-widest">Years Experience <span className="text-red-500">*</span></label>
              <Input name="experience" required type="number" min="0" value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} placeholder="E.G. 12" className="bg-black/40 border-white/10 h-12 text-white font-bold rounded-none uppercase text-xs italic focus:border-[#f97316] transition-all" />
            </div>
          </div>

          {/* 4. QUALIFICATIONS & REGIONS */}
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase italic flex items-center gap-2 tracking-widest"><GraduationCap className="size-4" /> Qualifications</label>
              <div className="flex flex-wrap gap-1">
                {QUALS.map(q => (
                  <button key={q} type="button" onClick={() => toggleArrayItem('qualifications', q)} className={cn("px-4 py-2 text-[10px] font-bold border transition-all", formData.qualifications.includes(q) ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-slate-600 hover:text-white")}>{q}</button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase italic flex items-center gap-2 tracking-widest"><Compass className="size-3" /> Target Regions (Max 2)</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                {REGIONS.map(r => (
                  <button key={r} type="button" onClick={() => toggleArrayItem('regions', r, 2)} className={cn("py-2 text-[10px] font-bold border transition-all uppercase", formData.regions.includes(r) ? "bg-[#f97316] border-[#f97316] text-white" : "bg-white/5 border-white/10 text-slate-600 hover:text-white")}>{r}</button>
                ))}
              </div>
            </div>
          </div>

          {/* DATA CHANNEL */}
          <input type="hidden" name="age" value={formData.age} />
          <input type="hidden" name="familyStatus" value={formData.familyStatus} />
          {formData.qualifications.map(q => <input key={q} type="hidden" name="qualifications_cb" value={q} />)}
          {formData.objectives.map(o => <input key={o} type="hidden" name="objectives_cb" value={o} />)}
          {formData.regions.map(r => <input key={r} type="hidden" name="regions_cb" value={r} />)}

          {/* 🛡️ UI Error Display */}
          {state.error && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 text-red-500 text-[11px] font-black uppercase tracking-widest flex items-center gap-3 animate-in zoom-in-95">
              <AlertTriangle className="size-4 shrink-0" /> 
              <span className="leading-tight">{state.error}</span>
            </div>
          )}

          <SubmitButton hasResult={!!state.result} isPending={isPending} isDirty={isDirty} />
        </form>

        {/* 5. DOSSIER RESULTS SECTION */}
        {state.result && (
          <div className="mt-20 border-t-4 border-[#f97316] pt-12 space-y-12 animate-in slide-in-from-bottom-10 duration-1000">
            <div className="text-center space-y-2">
              <h2 className="text-6xl font-black tracking-tighter uppercase italic leading-none">Your <span className="text-[#f97316]">Intelligence Dossier</span></h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase flex items-center justify-center gap-2 italic"><ShieldCheck className="size-4 text-[#007FFF]" /> Verified Recommendations</p>
            </div>
            <div className="grid gap-12 pb-20">
              {state.result.recommendations.sort((a: any, b: any) => b.fitScore - a.fitScore).map((rec: any, i: number) => (
                <div key={i} className="bg-[#0b1224] border border-white/5 p-8 md:p-12 hover:border-[#f97316]/40 transition-all group shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 bg-[#f97316]/10 border-b border-l border-[#f97316]/20 text-center">
                    <p className="text-[#f97316] text-[10px] font-black uppercase tracking-widest italic mb-1">Fit Score</p>
                    <div className="flex gap-1 justify-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg key={star} className={cn("size-5", (rec.fitScore / 2) >= star - 0.5 ? "text-[#f97316] fill-[#f97316]" : "text-white/20")} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      ))}
                    </div>
                    <p className="text-xs font-black text-white/50 tracking-tighter mt-1">{rec.fitScore}<span className="text-[10px]">/9.9</span></p>
                  </div>
                  
                  <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-white/5">
                    <h3 className="text-5xl font-black text-white uppercase italic group-hover:text-[#f97316] transition-colors">{rec.name}</h3>
                  </div>

                  <div className="space-y-8">
                    {/* Executive Summary */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-[#007FFF] uppercase tracking-widest italic flex items-center gap-2"><Target className="size-3" /> The Verdict</p>
                      <p className="text-slate-300 text-lg leading-relaxed">{rec.executiveSummary}</p>
                    </div>

                    {/* Objective Alignment */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-[#f97316] uppercase tracking-widest italic flex items-center gap-2"><Trophy className="size-3" /> Mission Alignment</p>
                      <p className="text-slate-300 text-lg leading-relaxed italic border-l-2 border-[#f97316]/50 pl-4">{rec.objectiveAlignment}</p>
                    </div>

                    {/* Visa & Age Requirements */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-[#f97316] uppercase tracking-widest italic flex items-center gap-2"><ShieldCheck className="size-3" /> Visa & Age Viability</p>
                      <p className="text-slate-300 text-lg leading-relaxed">{rec.visaAndAgeRequirements}</p>
                    </div>

                    {/* Lifestyle & Safety */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-[#007FFF] uppercase tracking-widest italic flex items-center gap-2"><Compass className="size-3" /> Lifestyle & Safety</p>
                      <p className="text-slate-300 text-lg leading-relaxed">{rec.lifestyleAndSafety}</p>
                    </div>

                    {/* School Matches */}
                    {rec.recommendedSchools && rec.recommendedSchools.length > 0 && (
                      <div className="space-y-4 pt-6 border-t border-white/5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2"><GraduationCap className="size-3" /> Top Matching Schools ({rec.recommendedSchools.length})</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {rec.recommendedSchools.map((school: any, idx: number) => (
                            <div key={idx} className="p-3 bg-black/40 border border-white/5 hover:border-slate-600 transition-colors">
                              <p className="font-bold text-white text-sm">{school.name}</p>
                              <p className="text-[10px] text-slate-400 italic mt-1 leading-tight">{school.reasoning}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Evaluate CTA */}
                    <div className="pt-8">
                      <a 
                        href={`/decide?ids=${(rec.recommendedSchools || []).slice(0, 2).map((s: any) => s.id).join(',')}`}
                        className="inline-flex items-center gap-3 px-8 py-4 bg-transparent border-2 border-[#007FFF] text-[#007FFF] font-black uppercase tracking-widest text-sm hover:bg-[#007FFF] hover:text-white transition-all italic"
                      >
                        <Wallet className="size-4" /> Evaluate Cost of Living in {rec.name}
                      </a>
                      <p className="text-[9px] text-slate-500 mt-2 uppercase tracking-widest italic">* This will open the Decision Dashboard with {rec.recommendedSchools?.length > 1 ? "this school and a rival" : "this school"} pre-loaded.</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}