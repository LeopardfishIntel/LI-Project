"use client";

import { useState } from 'react';
import type { School } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Loader2, Sparkles, ServerCrash, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AiSchoolInsightsSummaryOutput {
    summary: string;
    pros: string[];
    cons: string[];
}

export function LeopardFishInsights({ school }: { school: School }) {
    const [result, setResult] = useState<{ insights: AiSchoolInsightsSummaryOutput | null, error?: string } | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleFetchInsights() {
        if (!school?.id) return;
        setLoading(true);
        setResult(null);

        try {
            const response = await fetch('/api/analyze-fit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    schoolId: school.id,
                    schoolName: school.name,
                    context: "summary_request" 
                })
            });

            if (!response.ok) throw new Error("Intelligence Uplink Failed");
            
            const data = await response.json();
            
            let insightData: AiSchoolInsightsSummaryOutput;
            try {
                insightData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
            } catch (parseError) {
                throw new Error("Failed to decode intelligence payload.");
            }
            
            setResult({ insights: insightData, error: data.error });
        } catch (err: any) {
            setResult({ insights: null, error: err.message || "Tactical error during synthesis" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card className="bg-[#1f2937]/40 backdrop-blur-md border-white/10 h-full flex flex-col overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-white/5 bg-white/5 py-4">
                <CardTitle className="text-lg font-black uppercase tracking-tighter italic text-white">
                    {school.name || "Target"} Intel
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col p-6">
                {!loading && !result && (
                    <div className="flex flex-col items-center justify-center text-center flex-grow py-8 min-h-[200px]">
                        <div className="p-3 bg-primary/10 rounded-full mb-4 animate-pulse">
                            <Sparkles className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="font-black text-white uppercase tracking-tighter text-lg mb-2 italic">LeopardFish Insights</h3>
                        <p className="text-[#94a3b8] mb-6 text-[10px] font-black uppercase tracking-widest max-w-xs">
                            Synthesize teacher reviews into a strategic briefing.
                        </p>
                        <Button 
                            onClick={handleFetchInsights}
                            className="bg-primary hover:bg-orange-600 text-white font-black uppercase tracking-widest px-8 rounded-sm h-12 shadow-lg transition-all"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            GENERATE ANALYSIS
                        </Button>
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center flex-grow py-8 min-h-[200px] space-y-4">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <div className="text-center">
                            <p className="text-sm font-black text-white uppercase tracking-tighter italic">Analysing Dossier...</p>
                            <p className="text-[9px] text-[#94a3b8] font-black uppercase tracking-[0.3em] mt-1 animate-pulse">Establishing Comms Link</p>
                        </div>
                    </div>
                )}

                {result?.error && (
                     <div className="flex flex-col items-center justify-center text-center flex-grow py-8 min-h-[200px] bg-red-500/5 rounded-sm border border-red-500/20">
                        <ServerCrash className="w-10 h-10 text-red-500 mb-4" />
                        <h3 className="font-black text-white uppercase tracking-tighter italic">ANALYSIS FAILED</h3>
                        <p className="text-red-400 mb-6 text-[10px] font-bold uppercase tracking-widest px-6">{result.error}</p>
                        <Button variant="outline" onClick={handleFetchInsights} className="border-red-500/50 text-red-500 font-black uppercase tracking-widest text-[9px]">
                            RETRY PROTOCOL
                        </Button>
                    </div>
                )}

                {result?.insights && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> Strategic Summary
                            </h3>
                            <blockquote className="text-[#94a3b8] italic border-l-2 border-primary pl-4 text-sm md:text-base font-bold leading-relaxed">
                                "{result.insights.summary || "No briefing available."}"
                            </blockquote>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t border-white/5">
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-green-400 flex items-center gap-2">
                                    <ThumbsUp className="w-4 h-4" /> Tactical Assets
                                </h3>
                                <ul className="space-y-2 text-xs text-[#94a3b8] font-bold">
                                    {result.insights.pros?.map((pro, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-green-400">•</span> {pro}
                                        </li>
                                    )) || <li className="italic opacity-50">No data.</li>}
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400 flex items-center gap-2">
                                    <ThumbsDown className="w-4 h-4" /> Material Risks
                                </h3>
                                <ul className="space-y-2 text-xs text-[#94a3b8] font-bold">
                                    {result.insights.cons?.map((con, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-red-400">•</span> {con}
                                        </li>
                                    )) || <li className="italic opacity-50">No data.</li>}
                                </ul>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/5 text-center">
                            <Button variant="ghost" onClick={handleFetchInsights} className="text-[#94a3b8] hover:text-primary font-black uppercase tracking-[0.3em] text-[9px]">
                                <Sparkles className="w-3 h-3 mr-2"/>
                                REGENERATE BRIEFING
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}