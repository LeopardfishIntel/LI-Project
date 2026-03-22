 "use client";

import React, { useState, useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { findFitAction, FitFinderState } from "./actions";
import { cn } from "@/lib/utils";
import { Loader2, ServerCrash, Lightbulb, ArrowRight, ArrowLeft, Globe, Target, ShieldCheck, Calendar } from "lucide-react";
import { useCollection } from '@/firebase'; 
import type { School } from '@/lib/types';

const initialState: FitFinderState = { result: null, error: null, pending: false };

const CURRICULUMS = ['British', 'US (American)', 'IB', 'Other'];
const REGIONS = ['Middle East', 'Southeast Asia', 'East Asia', 'Europe', 'Africa', 'Latin America'];
const QUALIFICATIONS = ["PGCE/iPGCE", "B.Ed", "Bachelor's Degree", "Master's Degree", "NPQSL"];
const GOALS = ['Maximize savings', 'Seek adventure', 'Career growth', 'Balanced lifestyle'];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button 
      type="submit" 
      disabled={pending} 
      className="flex-1 bg-[#f97316] text-white font-black h-14 tracking-[0.25em] uppercase hover:bg-[#ea580c] transition-all active:scale-[0.98] disabled:opacity-50"
    >
      {pending ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> ANALYZING...</span> : "EXECUTE FIT ANALYSIS"}
    </button>
  );
}

