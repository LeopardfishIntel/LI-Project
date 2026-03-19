 'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Globe, MapPin, Wallet, ShieldCheck, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const CURRICULUMS = ['British', 'US (American)', 'IB', 'Other'];
const REGIONS = ['Middle East', 'Southeast Asia', 'East Asia', 'Europe', 'Africa', 'Latin America'];

export default function IntelForm() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  const [formData, setFormData] = useState({
    age: '25-34', 
    family: 'Single', 
    location: '', 
    salary: '',
    qualifications: [] as string[], 
    curriculum: [] as string[],
    experience: '2', 
    subject: '',
    regions: [] as string[], 
    preferences: [] as string[], 
    goal: 'Maximize savings'
  });

  useEffect(() => { setMounted(true); }, []);

  // 🛡️ TACTICAL STATE HELPER
  const toggleArrayItem = (key: 'qualifications' | 'curriculum' | 'regions', value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(item => item !== value)
        : [...prev[key], value]
    }));
  };

  const handleExecuteAnalysis = async () => {
    setIsLoading(true);
    try {
      // Tactical Optional Chaining on the response
      const response = await fetch('/api/analyze-fit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      if (data?.status === 'success') {
        setResults(data);
      }
    } catch (err) {
      console.error("Link Lost (API Error):", err);
    } finally {
      setIsLoading(false);
    }
  };

  const TogglePill = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
    <button 
      type="button" 
      onClick={(e) => {
        e.preventDefault(); // Stop any bubbling
        onClick();
      }} 
      className={cn(
        "px-4 py-2 text-[10px] font-black tracking-widest rounded-sm border transition-all uppercase whitespace-nowrap", 
        active 
          ? "bg-[#f97316] border-[#f97316] text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]" 
          : "bg-white/5 border-white/10 text-gray-500 hover:text-white hover:bg-white/10"
      )}
    >
      {label}
    </button>
  );

  if (!mounted) return null;

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-6">
      <div className="size-12 border-2 border-[#f97316]/20 border-t-[#f97316] rounded-full animate-spin" />
      <div className="text-center animate-pulse">
        <h3 className="text-sm font-black text-white tracking-[0.4em] uppercase font-headline">Compiling Intelligence</h3>
        <p className="text-gray-500 text-[10px] mt-2 uppercase tracking-widest font-bold font-sans">Querying Global Databases</p>
      </div>
    </div>
  );

  if (results) return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="glass border-leopard p-8 rounded-sm">
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Intelligence Report Generated</h2>
        {/* Render your results mapping here */}
        <Button onClick={() => setResults(null)} variant="outline" className="border-white/10 text-white uppercase text-[10px] font-black">
          ← New Mission
        </Button>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto bg-white/[0.02] border border-white/5 p-8 md:p-12 rounded-sm shadow-2xl overflow-hidden">
      {/* STEP HEADER */}
      <div className="flex justify-between items-end mb-12 border-b border-white/5 pb-8">
        <div className="space-y-2">
          <p className="text-[#f97316] text-[10px] font-black uppercase tracking-[0.3em]">Step {step} of 2</p>
          <h2 className="text-3xl md:text-5xl font-normal text-white tracking-tighter font-headline">
            {step === 1 ? 'The Asset' : 'The Mission'}
          </h2>
        </div>
        <div className="flex gap-1 mb-2">
          <div className={cn("h-1 w-8 rounded-full transition-all duration-500", step === 1 ? "bg-[#f97316]" : "bg-white/20")}></div>
          <div className={cn("h-1 w-8 rounded-full transition-all duration-500", step === 2 ? "bg-[#f97316]" : "bg-white/10")}></div>
        </div>
      </div>

      {step === 1 ? (
        <div key="step-1" className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Age Range</label>
              <div className="flex flex-wrap gap-2">
                {['25-34', '35-49', '50-64', '65+'].map(age => (
                  <TogglePill key={age} label={age} active={formData.age === age} onClick={() => setFormData({...formData, age})} />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Experience (Years)</label>
              <input 
                type="number" 
                value={formData.experience} 
                onChange={(e) => setFormData({...formData, experience: e.target.value})} 
                className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-sm text-white focus:border-[#f97316] outline-none font-mono transition-colors" 
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Current Qualifications</label>
            <div className="flex flex-wrap gap-2">
              {['PGCE', 'B.Ed', 'Bachelors', 'Masters', 'QTS'].map(q => (
                <TogglePill 
                  key={q} 
                  label={q} 
                  active={formData.qualifications.includes(q)} 
                  onClick={() => toggleArrayItem('qualifications', q)} 
                />
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <label className="text-[10px] font-black text-[#f97316] uppercase tracking-widest">Curriculum Experience</label>
            <div className="flex flex-wrap gap-2">
              {CURRICULUMS.map(c => (
                <TogglePill 
                  key={c} 
                  label={c} 
                  active={formData.curriculum.includes(c)} 
                  onClick={() => toggleArrayItem('curriculum', c)} 
                />
              ))}
            </div>
          </div>

          <Button 
            onClick={() => setStep(2)} 
            className="w-full bg-[#f97316]/10 border border-[#f97316]/30 text-[#f97316] font-black h-14 tracking-[0.2em] uppercase hover:bg-[#f97316]/20 transition-all active:scale-[0.98]"
          >
            Establish Mission <ArrowRight className="size-4 ml-2" />
          </Button>
        </div>
      ) : (
        <div key="step-2" className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-[#007FFF] uppercase tracking-widest flex items-center gap-2">
              <Globe className="size-3" /> Target Intelligence Regions
            </label>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map(r => (
                <TogglePill 
                  key={r} 
                  label={r} 
                  active={formData.regions.includes(r)} 
                  onClick={() => toggleArrayItem('regions', r)} 
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Primary Objective</label>
            <div className="grid grid-cols-2 gap-2">
              {['Maximize savings', 'Seek adventure', 'Career growth', 'Lifestyle'].map(g => (
                <TogglePill key={g} label={g} active={formData.goal === g} onClick={() => setFormData({...formData, goal: g})} />
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={() => setStep(1)} variant="ghost" className="text-gray-500 font-bold uppercase tracking-widest text-[10px] hover:text-white">
              <ArrowLeft className="size-4 mr-2" /> Back
            </Button>
            <Button 
              onClick={handleExecuteAnalysis} 
              className="flex-1 bg-[#f97316] text-white font-black h-14 tracking-[0.2em] uppercase hover:bg-[#ea580c] shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all active:scale-[0.98]"
            >
              Execute Analysis
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}