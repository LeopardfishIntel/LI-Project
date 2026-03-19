 "use client";

import React, { useState, useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { findFitAction, FitFinderState } from "./actions";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, ServerCrash, Lightbulb, ArrowRight, ArrowLeft, Globe, Award } from "lucide-react";

import { useCollection } from '@/firebase'; 
import type { School } from '@/lib/types';

const initialState: FitFinderState = {
  result: null,
  error: null,
  pending: false,
};

const CURRICULUMS = ['British', 'US (American)', 'IB', 'Other'];
const REGIONS = ['Middle East', 'Southeast Asia', 'East Asia', 'Europe', 'Africa', 'Latin America'];
const QUALIFICATIONS = ["PGCE/iPGCE", "B.Ed", "Bachelor's Degree", "Master's Degree", "NPQSL"];
const GOALS = ['Maximize savings', 'Seek adventure', 'Career growth', 'Balanced lifestyle'];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button 
      type="submit" 
      disabled={pending} 
      className="flex-1 bg-[#f97316] text-white font-black h-14 tracking-[0.2em] uppercase hover:bg-[#ea580c] shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all active:scale-[0.98]"
    >
      {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> ANALYZING...</> : "EXECUTE FIT ANALYSIS"}
    </Button>
  );
}

export default function FindYourFitPage() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [state, formAction] = useActionState(findFitAction, initialState);

  const [formData, setFormData] = useState({
    age: '35',
    familyStatus: 'single',
    currentLocation: '',
    currentSalary: '',
    qualifications: [] as string[],
    curriculum: [] as string[],
    regions: [] as string[],
    experience: '2',
    goal: 'Maximize savings'
  });

  useEffect(() => { setMounted(true); }, []);
  const { data: schools } = useCollection<School>(mounted ? 'schools' : undefined);

  const toggleArrayItem = (key: 'qualifications' | 'curriculum' | 'regions', value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter(i => i !== value) : [...prev[key], value]
    }));
  };

  const TogglePill = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
    <button 
      type="button" 
      onClick={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        "px-4 py-2 text-[10px] font-black tracking-widest rounded-sm border transition-all uppercase whitespace-nowrap", 
        active ? "bg-[#f97316] border-[#f97316] text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]" : "bg-white/5 border-white/10 text-gray-500 hover:text-white hover:bg-white/10"
      )}
    >
      {label}
    </button>
  );

  if (!mounted) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#f97316]" /></div>;

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 bg-[#020617] min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-end mb-12 border-b border-white/5 pb-8">
          <div className="space-y-2">
            <p className="text-[#f97316] text-[10px] font-black uppercase tracking-[0.3em]">Phase {step} of 2</p>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white uppercase font-headline">
              {step === 1 ? '1. The Asset' : '2. The Mission'}
            </h1>
          </div>
          <div className="flex gap-1 mb-2">
            <div className={cn("h-1 w-8 rounded-full", step === 1 ? "bg-[#f97316]" : "bg-white/20")}></div>
            <div className={cn("h-1 w-8 rounded-full", step === 2 ? "bg-[#f97316]" : "bg-white/10")}></div>
          </div>
        </div>

        <form action={formAction}>
          {/* --- ANCHORED HIDDEN INPUTS (Always present) --- */}
          <input type="hidden" name="availableSchools" value={schools ? JSON.stringify(schools.map(({ id, name, country, curriculum }) => ({ id, name, country, curriculum }))) : '[]'} />
          <input type="hidden" name="age" value={formData.age} />
          <input type="hidden" name="familyStatus" value={formData.familyStatus} />
          <input type="hidden" name="experience" value={formData.experience} />
          <input type="hidden" name="goal" value={formData.goal} />
          {formData.qualifications.map(q => <input key={q} type="hidden" name="qualifications_cb" value={q} />)}
          {formData.curriculum.map(c => <input key={c} type="hidden" name="curriculum_cb" value={c} />)}
          {formData.regions.map(r => <input key={r} type="hidden" name="regions_cb" value={r} />)}

          {step === 1 ? (
            <div key="step-1" className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Age Range</label>
                  <div className="flex flex-wrap gap-2">
                    {["25", "35", "50", "65"].map((val) => (
                      <TogglePill key={val} label={val === "65" ? "65+" : `${val}-${parseInt(val)+9}`} active={formData.age === val} onClick={() => setFormData({...formData, age: val})} />
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Family Status</label>
                  <div className="flex flex-wrap gap-2">
                    {['single', 'couple', 'family'].map(fs => (
                      <TogglePill key={fs} label={fs} active={formData.familyStatus === fs} onClick={() => setFormData({...formData, familyStatus: fs})} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Qualifications</label>
                <div className="flex flex-wrap gap-2">
                  {QUALIFICATIONS.map(q => <TogglePill key={q} label={q} active={formData.qualifications.includes(q)} onClick={() => toggleArrayItem('qualifications', q)} />)}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <label className="text-[10px] font-black text-[#f97316] uppercase tracking-widest">Curriculum Experience</label>
                <div className="flex flex-wrap gap-2">
                  {CURRICULUMS.map(c => <TogglePill key={c} label={c} active={formData.curriculum.includes(c)} onClick={() => toggleArrayItem('curriculum', c)} />)}
                </div>
              </div>

              <Button type="button" onClick={() => setStep(2)} className="w-full bg-[#f97316]/10 border border-[#f97316]/30 text-[#f97316] font-black h-14 tracking-[0.2em] uppercase hover:bg-[#f97316]/20">
                Establish Mission <ArrowRight className="size-4 ml-2" />
              </Button>
            </div>
          ) : (
            <div key="step-2" className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-[#007FFF] uppercase tracking-widest flex items-center gap-2"><Globe className="size-3" /> Target Regions</label>
                <div className="flex flex-wrap gap-2">
                  {REGIONS.map(r => <TogglePill key={r} label={r} active={formData.regions.includes(r)} onClick={() => toggleArrayItem('regions', r)} />)}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Primary Objective</label>
                <div className="grid grid-cols-2 gap-2">
                  {GOALS.map(g => <TogglePill key={g} label={g} active={formData.goal === g} onClick={() => setFormData({...formData, goal: g})} />)}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Current Location</label>
                  <Input name="currentLocation" value={formData.currentLocation} onChange={(e) => setFormData({...formData, currentLocation: e.target.value})} placeholder="e.g. London, UK" className="bg-white/5 border-white/10 rounded-sm font-bold h-11 text-white" />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Experience (Years)</label>
                  <Input type="number" name="experience" value={formData.experience} onChange={(e) => setFormData({...formData, experience: e.target.value})} className="bg-white/5 border-white/10 rounded-sm font-bold h-11 text-white" />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="button" onClick={() => setStep(1)} variant="ghost" className="text-gray-500 font-bold uppercase tracking-widest text-[10px] hover:text-white"><ArrowLeft className="size-4 mr-2" /> Back</Button>
                <SubmitButton />
              </div>
            </div>
          )}
        </form>

        {state.result && (
          <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <h2 className="text-4xl font-black tracking-tighter text-white uppercase text-center font-headline">Recommended Fits</h2>
            {state.result.recommendations.map((rec, i) => (
              <Card key={i} className="glass border-white/5 bg-white/5 rounded-sm overflow-hidden p-8">
                 <h3 className="text-3xl font-black text-white tracking-tight flex items-center gap-3 font-headline"><Lightbulb className="text-[#f97316]" /> {rec.name}</h3>
                 <p className="mt-4 text-muted-foreground leading-relaxed italic">"{rec.reasoning}"</p>
              </Card>
            ))}
          </div>
        )}

        {state.error && <div className="mt-8 p-6 border border-destructive/20 bg-destructive/5 text-destructive font-black uppercase text-sm flex items-center gap-3"><ServerCrash /> {state.error}</div>}
      </div>
    </div>
  );
}