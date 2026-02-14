'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet } from 'lucide-react';

export default function TrueCostsPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-center">See the True Costs</h1>
        <p className="text-muted-foreground text-center mt-4 mb-8">
          Understand the real cost of living in different cities to make smarter financial decisions.
        </p>

        <Card className="bg-card/70 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle>Cost of Living Calculator</CardTitle>
            <CardDescription>This tool is coming soon. For now, you can find a cost of living estimator on each school's profile page.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center text-center py-16">
            <Wallet className="w-16 h-16 text-primary/50 mb-4" />
            <p className="text-muted-foreground">
              Our comprehensive cost of living calculator will be available here shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
