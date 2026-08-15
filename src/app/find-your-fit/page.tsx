"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Loader2, Zap, MapPin, Target, GraduationCap, 
  Compass, User, Trophy, Wallet, Briefcase, ShieldCheck, AlertTriangle, Info
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const AGE_RANGES = ["25-34", "35-49", "50-54", "55-60", "61-64", "65+"];
const QUALS = ["UK (QTS)", "US State", "ANZ Reg", "SA SACE", "EU State", "IB Trained", "Masters Degree", "Tefl/Celta", "None"];
const REGIONS = ["SE Asia", "East Asia", "Middle East", "Europe", "Africa", "Americas"];
const MISSION_OBJECTIVES = ["Savings", "Career Progression", "Adventure", "Culture"];
const FAMILY_STATUS = ["Single", "Family", "Family +1", "Family +2", "Family +3"];

function SubmitButton({ isPending, isDirty, isDisabled }: { isPending: boolean, isDirty: boolean, isDisabled?: boolean }) {
  const [loadingText, setLoadingText] = useState("Analyzing Leopardfish Intel...");

  useEffect(() => {
    if (isPending) {
      setLoadingText("Analyzing Leopardfish Intel...");
      const t1 = setTimeout(() => setLoadingText("Retrieving country averages..."), 1500);
      const t2 = setTimeout(() => setLoadingText("Applying Family scaling factors..."), 3000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [isPending]);

  return (
    <button 
      type="submit" 
      disabled={isPending || isDisabled} 
      className="w-full h-16 bg-black text-slate-200 text-lg font-black tracking-widest hover:bg-[#d95f02] hover:text-black transition-all border-2 border-[#d95f02] flex items-center justify-center gap-3 shadow-xl italic disabled:opacity-50 disabled:grayscale animate-in fade-in duration-300"
    >
      {isPending ? (
        <><Loader2 className="animate-spin size-5" /> {loadingText}</>
      ) : (
        <><Zap className="size-5" /> {isDirty ? "Generate New Matrix" : "Leopardfish Intel Analysis"}</>
      )}
    </button>
  );
}

export default function FindYourFitPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  
  const [formData, setFormData] = useState({
    age: '35-49', familyStatus: 'Single', 
    currentCity: '', currentSalary: '', experience: '',
    currency: 'GBP',
    partnerSalary: '',
    partnerCurrency: 'GBP',
    qualifications: [] as string[],
    objectives: [] as string[],
    regions: [] as string[],
  });

  useEffect(() => {
    setMounted(true);
    try {
      const savedProfile = localStorage.getItem('lf_profile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        setFormData(prev => ({
          ...prev,
          age: parsed.age || prev.age,
          familyStatus: parsed.familyStatus || prev.familyStatus,
          currentCity: parsed.location || parsed.currentCity || prev.currentCity,
          currentSalary: parsed.salary || parsed.currentSalary || prev.currentSalary,
          experience: parsed.experience || prev.experience,
          currency: parsed.currency || prev.currency,
          partnerSalary: parsed.partnerSalary || '',
          partnerCurrency: parsed.partnerCurrency || 'GBP',
          qualifications: parsed.qualifications || prev.qualifications,
          objectives: parsed.objectives || parsed.goals || prev.objectives,
          regions: parsed.regions || prev.regions,
        }));
      }
    } catch (e) {
      console.warn("Failed to load saved profile:", e);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidationErrors(true);
    if (formData.regions.length === 0) return;
    if (formData.qualifications.length === 0 || formData.qualifications.includes('None')) return;
    setIsPending(true);

    try {
      const profileToSave = {
        age: formData.age,
        familyStatus: formData.familyStatus,
        location: formData.currentCity,
        salary: formData.currentSalary,
        experience: formData.experience,
        currency: formData.currency,
        partnerSalary: formData.familyStatus !== 'Single' ? formData.partnerSalary : '',
        partnerCurrency: formData.partnerCurrency,
        qualifications: formData.qualifications,
        goals: formData.objectives,
        regions: formData.regions
      };
      localStorage.setItem('lf_profile', JSON.stringify(profileToSave));
    } catch (err) {
      console.warn("Failed to save profile:", err);
    }

    const params = new URLSearchParams({
      age: formData.age,
      regions: formData.regions.join(','),
      salary: `${formData.currency} ${formData.currentSalary}`,
      partnerSalary: formData.familyStatus !== 'Single' && formData.partnerSalary ? `${formData.partnerCurrency} ${formData.partnerSalary}` : '',
      status: formData.familyStatus,
      qualifications: formData.qualifications.join(','),
      goals: formData.objectives.join(','),
      currentLocation: formData.currentCity
    });

    setTimeout(() => {
      router.push(`/discover/matrix?${params.toString()}`);
    }, 1200);
  };

  // 🛡️ STRICT LIMIT LOGIC: Only allows 2 selections for Objectives/Regions
  const toggleArrayItem = (key: 'qualifications' | 'objectives' | 'regions', value: string, limit?: number) => {
    setFormData(prev => {
      let current = prev[key];
      if (key === 'qualifications') {
        if (value === 'None') {
          if (current.includes('None')) return { ...prev, qualifications: [] };
          return { ...prev, qualifications: ['None'] };
        } else {
          current = current.filter(i => i !== 'None');
        }
      }
      if (current.includes(value)) return { ...prev, [key]: current.filter(i => i !== value) };
      if (limit && current.length >= limit) return prev;
      return { ...prev, [key]: [...current, value] };
    });
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 lg:p-10 font-sans selection:bg-[#d95f02]">
      {isPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="text-center space-y-6 max-w-md p-8 border border-[#d95f02]/30 bg-[#0b1224] shadow-2xl">
            <Loader2 className="animate-spin size-12 text-[#d95f02] mx-auto" />
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">Compiling Intel...</h2>
            <p className="text-slate-400 text-sm italic">LeopardfishIntel is analysing your profile this may take up to 30 seconds. <strong>Good Intel takes time.</strong></p>
          </div>
        </div>
      )}
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* BRITISH HEADINGS */}
        <div className="flex justify-between items-end border-b-2 border-[#d95f02]/20 pb-4">
          <div>
            <p className="text-slate-500 font-black uppercase tracking-widest text-[9px] mt-1">
              Intel Intake // Ver. 2026.04
            </p>
          </div>
          <span className="text-[#007FFF] text-[10px] font-black uppercase tracking-widest italic">Status: Ready</span>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#0b1224]/90 border border-white/5 p-8 md:p-12 space-y-10 shadow-2xl relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#d95f02]/30" />

          {/* Heading inside the card/box */}
          <div className="border-b border-white/5 pb-4 mb-4">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
              Find your <span className="text-[#d95f02]">fit</span>
            </h1>
          </div>

          <p className="text-sm text-slate-300 font-medium max-w-3xl leading-relaxed border-b border-white/5 pb-6">
            Leopardfish Intel wants to help you find the best fit for your specific situation. To do this accurately, we need a few baseline details regarding your background. This allows us to provide authentic, personalized recommendations.
          </p>

          {/* 1. PERSONAL PROFILE */}
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase italic flex items-center gap-2 tracking-widest"><User className="size-3 text-[#d95f02]" /> Age Range</label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
                {AGE_RANGES.map(v => (
                  <button key={v} type="button" onClick={() => setFormData({...formData, age: v})} className={cn("py-2 text-[10px] font-bold border transition-all", formData.age === v ? "bg-[#d95f02] border-[#d95f02] text-white" : "bg-white/5 border-white/10 text-slate-600 hover:text-white")}>{v}</button>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase italic flex items-center gap-2 tracking-widest"><Briefcase className="size-3 text-[#d95f02]" /> Family Status</label>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-1">
                {FAMILY_STATUS.map(v => (
                  <button key={v} type="button" onClick={() => setFormData({...formData, familyStatus: v})} className={cn("py-2 text-[9px] font-bold border transition-all uppercase", formData.familyStatus === v ? "bg-[#d95f02] border-[#d95f02] text-white" : "bg-white/5 border-white/10 text-slate-600 hover:text-white")}>
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
          <div className="space-y-6 border-y border-white/5 py-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 italic tracking-widest">Current City <span className="text-red-500">*</span></label>
                <Input name="currentCity" required value={formData.currentCity} onChange={e => setFormData({...formData, currentCity: e.target.value})} placeholder="E.G. LONDON, UK" className="bg-black/40 border-white/10 h-12 text-white font-bold rounded-none uppercase text-xs italic focus:border-[#d95f02] transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 italic tracking-widest">Current Monthly Net Take-Home Salary <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <div className="w-24 shrink-0">
                    <Select value={formData.currency} onValueChange={(v) => setFormData({...formData, currency: v})}>
                      <SelectTrigger className="bg-black/40 border-white/10 h-12 text-xs font-bold uppercase rounded-none focus:border-[#d95f02] transition-all"><SelectValue placeholder="Currency" /></SelectTrigger>
                      <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold uppercase text-xs">
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="Local">Local</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input name="currentSalary" required value={formData.currentSalary} onChange={e => setFormData({...formData, currentSalary: e.target.value})} placeholder="E.G. 3,500" className="bg-black/40 border-white/10 h-12 text-white font-bold rounded-none uppercase text-xs italic focus:border-[#d95f02] transition-all flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 italic tracking-widest">Years Experience <span className="text-red-500">*</span></label>
                <Input name="experience" required type="number" min="0" value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} placeholder="E.G. 12" className="bg-black/40 border-white/10 h-12 text-white font-bold rounded-none uppercase text-xs italic focus:border-[#d95f02] transition-all" />
              </div>
            </div>

            {formData.familyStatus !== 'Single' && (
              <div className="grid md:grid-cols-3 gap-6 pt-4 border-t border-white/5 animate-in slide-in-from-top duration-300">
                <div className="space-y-2 md:col-start-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 italic tracking-widest">Partner / Other Net Monthly Income</label>
                  <div className="flex gap-2">
                    <div className="w-24 shrink-0">
                      <Select value={formData.partnerCurrency} onValueChange={(v) => setFormData({...formData, partnerCurrency: v})}>
                        <SelectTrigger className="bg-black/40 border-white/10 h-12 text-xs font-bold uppercase rounded-none focus:border-[#d95f02] transition-all"><SelectValue placeholder="Currency" /></SelectTrigger>
                        <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold uppercase text-xs">
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="Local">Local</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Input name="partnerSalary" value={formData.partnerSalary} onChange={e => setFormData({...formData, partnerSalary: e.target.value})} placeholder="E.G. 2,000" className="bg-black/40 border-white/10 h-12 text-white font-bold rounded-none uppercase text-xs italic focus:border-[#d95f02] transition-all flex-1" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. QUALIFICATIONS & REGIONS */}
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase italic flex items-center gap-2 tracking-widest"><GraduationCap className="size-4" /> Qualifications</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {QUALS.map(q => (
                  <button 
                    key={q} 
                    type="button" 
                    onClick={() => toggleArrayItem('qualifications', q)} 
                    className={cn(
                      "py-3 text-[10px] font-bold border transition-all rounded-sm uppercase text-center w-full", 
                      formData.qualifications.includes(q) 
                        ? "bg-[#d95f02]/20 border-[#d95f02] text-white shadow-[0_0_8px_rgba(249,115,22,0.15)]" 
                        : "bg-white/5 border-white/10 text-slate-600 hover:text-white"
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase italic flex items-center gap-2 tracking-widest"><Compass className="size-3" /> Target Regions (Max 2)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {REGIONS.map(r => (
                  <button 
                    key={r} 
                    type="button" 
                    onClick={() => toggleArrayItem('regions', r, 2)} 
                    className={cn(
                      "py-3 text-[10px] font-bold border transition-all rounded-sm uppercase text-center w-full", 
                      formData.regions.includes(r) 
                        ? "bg-[#d95f02]/20 border-[#d95f02] text-white shadow-[0_0_8px_rgba(249,115,22,0.15)]" 
                        : "bg-white/5 border-white/10 text-slate-600 hover:text-white"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* DATA CHANNEL */}
          <input type="hidden" name="age" value={formData.age} />
          <input type="hidden" name="familyStatus" value={formData.familyStatus} />
          <input type="hidden" name="currency" value={formData.currency} />
          {formData.qualifications.map(q => <input key={q} type="hidden" name="qualifications_cb" value={q} />)}
          {formData.objectives.map(o => <input key={o} type="hidden" name="objectives_cb" value={o} />)}
          {formData.regions.map(r => <input key={r} type="hidden" name="regions_cb" value={r} />)}

          {/* 🛡️ UI Error Display */}
          {showValidationErrors && formData.qualifications.length === 0 && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 text-red-500 text-[11px] font-black uppercase tracking-widest flex items-center gap-3 animate-in zoom-in-95">
              <AlertTriangle className="size-4 shrink-0" /> 
              <span className="leading-tight">Please select your active teaching qualification. This is a required field.</span>
            </div>
          )}

          {showValidationErrors && formData.qualifications.includes('None') && (
            <div className="p-4 bg-[#d95f02]/10 border border-[#d95f02]/30 text-[#d95f02] text-[11px] font-black uppercase tracking-widest flex items-center gap-3 animate-in zoom-in-95 text-left leading-relaxed">
              <AlertTriangle className="size-4 shrink-0 text-[#d95f02]" /> 
              <span>To ensure high-fidelity school matching and deployment compliance, a recognized state/national teaching credential (e.g. QTS, SACE, State Licensing) is required. Unfortunately, without a verified qualification, we cannot run full deployment planning reports.</span>
            </div>
          )}

          {showValidationErrors && formData.regions.length === 0 && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 text-red-500 text-[11px] font-black uppercase tracking-widest flex items-center gap-3 animate-in zoom-in-95">
              <AlertTriangle className="size-4 shrink-0" /> 
              <span className="leading-tight">Please select at least one Target Region.</span>
            </div>
          )}

          <SubmitButton 
            isPending={isPending} 
            isDirty={isDirty} 
            isDisabled={false} 
          />
        </form>

      </div>
    </div>
  );
}