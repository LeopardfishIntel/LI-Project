 "use client";

import { useState, useMemo } from 'react';
import type { School } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, ServerCrash, Trophy, CheckCircle2, Building, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Protocol: Explicit interface for the AI output
export interface AiSchoolComparisonOutput {
    bestFit: {
        schoolName: string;
        verdictSections: { heading: string; content: string }[];
    };
    schoolBreakdowns: { schoolName: string; summary: string }[];
}

export function LeopardfishComparisonInsights({ schools, netSalaries }: { schools: School[], netSalaries: string[] }) {
    const [result, setResult] = useState<{ comparison: AiSchoolComparisonOutput | null, error?: string } | null>(null);
    const [loading, setLoading] = useState(false);

    // Protocol: Ensure we have at least 2 schools with numeric salaries before enabling button
    const canRunAnalysis = useMemo(() => {
        if (!schools || schools.length < 2) return false;
        const filledCount = schools.filter((_, idx) => {
            const val = netSalaries[idx];
            return val && val.trim() !== '' && !isNaN(parseInt(val)) && parseInt(val) > 0;
        }).length;
        return filledCount >= 2;
    }, [schools, netSalaries]);

    async function handleFetchComparison() {
        if (!canRunAnalysis) return;
        setLoading(true);
        setResult(null);

        try {
            // Protocol: Direct fetch to API route to bypass Server Action import constraints
            const response = await fetch('/api/analyze-fit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schools: schools.filter((_, i) => netSalaries[i] && parseInt(netSalaries[i]) > 0),
                    salaries: netSalaries.filter(s => s && parseInt(s) > 0)
                })
            });

            if (!response.ok) throw new Error("Intelligence Uplink Failed");
            
            const data = await response.json();
            
            // Handle the nested data structure from the API route
            const comparisonData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
            setResult({ comparison: comparisonData, error: data.error });
        } catch (err: any) {
            setResult({ comparison: null, error: err.message || "Unknown tactical error" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card className="bg-[#1f2937]/40 backdrop-blur-md border-white/10 w-full overflow-hidden shadow-2xl">
            <CardHeader className="text-center border-b border-white/5 py-6">
                <CardTitle className="text-xl font-black tracking-tighter uppercase italic text-white">Leopardfish comparative analysis</CardTitle>
                <p className="text-[#94a3b8] text-[10px] font-black uppercase tracking-widest mt-2 max-w-lg mx-auto leading-relaxed">
                    Establish at least two dossiers with confirmed salary offers to initialize the tactical comparison engine.
                </p>
            </CardHeader>
            <CardContent className="p-6">
                {!loading && !result && (
                    <div className="flex flex-col items-center justify-center text-center py-8">
                        <div className="p-4 bg-primary/10 rounded-full mb-6 animate-pulse">
                            <Sparkles className="w-10 h-10 text-primary" />
                        </div>
                        
                        {!canRunAnalysis && (
                            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-sm flex items-center gap-3">
                                <AlertCircle className="size-4 text-red-500" />
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">
                                    INSUFFICIENT INTEL: INPUT SALARY DATA
                                </p>
                            </div>
                        )}

                        <Button 
                            onClick={handleFetchComparison} 
                            disabled={!canRunAnalysis}
                            className={cn(
                                "font-black uppercase tracking-widest px-12 h-14 rounded-sm transition-all",
                                canRunAnalysis ? "bg-primary hover:bg-orange-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)]" : "bg-white/5 text-white/20 cursor-not-allowed"
                            )}
                        >
                            <Sparkles className="w-5 h-5 mr-3" />
                            INITIALIZE ANALYSIS
                        </Button>
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-6">
                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                        <div className="text-center">
                            <p className="text-sm font-black text-white uppercase tracking-tighter italic">Processing school signals...</p>
                            <p className="text-[10px] text-[#94a3b8] font-black uppercase tracking-[0.3em] mt-2 animate-pulse">Securing satellite uplink</p>
                        </div>
                    </div>
                )}

                {result?.error && (
                     <div className="flex flex-col items-center justify-center text-center py-10 bg-red-500/5 rounded-sm border border-red-500/20">
                        <ServerCrash className="w-12 h-12 text-red-500 mb-4" />
                        <h3 className="font-black text-white uppercase tracking-tighter italic">PROTOCOL FAILURE</h3>
                        <p className="text-red-400 mb-8 text-[10px] font-bold uppercase tracking-widest px-6">{result.error}</p>
                        <Button variant="outline" onClick={handleFetchComparison} className="font-black border-red-500/50 text-red-500 hover:bg-red-500/10">
                            RETRY UPLINK
                        </Button>
                    </div>
                )}

                {result?.comparison && (
                    <div className="space-y-10 w-full">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Trophy className="w-6 h-6 text-primary" />
                                <h3 className="font-black text-xl text-white uppercase italic tracking-tighter">Strategic Verdict</h3>
                            </div>
                             <Card className="bg-primary/5 border-primary/20 rounded-sm overflow-hidden shadow-none border-l-4">
                                <div className="p-6 md:p-8 space-y-8">
                                    <div className="flex items-center gap-3 text-primary border-b border-white/5 pb-6">
                                        <CheckCircle2 className="size-6" />
                                        <span className="text-2xl font-black uppercase italic tracking-tighter">{result.comparison.bestFit.schoolName}</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-8">
                                        {result.comparison.bestFit.verdictSections.map((section, idx) => (
                                            <div key={`verdict-${idx}`} className="space-y-3">
                                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">{section.heading}</h4>
                                                <p className="text-[#94a3b8] text-sm md:text-base leading-relaxed font-bold">
                                                    {section.content}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {result.comparison.schoolBreakdowns && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Building className="w-6 h-6 text-[#007FFF]" />
                                    <h3 className="font-black text-xl text-white uppercase italic tracking-tighter">Operative Breakdowns</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {result.comparison.schoolBreakdowns.map((school, idx) => (
                                        <Card key={idx} className="bg-white/5 border-white/10 rounded-sm">
                                            <CardHeader className="p-4 border-b border-white/5 bg-white/5">
                                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/80">{school.schoolName}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-5">
                                                <p className="text-xs text-[#94a3b8] leading-relaxed font-bold">
                                                    {school.summary}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <div className="text-center pt-8 border-t border-white/5">
                            <Button variant="ghost" onClick={handleFetchComparison} className="text-[#94a3b8] hover:text-primary font-black uppercase tracking-[0.3em] text-[9px]">
                                <Sparkles className="w-4 h-4 mr-2"/>
                                REGENERATE ANALYSIS
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}