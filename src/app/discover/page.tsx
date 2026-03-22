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

  const [profile, setProfile] = useState({
    age: "35+",
    qualifications: [] as string[],
    familyStatus: "",
    curriculum: [] as string[],
    location: "",
    salary: "",
    currency: "USD",
    goals: [] as string[],
    regions: [] as string[]
  });

  // 🛰️ PERSISTENCE: Restore previous data on mount
  useEffect(() => {
    setMounted(true);
    const savedProfile = localStorage.getItem('lf_profile');
    if (savedProfile) setProfile(JSON.parse(savedProfile));
  }, []);

  const regionsQuery = useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'locations_costOfLiving') : null), [firestore, mounted]);
  const { data: costOfLivingData } = useCollection<any>(regionsQuery);

  const availableRegions = useMemo(() => {
    if (costOfLivingData && costOfLivingData.length > 0) {
      return Array.from(new Set(costOfLivingData.map((d: any) => d.region))).filter(Boolean).sort() as string[];
    }
    return ["Africa", "Americas", "East Asia", "Europe", "Middle East", "South Asia", "Southeast Asia"];
  }, [costOfLivingData]);

  const toggleArrayItem = (field: 'qualifications' | 'curriculum' | 'goals' | 'regions', value: string, max?: number) => {
    setProfile(prev => {
      const current = prev[field] as string[];
      if (current.includes(value)) return { ...prev, [field]: current.filter(i => i !== value) };
      if (max && current.length >= max) return prev;
      return { ...prev, [field]: [...current, value] };
    });
  };

  const handleLaunch = () => {
    if (profile.regions.length === 0) return;
    setIsGenerating(true);
    
    // Remember choices for next time
    localStorage.setItem('lf_profile', JSON.stringify(profile));

    const params = new URLSearchParams({
      age: profile.age,
      qualifications: profile.qualifications.join(','),
      familyStatus: profile.familyStatus,
      curriculum: profile.curriculum.join(','),
      location: profile.location,
      salary: `${profile.currency} ${profile.salary}`,
      goals: profile.goals.join(','),
      regions: profile.regions.join(',')
    });

    const primaryRegion = profile.regions[0].toLowerCase().replace(/\s+/g, '-');
    
    setTimeout(() => {
      router.push(`/discover/${primaryRegion}?${params.toString()}`);
    }, 1500);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-8 lg:p-12 font-sans selection:bg-[#f97316]">
      <div className="max-w-5xl w-full space-y-12 animate-in fade-in duration-500">
        
        <div className="text-center space-y-4">
          <h1 className="text-7xl font-black text-white uppercase tracking-tighter leading-none">Find your Fit.</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-sm max-w-xl mx-auto italic leading-relaxed">
            Your profile, our direction. We've replaced the guesswork with data driven insights.
          </p>
        </div>
        
        <div className="bg-[#0b1224]/50 border border-white/5 p-8 lg:p-16 rounded-sm shadow-2xl relative backdrop-blur-md">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#f97316]/20" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-16 text-left">
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><User className="size-3" /> Age</label>
              <Select defaultValue={profile.age} onValueChange={(v) => setProfile({...profile, age: v})}>
                <SelectTrigger className="bg-black/40 border-white/10 text-white h-14 font-bold text-lg px-6"><SelectValue placeholder="Select Age" /></SelectTrigger>
                <SelectContent className="bg-[#0b1224] border-white/10 text-white">
                  {["25+", "35+", "50+", "60+", "65+"].map(a => <SelectItem key={a} value={a} className="font-bold">{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <GraduationCap className="size-3" /> Qualifications <span className="text-[9px] text-[#f97316] lowercase opacity-60">(reselect to add)</span>
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full bg-black/40 border border-white/10 text-white h-14 px-6 rounded-md text-left flex justify-between items-center outline-none font-bold text-lg">
                  <span className="truncate">{profile.qualifications.length > 0 ? profile.qualifications.join(", ") : "Select All"}</span>
                  <Check className="size-3 opacity-30" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#0b1224] border-white/10 text-white w-[300px]">
                  {["B.Ed", "PGCE", "MA Education", "PhD", "QTS", "iPGCE"].map(q => (
                    <DropdownMenuCheckboxItem key={q} checked={profile.qualifications.includes(q)} onCheckedChange={() => toggleArrayItem('qualifications', q)} className="font-bold py-3">{q}</DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Users className="size-3" /> Family Status</label>
              <Select defaultValue={profile.familyStatus} onValueChange={(v) => setProfile({...profile, familyStatus: v})}>
                <SelectTrigger className="bg-black/40 border-white/10 text-white h-14 font-bold text-lg px-6"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent className="bg-[#0b1224] border-white/10 text-white">
                  {["Single", "Married (Sole Earner)", "Family (1 Child)", "Family (2 Children)", "Family (3 or More)"].map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <BookOpen className="size-3" /> Curriculum Experience <span className="text-[9px] text-[#f97316] lowercase opacity-60">(reselect to add)</span>
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full bg-black/40 border border-white/10 text-white h-14 px-6 rounded-md text-left flex justify-between items-center outline-none font-bold text-lg">
                  <span className="truncate">{profile.curriculum.length > 0 ? profile.curriculum.join(", ") : "Select All"}</span>
                  <Check className="size-3 opacity-30" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#0b1224] border-white/10 text-white w-[300px]">
                  {["British", "IB", "American", "Australian", "Canadian", "Montessori"].map(c => (
                    <DropdownMenuCheckboxItem key={c} checked={profile.curriculum.includes(c)} onCheckedChange={() => toggleArrayItem('curriculum', c)} className="font-bold py-3">{c}</DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><MapPin className="size-3" /> Current Location</label>
              <Input value={profile.location} placeholder="City, Country" className="bg-black/40 border-white/10 h-14 text-white text-lg font-bold px-6 placeholder:text-slate-700" onChange={(e) => setProfile({...profile, location: e.target.value})} />
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Wallet className="size-3" /> Current Salary</label>
              <div className="flex gap-2">
                <div className="w-28">
                  <Select defaultValue={profile.currency} onValueChange={(v) => setProfile({...profile, currency: v})}>
                    <SelectTrigger className="bg-black/40 border-white/10 text-white h-14 font-bold text-lg"><SelectValue placeholder="USD" /></SelectTrigger>
                    <SelectContent className="bg-[#0b1224] border-white/10 text-white">
                      {["USD", "GBP", "EUR", "AED", "SAR", "QAR", "SGD", "AUD", "THB"].map(curr => <SelectItem key={curr} value={curr}>{curr}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Input value={profile.salary} placeholder="Annual Amount" className="bg-black/40 border-white/10 h-14 text-white text-lg font-bold px-6 flex-1 placeholder:text-slate-700" onChange={(e) => setProfile({...profile, salary: e.target.value})} />
              </div>
            </div>
          </div>

          {/* 🎯 OPERATIONAL GOALS */}
          <div className="mb-12 text-left space-y-6 pt-10 border-t border-white/5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Target className="size-3" /> Operational Goals (Max 2)</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {["Savings", "Career Growth", "Adventure", "Balanced"].map((goal) => (
                    <button key={goal} onClick={() => toggleArrayItem('goals', goal, 2)} className={cn("h-16 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-sm border", profile.goals.includes(goal) ? "bg-[#f97316] border-[#f97316] text-white" : "bg-white/5 border-white/10 text-slate-500 hover:border-white/20")}>{goal}</button>
                ))}
            </div>
          </div>

          {/* 🌍 TARGET REGIONS (RE-ADDED) */}
          <div className="mb-16 text-left space-y-6 pt-10 border-t border-white/5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Compass className="size-3" /> Target Regions</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {availableRegions.map((region) => (
                    <button key={region} onClick={() => toggleArrayItem('regions', region)} className={cn("h-16 px-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-sm border flex items-center justify-between group", profile.regions.includes(region) ? "bg-white/10 border-[#f97316] text-white" : "bg-white/5 border-white/10 text-slate-500 hover:border-white/20")}>
                      <span className="truncate">{region}</span>
                      {profile.regions.includes(region) && <Check className="size-3 text-[#f97316]" />}
                    </button>
                ))}
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 mt-12">
            <button 
              onClick={handleLaunch} 
              disabled={profile.regions.length === 0 || isGenerating} 
              className={cn(
                "w-full h-24 font-black uppercase tracking-[0.5em] text-2xl transition-all flex items-center justify-center gap-4 group border", 
                profile.regions.length > 0 && !isGenerating ? "bg-white text-black hover:bg-[#f97316] hover:text-white shadow-2xl border-white" : "bg-white/5 text-slate-700 border border-white/5 cursor-not-allowed"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-6 animate-spin text-[#f97316]" />
                  Initialising Profile...
                </>
              ) : (
                <>
                  <Zap className="size-6 transition-transform group-hover:scale-110" /> 
                  Generate Intelligence Dossier
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}