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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button 
      type="submit" 
      disabled={pending} 
      className="w-full h-16 bg-[#f97316] text-white text-lg font-black tracking-widest uppercase hover:bg-white hover:text-black transition-all border-2 border-[#f97316] flex items-center justify-center gap-3 shadow-xl italic disabled:opacity-50 disabled:grayscale"
    >
      {pending ? <><Loader2 className="animate-spin size-5" /> Analysing profile...</> : <><Zap className="size-5" /> Generate my dossier</>}
    </button>
  );
}

export default function FindYourFitPage() {
  const [mounted, setMounted] = useState(false);
  const [state, formAction] = useActionState(findFitAction, initialState);
  
  const [formData, setFormData] = useState({
    age: '35-49', familyStatus: 'Single', 
    currentCity: '', currentSalary: '', experience: '',
    qualifications: [] as string[],
    objectives: [] as string[],
    regions: [] as string[],
  });

  useEffect(() => { setMounted(true); }, []);

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
              <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 italic tracking-widest">Current City</label>
              <Input name="currentCity" value={formData.currentCity} onChange={e => setFormData({...formData, currentCity: e.target.value})} placeholder="E.G. LONDON, UK" className="bg-black/40 border-white/10 h-12 text-white font-bold rounded-none uppercase text-xs italic focus:border-[#f97316] transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 italic tracking-widest">Current Salary</label>
              <Input name="currentSalary" value={formData.currentSalary} onChange={e => setFormData({...formData, currentSalary: e.target.value})} placeholder="E.G. £45,000" className="bg-black/40 border-white/10 h-12 text-white font-bold rounded-none uppercase text-xs italic focus:border-[#f97316] transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 italic tracking-widest">Years Experience</label>
              <Input name="experience" value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} placeholder="E.G. 12" className="bg-black/40 border-white/10 h-12 text-white font-bold rounded-none uppercase text-xs italic focus:border-[#f97316] transition-all" />
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

          <SubmitButton />
        </form>

        {/* 5. DOSSIER RESULTS SECTION */}
        {state.result && (
          <div className="mt-20 border-t-4 border-[#f97316] pt-12 space-y-12 animate-in slide-in-from-bottom-10 duration-1000">
            <div className="text-center space-y-2">
              <h2 className="text-6xl font-black tracking-tighter uppercase italic leading-none">Your <span className="text-[#f97316]">Intelligence Dossier</span></h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase flex items-center justify-center gap-2 italic"><ShieldCheck className="size-4 text-[#007FFF]" /> Verified Recommendations</p>
            </div>
            <div className="grid gap-6 pb-20">
              {state.result.recommendations.map((rec: any, i: number) => (
                <div key={i} className="bg-[#0b1224] border border-white/5 p-10 hover:border-[#f97316]/40 transition-all group">
                  <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
                    <h3 className="text-4xl font-black text-white uppercase italic group-hover:text-[#f97316] transition-colors">{rec.name}</h3>
                    <div className="bg-[#f97316]/10 px-4 py-1 text-[#f97316] text-[9px] font-black border border-[#f97316]/20 uppercase italic">Match confirmed</div>
                  </div>
                  <ul className="space-y-6">
                    {rec.reasoning.split('\n').map((line: string, idx: number) => (
                      line.trim() && <li key={idx} className="flex items-start gap-4 italic group-hover:translate-x-1 transition-transform">
                        <div className="mt-2.5 size-1.5 bg-[#f97316] shrink-0" />
                        <p className="text-slate-300 text-xl leading-relaxed normal-case">{line.replace(/^[*-]\s*/, '').trim()}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}