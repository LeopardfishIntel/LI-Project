"use client";

import { useState } from 'react';
import type { School } from '@/lib/types';
import { getSchoolInsights } from '@/app/compare/actions';
import type { AiSchoolInsightsSummaryOutput } from '@/ai/flows/ai-school-insights-summary-flow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Loader2, Sparkles, ServerCrash } from 'lucide-react';

export function LeopardFishInsights({ school }: { school: School }) {
    const [result, setResult] = useState<{ insights: AiSchoolInsightsSummaryOutput | null, error?: string } | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleFetchInsights() {
        if (!school) return;
        setLoading(true);
        setResult(null);
        const res = await getSchoolInsights(school);
        setResult(res);
        setLoading(false);
    }

    return (
        <Card className="bg-card/70 backdrop-blur-sm border-border h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-xl">{school.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
                {!loading && !result && (
                    <div className="flex flex-col items-center justify-center text-center flex-grow py-8 min-h-[200px]">
                        <Sparkles className="w-8 h-8 text-amber-400 mb-4" />
                        <h3 className="font-semibold text-lg mb-2">LeopardFish Insights</h3>
                        <p className="text-muted-foreground mb-4 text-sm">Get an AI-powered summary of this school's pros & cons based on teacher reviews.</p>
                        <Button onClick={handleFetchInsights}>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Analysis
                        </Button>
                    </div>
                )}
                {loading && (
                    <div className="flex items-center justify-center flex-grow py-8 min-h-[200px]">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="ml-4 text-muted-foreground">Analyzing reviews...</p>
                    </div>
                )}
                {result?.error && (
                     <div className="flex flex-col items-center justify-center text-center flex-grow py-8 min-h-[200px] bg-destructive/10 rounded-md">
                        <ServerCrash className="w-8 h-8 text-destructive mb-4" />
                        <h3 className="font-semibold text-lg text-destructive mb-2">Analysis Failed</h3>
                        <p className="text-destructive/80 mb-4 text-sm px-4">There was an error generating the insights. This can happen due to high traffic. Please try again in a moment.</p>
                        <Button variant="destructive" onClick={handleFetchInsights}>
                            Try Again
                        </Button>
                    </div>
                )}
                {result?.insights && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-semibold flex items-center gap-2 mb-2"><Sparkles className="w-5 h-5 text-amber-400" /> Candid Opinion</h3>
                            <blockquote className="text-muted-foreground italic border-l-2 border-primary pl-4">
                                "{result.insights.summary}"
                            </blockquote>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-semibold flex items-center gap-2 mb-2"><ThumbsUp className="w-5 h-5 text-green-400" /> Pros</h3>
                                {result.insights.pros.length > 0 ? (
                                    <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                                        {result.insights.pros.map((pro, i) => <li key={i}>{pro}</li>)}
                                    </ul>
                                ): (
                                    <p className="text-muted-foreground text-sm">No specific pros identified from reviews.</p>
                                )}
                            </div>
                            <div>
                                <h3 className="font-semibold flex items-center gap-2 mb-2"><ThumbsDown className="w-5 h-5 text-red-400" /> Cons</h3>
                                {result.insights.cons.length > 0 ? (
                                    <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                                        {result.insights.cons.map((con, i) => <li key={i}>{con}</li>)}
                                    </ul>
                                ): (
                                    <p className="text-muted-foreground text-sm">No specific cons identified from reviews.</p>
                                )}
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleFetchInsights} className="w-full text-muted-foreground">
                            <Sparkles className="w-4 h-4 mr-2"/>
                            Regenerate
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}