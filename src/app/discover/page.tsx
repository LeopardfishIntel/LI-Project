"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import { 
  User, GraduationCap, Users, BookOpen, MapPin, Wallet, Compass, Target, Check, Zap, Loader2 
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function FindYourFitGate() {
  const router = useRouter();
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const [profile, setProfile] = useState({
    age: "35+",
    qualifications: [] as string[],
    familyStatus: "single",
    curriculum: [] as string[],
    location: "",
    salary: "",
    currency: "USD",
    goals: [] as string[],
    regions: [] as string[]
  });

  useEffect(() => {
    setMounted(true);
    const savedProfile = localStorage.getItem('lf_profile');
    if (savedProfile) setProfile(JSON.parse(savedProfile));
  }, []);

  const regionsQuery = useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'locations_costOfLiving') : null), [firestore, mounted]);
  const { data: costOfLivingData } = useCollection<any>(regionsQuery);

  const availableRegions = useMemo(() => {
    const masterList = ["africa", "americas", "east asia", "europe", "middle east", "south asia", "southeast asia"];
    if (costOfLivingData && costOfLivingData.length > 0) {
      // 🛡️ ZERO-DOUBT SHIELD: Prevents 'toLowerCase' error on null/undefined regions
      const dbRegions = costOfLivingData
        .filter((d: any) => d && typeof d.region === 'string') 
        .map((d: any) => d.region.toLowerCase())
        .filter(Boolean);
      
      return Array.from(new Set([...masterList, ...dbRegions])).sort();
    }
    return masterList;
  }, [costOfLivingData]);

  const toggleArrayItem = (field: 'qualifications' | 'curriculum' | 'goals' | 'regions', value: string, max?: number) => {
    setProfile(prev => {
      let current = prev[field] as string[];
      if (field === 'qualifications') {
        if (value.toLowerCase() === 'none') {
          if (current.some(i => i.toLowerCase() === 'none')) {
            return { ...prev, qualifications: [] };
          }
          return { ...prev, qualifications: ['None'] };
        } else {
          current = current.filter(i => i.toLowerCase() !== 'none');
        }
      }
      
      const exists = current.some(item => item.toLowerCase() === value.toLowerCase());
      if (exists) {
        return { ...prev, [field]: current.filter(i => i.toLowerCase() !== value.toLowerCase()) };
      }
      
      const limit = field === 'regions' ? 2 : max;
      if (limit && current.length >= limit) return prev;
      
      return { ...prev, [field]: [...current, value] };
    });
  };

  const handleLaunch = () => {
    setShowValidationErrors(true);
    if (profile.regions.length === 0) return;
    if (profile.qualifications.length === 0 || profile.qualifications.some(q => q.toLowerCase() === 'none')) return;
    setIsGenerating(true);
    localStorage.setItem('lf_profile', JSON.stringify(profile));

    const params = new URLSearchParams({
      age: profile.age,
      regions: profile.regions.join(','),
      salary: `${profile.currency} ${profile.salary}`,
      status: profile.familyStatus,
      qualifications: profile.qualifications.join(','),
      curriculum: profile.curriculum.join(','),
      goals: profile.goals.join(',')
    });

    const primarySlug = profile.regions[0].toLowerCase().replace(/\s+/g, '-').replace('&', 'and');
    
    setTimeout(() => {
      router.push(`/discover/matrix?${params.toString()}`);
    }, 1200);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-8 lg:p-12 font-sans selection:bg-[#d95f02]">
      <div className="max-w-5xl w-full space-y-12 animate-in fade-in duration-500">
        
        {/* 🛡️ Header section: 25% Reduction & Orange Branding */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-6 py-1.5 border border-[#d95f02]/30 bg-[#d95f02]/10 text-[#d95f02] text-[13px] font-[900] tracking-[0.5em] mb-2 drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)] mx-auto">
             ⦿ Actionable intelligence
          </div>
          <h1 className="text-5xl font-black text-[#d95f02] tracking-tighter leading-none italic uppercase">
            Find your fit
          </h1>
          <p className="text-lg max-w-2xl mx-auto leading-relaxed">
            <span className="text-[#f1f5f9] font-bold border-b border-[#d95f02]/30 pb-1 uppercase">Your profile, our direction.</span> 
            <span className="text-slate-400 ml-2 italic">Intelligence-driven matching for the international educator.</span>
          </p>
        </div>
        
        <div className="bg-[#0b1224]/50 border border-white/5 p-8 lg:p-16 rounded-sm shadow-2xl relative backdrop-blur-md">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#d95f02]/20" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-16 text-left">
            {/* Age */}
            <div className="space-y-3">
              <label className="text-[14px] font-bold text-[#007FFF] tracking-wide flex items-center gap-2 uppercase">
                <User className="size-4" /> Age
              </label>
              <Select value={profile.age} onValueChange={(v) => setProfile({...profile, age: v})}>
                <SelectTrigger className="bg-black/40 border-white/10 text-white h-14 px-6 text-[18px] font-black"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold font-sans">
                  {["25+", "35+", "50+", "60+", "65+"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Qualifications */}
            <div className="space-y-3">
              <label className="text-[14px] font-bold text-[#007FFF] tracking-wide flex items-center gap-2 uppercase">
                <GraduationCap className="size-4" /> Qualifications
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full bg-black/40 border border-white/10 text-white h-14 px-6 rounded-md text-left flex justify-between items-center outline-none text-[18px] font-black">
                  <span className="truncate">{profile.qualifications.length > 0 ? profile.qualifications.join(", ").toUpperCase() : "SELECT ALL"}</span>
                  <Check className="size-4 text-[#007FFF] opacity-50" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#0b1224] border-white/10 text-white w-[280px]">
                  {["UK (QTS)", "US State", "ANZ Reg", "SA SACE", "EU State", "None"].map(q => (
                    <DropdownMenuCheckboxItem key={q} checked={profile.qualifications.some(item => item.toLowerCase() === q.toLowerCase())} onCheckedChange={() => toggleArrayItem('qualifications', q)} className="font-bold uppercase">{q}</DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Status */}
            <div className="space-y-3">
              <label className="text-[14px] font-bold text-[#007FFF] tracking-wide flex items-center gap-2 uppercase">
                <Users className="size-4" /> Status
              </label>
              <Select value={profile.familyStatus} onValueChange={(v) => setProfile({...profile, familyStatus: v})}>
                <SelectTrigger className="bg-black/40 border-white/10 text-white h-14 px-6 text-[18px] font-black uppercase"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold font-sans">
                  {["single", "married (sole earner)", "married (dual income)", "family (1 child)", "family (2 children)", "family (3 or more)"].map(s => {
                    let display = s.toUpperCase();
                    if (s === "married (sole earner)") display = "COUPLE (SOLE)";
                    if (s === "married (dual income)") display = "COUPLE (DUAL)";
                    if (s === "family (1 child)") display = "2 + 1";
                    if (s === "family (2 children)") display = "2 + 2";
                    if (s === "family (3 or more)") display = "2 + 3";
                    return <SelectItem key={s} value={s}>{display}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Curriculum */}
            <div className="space-y-3">
              <label className="text-[14px] font-bold text-[#007FFF] tracking-wide flex items-center gap-2 uppercase">
                <BookOpen className="size-4" /> Curriculum
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full bg-black/40 border border-white/10 text-white h-14 px-6 rounded-md text-left flex justify-between items-center outline-none text-[18px] font-black">
                  <span className="truncate">{profile.curriculum.length > 0 ? profile.curriculum.join(", ").toUpperCase() : "SELECT ALL"}</span>
                  <Check className="size-4 text-[#007FFF] opacity-50" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#0b1224] border-white/10 text-white w-[280px]">
                  {["british", "ib", "american", "australian", "canadian", "montessori"].map(c => (
                    <DropdownMenuCheckboxItem key={c} checked={profile.curriculum.some(item => item.toLowerCase() === c.toLowerCase())} onCheckedChange={() => toggleArrayItem('curriculum', c)} className="font-bold uppercase">{c}</DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Location */}
            <div className="space-y-3">
              <label className="text-[14px] font-bold text-[#007FFF] tracking-wide flex items-center gap-2 uppercase">
                <MapPin className="size-4" /> Current location
              </label>
              <Input value={profile.location} placeholder="CITY, COUNTRY" className="bg-black/40 border-white/10 h-14 text-white px-6 text-[18px] font-black uppercase" onChange={(e) => setProfile({...profile, location: e.target.value})} />
            </div>

            {/* Salary */}
            <div className="space-y-3">
              <label className="text-[14px] font-bold text-[#007FFF] tracking-wide flex items-center gap-2 uppercase">
                <Wallet className="size-4" /> Current salary
              </label>
              <div className="flex gap-2">
                <Select value={profile.currency} onValueChange={(v) => setProfile({...profile, currency: v})}>
                  <SelectTrigger className="bg-black/40 border-white/10 text-white h-14 w-28 px-4 text-[18px] font-black"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold font-sans">
                    {["USD", "GBP", "EUR", "AED", "SAR", "QAR", "SGD", "AUD", "THB"].map(curr => <SelectItem key={curr} value={curr}>{curr}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input value={profile.salary} placeholder="ANNUAL AMOUNT" className="bg-black/40 border-white/10 h-14 text-white px-6 flex-1 text-[18px] font-black uppercase" onChange={(e) => setProfile({...profile, salary: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Operational goals */}
          <div className="mb-12 text-left space-y-6 pt-10 border-t border-white/5">
            <label className="text-[14px] font-bold text-[#007FFF] tracking-wide flex items-center gap-2 uppercase">
              <Target className="size-4" /> Operational goals (Max 2)
            </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { id: 'savings', label: 'savings', tip: 'Calculated as Net Salary vs. Housing/Living Index.' },
                    { id: 'career growth', label: 'career growth', tip: 'Evaluates the density of top-tier accredited schools, professional development norms, and internal leadership pathways.' },
                    { id: 'adventure', label: 'adventure', tip: 'Calculated as Travel Connectivity vs. Geographic Diversity—including access to desert safaris, jungle trekking, and world-class diving.' },
                    { id: 'culture', label: 'culture', tip: 'Scores the ease of local integration, English proficiency, and access to historic architecture, theatre, and heritage sites.' }
                  ].map((goal) => {
                      const isActive = profile.goals.some(g => g.toLowerCase() === goal.id.toLowerCase());
                      return (
                        <button 
                          key={goal.id}
                          type="button"
                          onClick={() => toggleArrayItem('goals', goal.id, 2)} 
                          className={cn(
                            "h-16 text-[13px] font-black tracking-[0.2em] transition-all rounded-sm border uppercase", 
                            isActive 
                              ? "bg-[#d95f02] border-[#d95f02] text-white shadow-[0_0_20px_rgba(249,115,22,0.3)]" 
                              : "bg-white/5 border-white/10 text-slate-500 hover:border-[#007FFF]/50"
                          )}
                        >
                          {goal.label}
                        </button>
                      );
                  })}
              </div>
          </div>

          {/* Target regions */}
          <div className="mb-16 text-left space-y-6 pt-10 border-t border-white/5">
            <label className="text-[14px] font-bold text-[#007FFF] tracking-wide flex items-center gap-2 uppercase">
              <Compass className="size-4" /> Target regions (Max 2)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {availableRegions.map((region) => {
                    const isActive = profile.regions.some(r => r.toLowerCase() === region.toLowerCase());
                    const isDisabled = !isActive && profile.regions.length >= 2;
                    return (
                      <button 
                        key={region} 
                        type="button"
                        onClick={() => toggleArrayItem('regions', region)} 
                        className={cn(
                          "h-16 px-6 text-[13px] font-black tracking-[0.2em] transition-all rounded-sm border flex items-center justify-between group uppercase", 
                          isActive 
                            ? "bg-white/10 border-[#d95f02] text-white shadow-[0_0_20px_rgba(249,115,22,0.1)]" 
                            : isDisabled ? "bg-white/5 border-white/5 text-slate-700 cursor-not-allowed" : "bg-white/5 border-white/10 text-slate-500 hover:border-[#007FFF]/50"
                        )}
                      >
                        <span className="truncate">{region}</span>
                        {isActive && <Check className="size-4 text-[#007FFF]" />}
                      </button>
                    );
                })}
            </div>
          </div>

          {/* UI Warning Display if None is Selected */}
          {showValidationErrors && profile.qualifications.some(q => q.toLowerCase() === 'none') && (
            <div className="p-4 bg-[#d95f02]/10 border border-[#d95f02]/30 text-[#d95f02] text-xs font-black uppercase tracking-widest flex items-center gap-3 text-left leading-relaxed mb-6">
              <span className="shrink-0 size-5 flex items-center justify-center border border-[#d95f02] rounded-full font-bold">!</span>
              <span>To ensure deployment compliance, a recognized state/national teaching qualification is required. Unfortunately, without a verified qualification, we cannot run full matching reports.</span>
            </div>
          )}

          {showValidationErrors && profile.qualifications.length === 0 && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-black uppercase tracking-widest flex items-center gap-3 text-left leading-relaxed mb-6">
              <span className="shrink-0 size-5 flex items-center justify-center border border-red-500 rounded-full font-bold">!</span>
              <span>Please select your active teaching qualification. This is a required field.</span>
            </div>
          )}

          <button 
            onClick={handleLaunch} 
            disabled={isGenerating} 
            className={cn(
              "w-full h-24 tracking-[0.2em] text-2xl font-black transition-all flex items-center justify-center gap-4 border-2 shadow-2xl", 
              !isGenerating ? "bg-black border-[#d95f02] text-slate-200 hover:bg-[#d95f02] hover:text-black" : "opacity-20 cursor-not-allowed text-slate-700"
            )}
          >
            {isGenerating ? <Loader2 className="size-8 animate-spin text-[#d95f02]" /> : <><Zap className="size-6" /> Leopardfish Intel Analysis</>}
          </button>
        </div>
      </div>
    </div>
  );
}