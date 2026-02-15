
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ShieldCheck } from 'lucide-react';

export default function HealthInsurancePage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
          Decoding Health Insurance
        </h1>
        <p className="text-muted-foreground mb-12">
          Understanding the different types of health insurance offered by international schools.
        </p>

        <Card className="bg-card/70 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-primary" />
              Common Insurance Tiers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Health insurance is a critical part of your compensation package. The terminology can be confusing, but plans generally fall into these categories. Always verify the specifics of coverage with the school's HR department.
            </p>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Premium / Full Coverage</AccordionTrigger>
                <AccordionContent>
                  These are typically the best plans. They offer comprehensive international coverage with high limits, including direct billing (cashless service) at a wide network of private hospitals worldwide. They often cover specialist visits, dental, and vision with minimal co-pays. This is the gold standard.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Comprehensive</AccordionTrigger>
                <AccordionContent>
                  A very good level of cover, but may have some limitations compared to 'Premium'. It might have a smaller international network, higher co-pays, or lower limits on certain treatments like dental. It's a solid plan but requires checking the fine print for out-of-country coverage.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>National / Local Plan</AccordionTrigger>
                <AccordionContent>
                  This plan provides access to the national health system of the country you're in, and sometimes a network of local private hospitals. Coverage outside the country is often limited to emergencies only. This is adequate for day-to-day life but may not be sufficient for those who travel frequently or want treatment in their home country.
                </AccordionContent>
              </AccordionItem>
               <AccordionItem value="item-4">
                <AccordionTrigger>Private / Private Required</AccordionTrigger>
                <AccordionContent>
                 'Private' indicates the school provides a private plan, but its quality can vary. 'Private Required' means you must have private insurance to meet visa requirements (e.g., in the Netherlands), but the school may not provide it, or may only provide a basic level, requiring you to top it up at your own expense. This needs careful examination.
                </AccordionContent>
              </AccordionItem>
               <AccordionItem value="item-5">
                <AccordionTrigger>Mandatory</AccordionTrigger>
                <AccordionContent>
                  This term is often used in countries like Switzerland where health insurance is legally required for all residents. The school might facilitate enrollment but the cost is often deducted from your salary. The quality of the mandatory plan is usually very high, but it comes at a significant cost.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
