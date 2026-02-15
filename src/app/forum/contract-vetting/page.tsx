import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FileWarning } from 'lucide-react';

export default function ContractVettingPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
          Contract Vetting & Red Flags
        </h1>
        <p className="text-muted-foreground mb-12">
          Key insights into international school contracts, based on market intelligence and teacher reports.
        </p>

        <Card className="mb-8 bg-card/70 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <FileWarning className="w-6 h-6 text-amber-400" />
              The "Contract Gap": Understanding vs. Reality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              There is often a significant discrepancy between what teachers sign and what they experience. Here’s what to look out for.
            </p>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Vague Clauses & The School Handbook</AccordionTrigger>
                <AccordionContent>
                  Many teachers don't realize that by signing their contract, they often legally agree to a separate School Handbook. This handbook can contain crucial policies about workload, "directed hours," and other duties not detailed in the main contract. Always ask for and review the most current version of the handbook before signing. Be wary of vague clauses; if a term is unclear, ask for clarification in writing.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>The "October Trap": Early Renewal Deadlines</AccordionTrigger>
                <AccordionContent>
                  While a 3-4 month notice period is standard, a growing number of schools in competitive hubs (like the UAE and China) are moving their "intent to renew" deadlines as early as October or November. This gives teachers only a couple of months to decide on their future, creating pressure and limiting their ability to explore other options. Be aware of this timeline when you start a new role.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Standard Contract Terms</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-2">
                    <li><span className="font-semibold text-foreground">Initial Term:</span> 70-80% of international schools offer an initial two-year contract.</li>
                    <li><span className="font-semibold text-foreground">Contract Extensions:</span> With current recruitment challenges, over half of schools (55%) are now offering financial incentives for teachers who sign for a third or fourth year.</li>
                    <li><span className="font-semibold text-foreground">Notice Periods:</span> The global average for a resignation notice period is 4 months.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
        
      </div>
    </div>
  );
}
