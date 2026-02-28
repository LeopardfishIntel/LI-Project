"use client";

import { useState } from 'react';
import type { School } from '@/lib/types';
import { getSchoolComparisonInsights } from '@/app/compare/actions';
import type { AiSchoolComparisonOutput } from '@/ai/flows/ai-school-comparison-flow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, ServerCrash, Trophy } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
            <CardHeader>
                <CardTitle className="text-2xl font-bold tracking-tight text-center mb-4">LeopardFish Comparative Insights</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col items-center">
                {!loading && !result && (
                    <div className="flex flex-col items-center justify-center text-center flex-grow py-8 min-h-[200px]">
                        <Sparkles className="w-10 h-10 text-amber-400 mb-4" />
                        <h3 className="font-semibold text-xl mb-2">Compare Your Top Schools</h3>
                        <p className="text-muted-foreground mb-6 text-base max-w-2xl">Get an AI-powered comparative analysis of your selected schools, highlighting the key trade-offs and recommending the best fit for your profile.</p>
                        <Button onClick={handleFetchComparison} size="lg">
                            <Sparkles className="w-5 h-5 mr-2" />
                            Generate Comparison
                        </Button>
                    </div>
                )}
                {loading && (
                    <div className="flex items-center justify-center flex-grow py-8 min-h-[200px]">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <p className="ml-4 text-muted-foreground text-lg">Analysing schools...</p>
                    </div>
                )}
                {result?.error && (
                     <div className="flex flex-col items-center justify-center text-center flex-grow py-8 min-h-[200px] bg-destructive/10 rounded-md w-full">
                        <ServerCrash className="w-10 h-10 text-destructive mb-4" />
                        <h3 className="font-semibold text-xl text-destructive mb-2">Analysis Failed</h3>
                        <p className="text-destructive/80 mb-6 text-base px-4">{result.error}</p>
                        <Button variant="destructive" onClick={handleFetchComparison}>
                            Try Again
                        </Button>
                    </div>
                )}
                {result?.comparison && (
                    <div className="space-y-8 w-full text-left">
                        <div>
                            <h3 className="font-bold text-xl flex items-center gap-2 mb-3"><Trophy className="w-6 h-6 text-amber-400" /> Analysis &amp; Recommendation</h3>
                             <Card className="bg-primary/10 border-primary/40">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <g transform="rotate(45 12 12)">
                                                <rect x="2" y="2" width="20" height="20" rx="3" fill="hsl(var(--primary))"/>
                                                <path d="M12 6C16.5 10 16.5 14 12 18C7.5 14 7.5 10 12 6Z" fill="hsl(var(--accent))"/>
                                                <path d="M10.5 6C14 10 14 14 10.5 18" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                                                <path d="M13.5 6C10 10 10 14 13.5 18" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                                            </g>
                                        </svg>
                                        {result.comparison.bestFit.schoolName}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground whitespace-pre-wrap">{result.comparison.bestFit.reasoning}</p>
                                </CardContent>
                            </Card>
                        </div>

                        {result.comparison.schoolBreakdowns && result.comparison.schoolBreakdowns.length > 0 && (
                            <div>
                                <h3 className="font-bold text-xl flex items-center gap-2 mb-3">School Breakdowns</h3>
                                <Accordion type="single" collapsible className="w-full" defaultValue={result.comparison.schoolBreakdowns[0]?.schoolName}>
                                    {result.comparison.schoolBreakdowns.map(school => (
                                        <AccordionItem value={school.schoolName} key={school.schoolName}>
                                            <AccordionTrigger className="text-lg font-semibold">{school.schoolName}</AccordionTrigger>
                                            <AccordionContent className="space-y-6 pt-4">
                                                <p className="text-muted-foreground">{school.summary}</p>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </div>
                        )}
                        
                        <div className="text-center pt-4">
                            <Button variant="ghost" size="sm" onClick={handleFetchComparison} className="text-muted-foreground">
                                <Sparkles className="w-4 h-4 mr-2"/>
                                Regenerate Comparison
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
