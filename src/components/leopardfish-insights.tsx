"use client";

import { useEffect, useState } from 'react';
import type { School } from '@/lib/types';
import { getSchoolInsights } from '@/app/compare/actions';
import type { AiSchoolInsightsSummaryOutput } from '@/ai/flows/ai-school-insights-summary-flow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThumbsUp, ThumbsDown, Loader2, Sparkles } from 'lucide-react';

export function LeopardFishInsights({ school }: { school: School }) {
    const [result, setResult] = useState<{ insights: AiSchoolInsightsSummaryOutput | null, error?: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchInsights() {
            if (!school) return;
            setLoading(true);
            const res = await getSchoolInsights(school);
            setResult(res);
            setLoading(false);
        }
        fetchInsights();
    }, [school]);

    return (
        <Card className="bg-card/70 backdrop-blur-sm border-border h-full">
            <CardHeader>
                <CardTitle className="text-xl">{school.name}</CardTitle>
            </CardHeader>
            <CardContent>
                {loading && (
                    <div className="flex items-center justify-center py-8 min-h-[200px]">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="ml-4 text-muted-foreground">Generating LeopardFish Insights...</p>
                    </div>
                )}
                {result?.error && <p className="text-destructive-foreground bg-destructive/50 p-3 rounded-md">{result.error}</p>}
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
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
