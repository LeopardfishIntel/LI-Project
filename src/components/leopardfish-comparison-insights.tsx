
"use client";

import { useState } from 'react';
import type { School } from '@/lib/types';
import { getSchoolComparisonInsights } from '@/app/compare/actions';
import type { AiSchoolComparisonOutput } from '@/ai/flows/ai-school-comparison-flow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, ServerCrash, Trophy, CheckCircle2, Building } from 'lucide-react';

export function LeopardfishComparisonInsights({ schools }: { schools: School[] }) {
    const [result, setResult] = useState<{ comparison: AiSchoolComparisonOutput | null, error?: string } | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleFetchComparison() {
        if (!schools || schools.length < 2) return;
        setLoading(true);
        setResult(null);
        const res = await getSchoolComparisonInsights(schools);
        setResult(res);
        setLoading(false);
    }

    return (
        <Card className="glass border-border w-full">
            <CardHeader className="text-center border-b border-white/5 py-4">
                <CardTitle className="text-xl font-bold tracking-tight">Leopardfish comparative analysis</CardTitle>
                <p className="text-muted-foreground text-xs mt-2 max-w-lg mx-auto leading-relaxed font-medium">
                    Please ensure you input your confirmed salary offers at the top of this page. It’s the only way we can give you an accurate comparison of your selected schools.
                </p>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col p-4 md:p-6">
                {!loading && !result && (
                    <div className="flex flex-col items-center justify-center text-center flex-grow py-6 min-h-[150px]">
                        <div className="p-3 bg-primary/10 rounded-full mb-4">
                            <Sparkles className="w-8 h-8 text-primary" />
                        </div>
                        <Button onClick={handleFetchComparison} size="default" className="bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest px-8 rounded-sm">
                            <Sparkles className="w-4 h-4 mr-2" />
                            Run analysis
                        </Button>
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center flex-grow py-8 min-h-[180px] space-y-4">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <div className="text-center space-y-1">
                            <p className="text-sm font-bold text-white tracking-tight">Analysing schools...</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">Establishing secure uplink</p>
                        </div>
                    </div>
                )}

                {result?.error && (
                     <div className="flex flex-col items-center justify-center text-center flex-grow py-8 min-h-[180px] bg-destructive/5 rounded-sm border border-destructive/20 w-full">
                        <ServerCrash className="w-10 h-10 text-destructive mb-3" />
                        <h3 className="font-bold text-base text-destructive mb-2">Analysis failure</h3>
                        <p className="text-destructive/80 mb-6 text-xs px-4 max-w-md">{result.error}</p>
                        <Button variant="destructive" size="sm" onClick={handleFetchComparison} className="font-bold uppercase tracking-widest text-[10px]">
                            Retry protocol
                        </Button>
                    </div>
                )}

                {result?.comparison && (
                    <div className="space-y-8 w-full text-left">
                        {/* Final Verdict Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-primary" />
                                <h3 className="font-bold text-lg tracking-tight">Final verdict</h3>
                            </div>
                             <Card className="bg-primary/5 border-primary/20 rounded-sm overflow-hidden shadow-none">
                                <div className="p-4 md:p-6 space-y-6">
                                    <div className="flex items-center gap-2 text-primary border-b border-white/5 pb-4">
                                        <CheckCircle2 className="size-5" />
                                        <span className="text-lg font-black uppercase tracking-tight">{result.comparison.bestFit.schoolName}</span>
                                    </div>
                                    
                                    <div className="space-y-6">
                                        {result.comparison.bestFit.verdictSections.map((section, idx) => (
                                            <div key={idx} className="space-y-2">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">{section.heading}</h4>
                                                <p className="text-muted-foreground text-sm leading-relaxed font-medium">
                                                    {section.content}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Side-by-Side School Breakdowns */}
                        {result.comparison.schoolBreakdowns && result.comparison.schoolBreakdowns.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Building className="w-5 h-5 text-accent" />
                                    <h3 className="font-bold text-lg tracking-tight">School breakdowns</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {result.comparison.schoolBreakdowns.map(school => (
                                        <Card key={school.schoolName} className="glass bg-white/2 border-white/5 flex flex-col h-full rounded-sm shadow-none">
                                            <CardHeader className="p-3 border-b border-white/5">
                                                <CardTitle className="text-sm font-black uppercase tracking-tight text-white/90">{school.schoolName}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-3 flex-grow">
                                                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                                    {school.summary}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <div className="text-center pt-4 border-t border-white/5">
                            <Button variant="ghost" size="sm" onClick={handleFetchComparison} className="text-muted-foreground hover:text-primary transition-colors font-bold uppercase tracking-widest text-[9px]">
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
