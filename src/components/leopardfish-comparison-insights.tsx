
"use client";

import { useState, useMemo } from 'react';
import type { School } from '@/lib/types';
import { getSchoolComparisonInsights } from '@/app/compare/actions';
import type { AiSchoolComparisonOutput } from '@/ai/flows/ai-school-comparison-flow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, ServerCrash, Trophy, CheckCircle2, Building, AlertCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

export function LeopardfishComparisonInsights({ schools, netSalaries }: { schools: School[], netSalaries: string[] }) {
    const [result, setResult] = useState<{ comparison: AiSchoolComparisonOutput | null, error?: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const canRunAnalysis = useMemo(() => {
        if (!schools || schools.length < 2) return false;
        const filledCount = schools.filter((_, idx) => {
            const val = netSalaries[idx];
            return val && val.trim() !== '' && parseInt(val) > 0;
        }).length;
        return filledCount >= 2;
    }, [schools, netSalaries]);

    async function handleFetchComparison() {
        if (!canRunAnalysis) return;
        setLoading(true);
        setResult(null);

        const activeIndices = schools
            .map((_, idx) => idx)
            .filter(idx => netSalaries[idx] && netSalaries[idx].trim() !== '' && parseInt(netSalaries[idx]) > 0);
        
        const activeSchools = activeIndices.map(idx => schools[idx]);
        const activeSalaries = activeIndices.map(idx => netSalaries[idx]);

        const res = await getSchoolComparisonInsights(activeSchools, activeSalaries);
        setResult(res);
        setLoading(false);
    }

    return (
        <Card className="glass border-border w-full">
            <CardHeader className="text-center border-b border-white/5 py-4">
                <CardTitle className="text-xl font-bold tracking-tight normal-case">Leopardfish comparative analysis</CardTitle>
                <p className="text-muted-foreground text-sm mt-2 max-w-lg mx-auto leading-relaxed font-medium">
                    Please ensure you input your confirmed monthly salary offers at the top of this page. We require at least two completed dossiers to generate an accurate tactical comparison.
                </p>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col p-4 md:p-6">
                {!loading && !result && (
                    <div className="flex flex-col items-center justify-center text-center flex-grow py-6 min-h-[150px]">
                        <div className="p-3 bg-primary/10 rounded-full mb-4">
                            <Sparkles className="w-8 h-8 text-primary" />
                        </div>
                        
                        {!canRunAnalysis && (
                            <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="size-4 text-destructive" />
                                <p className="text-xs font-bold text-destructive uppercase tracking-widest">
                                    Salary data required: complete at least two dossiers
                                </p>
                            </div>
                        )}

                        <Button 
                            onClick={handleFetchComparison} 
                            disabled={!canRunAnalysis}
                            size="lg" 
                            className={cn(
                                "font-bold tracking-widest px-10 rounded-sm transition-all h-12",
                                canRunAnalysis ? "bg-primary hover:bg-primary/90 text-white" : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                            )}
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Run analysis
                        </Button>
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center flex-grow py-8 min-h-[180px] space-y-4">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <div className="text-center space-y-1">
                            <p className="text-sm font-bold text-white tracking-tight">Analysing school signals...</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">Establishing secure uplink</p>
                        </div>
                    </div>
                )}

                {result?.error && (
                     <div className="flex flex-col items-center justify-center text-center flex-grow py-8 min-h-[180px] bg-destructive/5 rounded-sm border border-destructive/20 w-full">
                        <ServerCrash className="w-10 h-10 text-destructive mb-3" />
                        <h3 className="font-bold text-base text-destructive mb-2">Analysis failure</h3>
                        <p className="text-destructive/80 mb-6 text-xs px-4 max-w-md">{result.error}</p>
                        <Button variant="destructive" size="sm" onClick={handleFetchComparison} className="font-bold tracking-widest text-[10px]">
                            Retry protocol
                        </Button>
                    </div>
                )}

                {result?.comparison && (
                    <div className="space-y-8 w-full text-left">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-primary" />
                                <h3 className="font-bold text-lg tracking-tight normal-case">Final verdict</h3>
                            </div>
                             <Card className="bg-primary/5 border-primary/20 rounded-sm overflow-hidden shadow-none">
                                <div className="p-4 md:p-6 space-y-6">
                                    <div className="flex items-center gap-2 text-primary border-b border-white/5 pb-4">
                                        <CheckCircle2 className="size-5" />
                                        <span className="text-lg font-black uppercase tracking-tight">{result.comparison.bestFit.schoolName}</span>
                                    </div>
                                    
                                    <div className="space-y-6">
                                        {result.comparison.bestFit.verdictSections.map((section, idx) => (
                                            <div key={`verdict-${idx}`} className="space-y-2">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">{section.heading}</h4>
                                                <p className="text-muted-foreground text-sm md:text-base leading-relaxed font-medium">
                                                    {section.content}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {result.comparison.schoolBreakdowns && result.comparison.schoolBreakdowns.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Building className="w-5 h-5 text-accent" />
                                    <h3 className="font-bold text-lg tracking-tight normal-case">School breakdowns</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {result.comparison.schoolBreakdowns.map((school, idx) => (
                                        <Card key={`${school.schoolName}-${idx}`} className="glass bg-white/2 border-white/5 flex flex-col h-full rounded-sm shadow-none">
                                            <CardHeader className="p-3 border-b border-white/5">
                                                <CardTitle className="text-sm font-black uppercase tracking-tight text-white/90">{school.schoolName}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-3 flex-grow">
                                                <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                                                    {school.summary}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <div className="text-center pt-4 border-t border-white/5">
                            <Button variant="ghost" size="sm" onClick={handleFetchComparison} className="text-muted-foreground hover:text-primary transition-colors font-bold tracking-widest text-[9px]">
                                <Sparkles className="w-3 h-3 mr-2"/>
                                Regenerate comparison
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