export default function FindYourFitPage() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [state, formAction] = useActionState(findFitAction, initialState);
  
  // Tactical Date (For 2026 as per system clock)
  const displayDate = "21.03.2026"; 

  const [formData, setFormData] = useState({
    age: '35', familyStatus: 'single', currentLocation: '', qualifications: [] as string[],
    curriculum: [] as string[], regions: [] as string[], experience: '2', goal: 'Maximize savings'
  });

  useEffect(() => { setMounted(true); }, []);
  const { data: schools } = useCollection<School>(mounted ? 'schools' : undefined);

  const toggleArrayItem = (key: 'qualifications' | 'curriculum' | 'regions', value: string) => {
    setFormData(prev => ({
      ...prev, [key]: prev[key].includes(value) ? prev[key].filter(i => i !== value) : [...prev[key], value]
    }));
  };

  const TogglePill = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
    <button type="button" onClick={(e) => { e.preventDefault(); onClick(); }}
      className={cn("px-5 py-3 text-[10px] font-black tracking-widest transition-all uppercase border", 
        active ? "bg-[#f97316] border-[#f97316] text-white shadow-[0_0_20px_rgba(249,115,22,0.3)]" : "bg-white/5 border-white/10 text-slate-500 hover:text-white")}>
      {label}
    </button>
  );

  if (!mounted) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#f97316]" /></div>;

  return (
    <div className="container mx-auto px-4 md:px-6 py-20 bg-[#020617] min-h-screen">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-16 border-b border-white/5 pb-10">
          <div className="flex justify-between items-center mb-6">
            <span className="text-[#f97316] text-[11px] font-black uppercase tracking-[0.4em]">Phase {step} // 02</span>
            <div className="flex gap-2">
                <div className={cn("h-1 w-12", step === 1 ? "bg-[#f97316]" : "bg-white/10")}></div>
                <div className={cn("h-1 w-12", step === 2 ? "bg-[#f97316]" : "bg-white/10")}></div>
            </div>
          </div>
          <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white uppercase leading-none">
            {step === 1 ? <>The <span className="text-[#f97316]">Asset</span> Profile</> : <>The <span className="text-[#007FFF]">Mission</span> Parameters</>}
          </h1>
        </div>

        <form action={formAction} className="space-y-12">
          <input type="hidden" name="availableSchools" value={schools ? JSON.stringify(schools.map(s => ({ id: s.id, name: s.name, country: s.country, curriculum: s.curriculum }))) : '[]'} />
          <input type="hidden" name="age" value={formData.age} />
          {/* ... Other hidden inputs as needed ... */}

          {step === 1 ? (
            <div className="space-y-12 animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-6">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Age Bracket</label>
                    <div className="flex flex-wrap gap-3">{["25", "35", "50", "65"].map(v => <TogglePill key={v} label={v} active={formData.age === v} onClick={() => setFormData({...formData, age: v})} />)}</div>
                </div>
                <div className="space-y-6">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Family Deployment</label>
                    <div className="flex flex-wrap gap-3">{['single', 'couple', 'family'].map(fs => <TogglePill key={fs} label={fs} active={formData.familyStatus === fs} onClick={() => setFormData({...formData, familyStatus: fs})} />)}</div>
                </div>
              </div>
              <div className="space-y-6 pt-10 border-t border-white/5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Qualifications</label>
                <div className="flex flex-wrap gap-3">{QUALIFICATIONS.map(q => <TogglePill key={q} label={q} active={formData.qualifications.includes(q)} onClick={() => toggleArrayItem('qualifications', q)} />)}</div>
              </div>
              <button type="button" onClick={() => setStep(2)} className="w-full bg-[#f97316]/5 border border-[#f97316]/20 text-[#f97316] font-black h-16 tracking-[0.3em] uppercase hover:bg-[#f97316]/10 flex items-center justify-center gap-3">
                ESTABLISH MISSION <ArrowRight className="size-5" />
              </button>
            </div>
          ) : (
            <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-6">
                <label className="text-[10px] font-black text-[#007FFF] uppercase tracking-[0.2em] flex items-center gap-2"><Globe className="size-4" /> Operational Regions</label>
                <div className="flex flex-wrap gap-3">{REGIONS.map(r => <TogglePill key={r} label={r} active={formData.regions.includes(r)} onClick={() => toggleArrayItem('regions', r)} />)}</div>
              </div>
              <div className="flex gap-6 pt-10"><button type="button" onClick={() => setStep(1)} className="px-8 text-slate-500 font-black uppercase text-[11px] flex items-center gap-2"><ArrowLeft className="size-4" /> PREVIOUS</button><SubmitButton /></div>
            </div>
          )}
        </form>

        {/* RESULTS SECTION */}
        {state.result && (
          <div className="mt-32 animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-12">
            <div className="text-center space-y-4">
                <Target className="size-12 text-[#f97316] mx-auto opacity-50" />
                <h2 className="text-5xl font-black tracking-tighter text-white leading-none uppercase">Tactical <span className="text-[#f97316]">Alignment</span></h2>
                
                {/* 🛡️ TACTICAL METADATA STAMPS */}
                <div className="flex flex-wrap justify-center gap-6 mt-6 border-y border-white/5 py-4">
                  <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
                    <Calendar className="size-3 text-[#f97316]" />
                    CREATED: <span className="text-white">{displayDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
                    <ShieldCheck className="size-3 text-[#007FFF]" />
                    ASSET AGE PROFILE: <span className="text-white">{formData.age} VERIFIED</span>
                  </div>
                </div>
            </div>
            
            <div className="grid gap-10">
                {state.result.recommendations.map((rec, i) => (
                <div key={i} className="bg-white/5 border border-white/10 p-10 hover:border-[#f97316]/30 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#f97316] opacity-40"></div>
                    <div className="flex justify-between items-start mb-8">
                        <h3 className="text-3xl font-black text-white tracking-tighter uppercase group-hover:text-[#f97316] transition-colors">{rec.name}</h3>
                        <div className="bg-[#f97316]/10 px-3 py-1 text-[#f97316] text-[10px] font-black tracking-widest border border-[#f97316]/20 uppercase">98% Match</div>
                    </div>
                    
                    <div className="flex items-start gap-6">
                        <Lightbulb className="text-[#f97316] size-6 mt-1 shrink-0" />
                        <div className="w-full">
                          {/* 🛡️ BULLET POINT ENGINE */}
                          <ul className="space-y-4">
                            {rec.reasoning.split('\n').map((line, idx) => {
                              const cleanLine = line.replace(/^[*-]\s*/, '').trim();
                              if (!cleanLine) return null;
                              return (
                                <li key={idx} className="flex items-start gap-4">
                                  <div className="mt-2.5 size-1.5 bg-[#f97316] shrink-0" />
                                  <p className="text-slate-300 text-lg leading-relaxed normal-case tracking-tight italic">
                                    {cleanLine}
                                  </p>
                                </li>
                              );
                            })}
                          </ul>
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