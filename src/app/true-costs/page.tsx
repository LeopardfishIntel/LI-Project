import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, Home, Plane, School as SchoolIcon, Award, ShoppingBasket, Thermometer, Car, Beer, ArrowRightLeft, PiggyBank, LineChart, Info, FileText } from 'lucide-react';

const FeatureDetail = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="flex items-start gap-4">
        <div className="mt-1 text-primary">{icon}</div>
        <div>
            <h4 className="font-semibold tracking-tight">{title}</h4>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
    </div>
);


export default function TrueCostsPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-center">See the True Costs</h1>
        <p className="text-muted-foreground text-center mt-4 mb-8">
          A high salary doesn't always mean high savings. Understand the hidden variables that impact your financial future abroad.
        </p>

        <Card className="mb-8 bg-blue-900/20 border-blue-500/30">
            <CardHeader className="flex-row items-center gap-4">
                <Info className="w-6 h-6 text-blue-400" />
                <CardTitle className="text-blue-200 normal-case tracking-tight">Why "Cost of Living" Isn't Enough</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-blue-300/80">
                    Standard cost-of-living data is a good start, but it often misses the nuances of an international teacher's lifestyle. Our "True Costs" model breaks down the three pillars that truly determine your savings potential: Contract Perks, Lifestyle Reality, and Financial Strategy.
                </p>
            </CardContent>
        </Card>

        <Accordion type="single" collapsible defaultValue="item-1" className="w-full space-y-4">
          <AccordionItem value="item-1" className="bg-card/70 backdrop-blur-sm border-border rounded-lg px-6">
            <AccordionTrigger className="text-xl font-bold hover:no-underline py-6">
                <div className="flex items-center gap-4 text-left">
                    <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                        <Landmark className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="text-lg md:text-xl font-bold tracking-tight">Pillar 1: Contract Perks</h3>
                      <p className="text-sm text-muted-foreground font-normal normal-case">The Income Boosters</p>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
                <p className="text-muted-foreground mb-6">These items are specific to international teaching contracts and can change the "value" of a job by $20,000+ per year.</p>
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                    <FeatureDetail 
                        icon={<FileText className="w-5 h-5" />}
                        title="Tax Status"
                        description="Is the salary 100% tax-free (common in the Middle East) or subject to local tax (common in Europe/Asia)? This is the single biggest factor."
                    />
                     <FeatureDetail 
                        icon={<Home className="w-5 h-5" />}
                        title="Housing Arrangement"
                        description="School-provided housing means a $0 housing expense. An allowance might not cover a 2-bed in a desirable area, forcing you to top up."
                    />
                     <FeatureDetail 
                        icon={<Plane className="w-5 h-5" />}
                        title="Annual Flight Allowance"
                        description="A fixed cash sum offers flexibility, while a reimbursed ticket is more rigid. Check if it covers dependents to avoid costly family flights."
                    />
                     <FeatureDetail 
                        icon={<SchoolIcon className="w-5 h-5" />}
                        title="Dependent Tuition"
                        description="The biggest 'hidden' cost. A school not providing 100% free places for your children can cost you $15k+ per child, per year."
                    />
                     <FeatureDetail 
                        icon={<Award className="w-5 h-5" />}
                        title="Gratuity / End-of-Service Bonus"
                        description="Many schools in Asia and the Middle East pay a bonus (e.g., 21 days' salary) for every year worked. This is a significant tax-free lump sum."
                    />
                </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2" className="bg-card/70 backdrop-blur-sm border-border rounded-lg px-6">
            <AccordionTrigger className="text-xl font-bold hover:no-underline py-6">
                 <div className="flex items-center gap-4 text-left">
                     <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                        <ShoppingBasket className="h-6 w-6" />
                    </span>
                    <div>
                        <h3 className="text-lg md:text-xl font-bold tracking-tight">Pillar 2: True Lifestyle</h3>
                        <p className="text-sm text-muted-foreground font-normal normal-case">The Daily Outgoings</p>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
                <p className="text-muted-foreground mb-6">Standard data uses 'local' prices, but expats often have an 'Expat Premium' on their spending that can drastically alter budgets.</p>
                 <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                    <FeatureDetail 
                        icon={<ShoppingBasket className="w-5 h-5" />}
                        title="Imported Goods"
                        description="Craving 'home comforts' like specific brands of cheese, coffee, or toiletries? These can be 3x more expensive in places like China or Vietnam."
                    />
                     <FeatureDetail 
                        icon={<Thermometer className="w-5 h-5" />}
                        title="Utilities (The AC/Heat Factor)"
                        description="Your electricity bill can skyrocket from constant AC use in Dubai's summer, or from heating during a Swiss winter. This is a major variable."
                    />
                     <FeatureDetail 
                        icon={<Car className="w-5 h-5" />}
                        title="Transportation"
                        description="In city hubs like Singapore, a public transport pass is key. In the Middle East, you need to factor in car leasing, petrol, and road tolls (Salik)."
                    />
                     <FeatureDetail 
                        icon={<Beer className="w-5 h-5" />}
                        title="Social & Leisure"
                        description="What's the cost of a weekend brunch, a gym membership, or a simple beer? In some regions, alcohol is a significant luxury tax item."
                    />
                </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3" className="bg-card/70 backdrop-blur-sm border-border rounded-lg px-6">
            <AccordionTrigger className="text-xl font-bold hover:no-underline py-6">
                <div className="flex items-center gap-4 text-left">
                     <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                        <LineChart className="h-6 w-6" />
                    </span>
                     <div>
                        <h3 className="text-lg md:text-xl font-bold tracking-tight">Pillar 3: Financial Strategy</h3>
                        <p className="text-sm text-muted-foreground font-normal normal-case">The Wealth Tracker</p>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
                 <p className="text-muted-foreground mb-6">This is what transforms a job into a wealth-building opportunity. We help you track what really matters.</p>
                 <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                    <FeatureDetail 
                        icon={<ArrowRightLeft className="w-5 h-5" />}
                        title="Currency Arbitrage & Fees"
                        description="If you're paid in Vietnamese Dong but have a mortgage in GBP, currency fluctuations are critical. We also factor in remittance fees for sending money home."
                    />
                     <FeatureDetail 
                        icon={<PiggyBank className="w-5 h-5" />}
                        title="Home Country Obligations"
                        description="Our tools will allow you to input 'Static Costs' from home, like student loans, mortgages, or insurance payments, for a true picture of your disposable income."
                    />
                     <FeatureDetail 
                        icon={<LineChart className="w-5 h-5" />}
                        title="The 'True Savings Potential' Result"
                        description="The final, most important output. We calculate your 'Projected Annual Savings' in your home currency, giving you a clear financial target."
                    />
                </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

      </div>
    </div>
  );
}
