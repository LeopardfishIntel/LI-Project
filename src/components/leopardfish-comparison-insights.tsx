
"use client";

import { useState } from 'react';
import type { School } from '@/lib/types';
import { getSchoolComparisonInsights } from '@/app/compare/actions';
import type { AiSchoolComparisonOutput } from '@/ai/flows/ai-school-comparison-flow';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, ServerCrash, Trophy, CheckCircle2 } from 'lucide-react';

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
        <Card className="bg-card/70 backdrop-blur-sm border-border w-full">
            <CardHeader className="text-center border-b border-white/5 pb-8">
                <CardTitle className="text-2xl font-bold tracking-tight mb-2">Leopardfish comparative insights</CardTitle>
                <CardDescription className="text-sm font-medium uppercase tracking-widest text-primary/60">Automated recruitment intelligence</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col p-6 md:p-10">
                {!loading && !result && (
                    <div className="flex flex-col items-center justify-center text-center flex-grow py-12 min-h-[300px]">
                        <div className="p-4 bg-primary/10 rounded-full mb-6">
                            <Sparkles className="w-12 h-12 text-primary" />
                        </div>
                        <h3 className="font-bold text-2xl mb-3">Generate comparative analysis</h3>
                        <p className="text-muted-foreground mb-8 text-base max-w-xl leading-relaxed">
                            Process the selected signatures through our AI engine to reveal hidden trade-offs, financial benchmarks, and the best tactical fit for your profile.
                        </p>
                        <Button onClick={handleFetchComparison} size="lg" className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest px-10 py-7 h-auto rounded-sm">
                            <Sparkles className="w-5 h-5 mr-2" />
                            Run analysis
                        </Button>
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center flex-grow py-12 min-h-[300px] space-y-6">
                        <div className="relative">
                            <Loader2 className="w-16 h-16 animate-spin text-primary" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 bg-primary/20 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-lg font-bold text-white tracking-tight">Analysing schools...</p>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest animate-pulse">Establishing secure uplink</p>
                        </div>
                    </div>
                )}

                {result?.error && (
                     <div className="flex flex-col items-center justify-center text-center flex-grow py-12 min-h-[300px] bg-destructive/5 rounded-sm border border-destructive/20 w-full">
                        <ServerCrash className="w-12 h-12 text-destructive mb-4" />
                        <h3 className="font-bold text-xl text-destructive mb-2">Analysis failure</h3>
                        <p className="text-destructive/80 mb-8 text-base px-4 max-w-md">{result.error}</p>
                        <Button variant="destructive" onClick={handleFetchComparison} className="font-bold uppercase tracking-widest">
                            Retry protocol
                        </Button>
                    </div>
                )}

                {result?.comparison && (
                    <div className="space-y-12 w-full text-left">
                        {/* Final Verdict Section */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-sm">
                                    <Trophy className="w-6 h-6 text-primary" />
                                </div>
                                <h3 className="font-bold text-2xl tracking-tight">Final verdict</h3>
                            </div>
                             <Card className="bg-primary/5 border-primary/20 rounded-sm overflow-hidden">
                                <div className="p-6 md:p-8 space-y-6">
                                    <div className="flex items-center gap-3 text-primary">
                                        <CheckCircle2 className="size-6" />
                                        <span className="text-xl font-black uppercase tracking-tight">{result.comparison.bestFit.schoolName}</span>
                                    </div>
                                    <p className="text-muted-foreground text-base leading-relaxed whitespace-pre-wrap font-medium">
                                        {result.comparison.bestFit.reasoning}
                                    </p>
                                </div>
                            </Card>
                        </div>

                        {/* Side-by-Side School Breakdowns */}
                        {result.comparison.schoolBreakdowns && result.comparison.schoolBreakdowns.length > 0 && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-accent/10 rounded-sm">
                                        <Building className="w-6 h-6 text-accent" />
                                    </div>
                                    <h3 className="font-bold text-2xl tracking-tight">School breakdowns</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {result.comparison.schoolBreakdowns.map(school => (
                                        <Card key={school.schoolName} className="glass bg-white/2 border-white/5 flex flex-col h-full rounded-sm">
                                            <CardHeader className="pb-3 border-b border-white/5">
                                                <CardTitle className="text-base font-black uppercase tracking-tight text-white/90">{school.schoolName}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-4 flex-grow">
                                                <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                                                    {school.summary}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <div className="text-center pt-8 border-t border-white/5">
                            <Button variant="ghost" size="sm" onClick={handleFetchComparison} className="text-muted-foreground hover:text-primary transition-colors font-bold uppercase tracking-widest text-[10px]">
                                <Sparkles className="w-4 h-4 mr-2"/>
                                Regenerate comparison
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
