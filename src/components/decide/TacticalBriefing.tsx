'use client'

import React, { useState, useEffect } from 'react';
// 🛠️ FIX: Pointing to the new isolated intelligence flow
import { getTacticalBriefing } from '@/ai/flows/tactical-teacher-briefing-flow';

interface Props {
  userProfile: { 
    age: number; 
    familyStatus: string; 
    spouseWorking: boolean 
  };
  schoolData: any;
  colData: any;
}

export default function TacticalBriefing({ userProfile, schoolData, colData }: Props) {
  const [briefing, setBriefing] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    
    async function fetchBriefing() {
      try {
        // Call the dedicated teacher-to-teacher flow
        const response = await getTacticalBriefing({
          schoolName: schoolData.idschoolname || "this school",
          coreSchoolData: JSON.stringify(schoolData),
          colData: JSON.stringify(colData),
          userProfile: userProfile,
        });
        
        setBriefing(response.briefing);
      } catch (err) {
        console.error("Briefing Error:", err);
        setBriefing("Tactical intelligence currently offline. Please check your connection.");
      } finally {
        setLoading(false);
      }
    }

    if (schoolData && colData) {
      fetchBriefing();
    }
  }, [schoolData, colData, userProfile]);

  // The "Hydration Guard" - prevents the 'reading call' error
  if (!isMounted) return null;

  return (
    <section className="w-full bg-[#020617] p-8 border-l-4 border-[#d95f02] my-8 shadow-xl">
      <h2 className="text-3xl font-black tracking-tighter text-white mb-6 uppercase">
        Institutional Intelligence: {schoolData?.idschoolname || "Strategic Overview"}
      </h2>

      <div className="space-y-6 text-slate-300 leading-relaxed text-lg font-normal">
        {loading ? (
          <div className="flex items-center space-x-3 text-[#007FFF]">
            <div className="w-2 h-2 bg-[#d95f02] animate-ping rounded-full" />
            <span className="font-bold tracking-tight">Synthesizing Senior Staff Briefing...</span>
          </div>
        ) : (
          /* Using whitespace-pre-wrap to respect the AI's paragraph spacing */
          <div className="whitespace-pre-wrap opacity-100 transition-opacity duration-700">
            {briefing}
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center text-[10px] uppercase tracking-[0.2em] font-black text-slate-500">
        <span>Leopardfish Tactical System</span>
        <span className="text-[#007FFF]">Decide Phase Intelligence</span>
      </div>
    </section>
  );
}