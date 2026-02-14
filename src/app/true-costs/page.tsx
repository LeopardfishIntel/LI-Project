
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, Home, Plane, School as SchoolIcon, Award, ShoppingBasket, Thermometer, Car, Beer, ArrowRightLeft, PiggyBank, LineChart, FileText, DollarSign, Utensils, TramFront, Zap, Wifi } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { schools } from '@/lib/mock-data';
import type { School } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

type CountryData = {
  [country: string]: {
    taxStatus: string;
    housing: string;
    flightAllowance: string;
    dependentTuition: string;
    gratuity: string;
    importedGoods: string;
    utilities: string;
    transportation: string;
    socialLeisure: string;
    currency: string;
    homeObligations: string;
    savings: string;
  };
};

const countrySpecificData: CountryData = {
    'United Kingdom': {
        taxStatus: "Salaries are subject to UK income tax and National Insurance contributions. Tax-free salaries are not a feature here.",
        housing: "Housing is almost never provided. You'll receive a salary and be expected to cover your own rent, which varies massively between cities like London and smaller towns.",
        flightAllowance: "Annual flights are not a standard perk for jobs within the UK. This is typically reserved for international posts abroad.",
        dependentTuition: "If you work in a state school, your children can attend for free. In the private sector (where most international schools are), staff children often get heavily discounted or free places, but this is a key point to negotiate.",
        gratuity: "There is no end-of-service gratuity system in the UK. Instead, schools contribute to a pension scheme (like the Teachers' Pension Scheme).",
        importedGoods: "As a major economy, most goods are readily available. You won't face a significant 'expat premium' on groceries, but costs are generally high.",
        utilities: "Heating is a significant winter expense. Council tax (a local property tax) is another major monthly bill not found in many other countries.",
        transportation: "Public transport is extensive but can be very expensive, especially train travel. Many people outside of major cities rely on a car.",
        socialLeisure: "The cost of a pint of beer or a meal out varies by city but is generally high compared to many teaching destinations. Gym memberships are common.",
        currency: "You're paid in GBP (£). If you have debts in another currency, you're exposed to exchange rate fluctuations. Remittance fees for sending money abroad are standard.",
        homeObligations: "This is your home base. The tool helps you budget your UK salary against your existing UK financial commitments like mortgages or loans.",
        savings: "The 'True Savings Potential' calculates your projected annual savings in GBP after all UK taxes and your specified lifestyle costs are deducted."
    },
    'UAE': {
        taxStatus: "Salaries are 100% tax-free. This is the single biggest financial advantage of working in the UAE and a primary driver for high savings potential.",
        housing: "Most schools provide either free, furnished accommodation (often on a shared campus) or a housing allowance. Check if the allowance covers a good quality apartment in a desirable area.",
        flightAllowance: "An annual flight allowance is standard. It's often a cash sum, which offers flexibility. Check if it covers dependents, as family flights can be a major cost.",
        dependentTuition: "This is crucial. Top-tier schools usually provide 1-2 free child places. Less established schools may offer partial discounts. A lack of this benefit can wipe out your savings.",
        gratuity: "An end-of-service gratuity is legally required. It's typically calculated as 21 days' basic salary for each of the first five years of service, and 30 days for each year after.",
        importedGoods: "Supermarkets are full of imported Western brands (Waitrose, etc.), but they come at a premium. Eating and buying local is cheaper.",
        utilities: "AC is non-negotiable for 6-8 months of the year and will be your largest utility bill. Some housing includes 'chiller fees' (for AC), others don't. A major variable.",
        transportation: "A car is almost essential outside of Dubai's metro line. Factor in costs for car leasing/purchase, petrol (which is relatively cheap), and road tolls (Salik).",
        socialLeisure: "The 'brunch' culture is a major social outlet but can be very expensive. Alcohol is only available in licensed venues and is heavily taxed, making it a luxury item.",
        currency: "You're paid in UAE Dirhams (AED), which is pegged to the US Dollar. This provides stability if you are saving or remitting in USD. Fees for sending money are low.",
        homeObligations: "Your tax-free salary makes it easier to cover obligations back home. The tool lets you input these to see your true disposable income.",
        savings: "Calculates your projected annual savings in your home currency, showcasing the power of a tax-free salary and benefits package."
    },
    'Japan': {
        taxStatus: "Your salary is subject to Japanese income tax, inhabitant tax, and social security contributions. Taxes are significant but generally lower than in many Western European countries.",
        housing: "This varies. Some schools (often in smaller cities) provide subsidized or free housing. In Tokyo, you'll likely get an allowance that may not cover the full rent, requiring a top-up.",
        flightAllowance: "An annual flight home is not always standard but is offered by many top international schools. It might be a reimbursed ticket rather than cash.",
        dependentTuition: "Most reputable international schools will offer free or heavily discounted tuition for dependents. This is a critical benefit due to the high cost of international education in Japan.",
        gratuity: "There is no 'gratuity' system. Schools contribute to the Japanese pension system. Some schools might offer a contract completion bonus, but it's not standard.",
        importedGoods: "Finding specific Western brands can be difficult and expensive outside of specialty import stores in major cities. You'll adapt to excellent local alternatives.",
        utilities: "Utilities are reasonable, but heating in winter and AC in the humid summer can cause bills to spike. Housing is often less insulated than in colder climates.",
        transportation: "World-class public transport is the norm in cities. A monthly pass (Teiki) is cost-effective. Owning a car in a major city is prohibitively expensive and unnecessary.",
        socialLeisure: "Eating out can be very affordable. Social life often revolves around restaurants and izakayas. Western-style bars, gyms, and social events can be more expensive.",
        currency: "You are paid in Japanese Yen (JPY). It's a major world currency, but it can be volatile. Factor in remittance fees when sending money home.",
        homeObligations: "Use the tool to see how your net JPY salary stacks up against your financial commitments in your home currency after conversion.",
        savings: "Calculates your projected annual savings, converting from JPY to your home currency to give a clear picture of your wealth-building potential."
    },
    'Switzerland': {
        taxStatus: "Salaries are subject to federal, cantonal, and municipal taxes, which can be high. However, salaries are also among the highest in the world.",
        housing: "Housing is not provided and is extremely expensive, especially in cities like Zurich and Geneva. This is the largest expense for most teachers.",
        flightAllowance: "Not a standard benefit. Flights are typically paid for by the teacher.",
        dependentTuition: "Most international schools offer significant discounts for staff children, which is a major benefit given the high cost of tuition.",
        gratuity: "There is no end-of-service gratuity. Instead, Switzerland has a mandatory three-pillar pension system to which both employer and employee contribute.",
        importedGoods: "Switzerland is not in the EU, so imported goods can be more expensive. However, quality local products are abundant.",
        utilities: "Heating costs during the long, cold winters are a significant expense. Electricity and other utilities are also costly.",
        transportation: "Public transportation is incredibly efficient and widely used, but it is expensive. Many people in cities do not own cars.",
        socialLeisure: "The cost of living is very high. Eating out, drinks, and leisure activities are among the most expensive in the world. Outdoor activities like hiking are popular and free.",
        currency: "You're paid in Swiss Francs (CHF). A strong, stable currency. Converting to other currencies is easy but subject to exchange rates.",
        homeObligations: "High salaries can help cover home country obligations, but the high cost of living in Switzerland reduces savings potential.",
        savings: "Calculates your projected annual savings in your home currency, taking into account high salaries but also very high living costs."
    },
    'Singapore': {
        taxStatus: "Income tax is progressive and relatively low compared to many Western countries. It is not tax-free, but the effective tax rate is often competitive.",
        housing: "Housing is extremely expensive. Most schools provide a housing allowance, but it is unlikely to cover the full cost of a family-sized condominium in a central location.",
        flightAllowance: "An annual flight allowance is common, often as a cash benefit, providing flexibility.",
        dependentTuition: "A crucial benefit. Top schools offer free or heavily subsidized places for dependents, which is a massive financial saving.",
        gratuity: "There is no mandatory end-of-service gratuity. Some schools may offer a contract completion or renewal bonus.",
        importedGoods: "Singapore is a major trade hub, so a wide variety of imported goods is available, but they are expensive. Local food in hawker centers is famously delicious and affordable.",
        utilities: "High due to the need for constant air conditioning. Electricity costs are a significant part of the monthly budget.",
        transportation: "World-class, efficient, and affordable public transport (MRT and buses) makes owning a car unnecessary and prohibitively expensive due to high taxes and COE (Certificate of Entitlement).",
        socialLeisure: "Singapore has a vibrant social scene with many high-end restaurants and bars, which are expensive. Gym memberships and other activities are comparable to other major world cities.",
        currency: "Payment is in Singapore Dollars (SGD). It's a strong and stable currency. Sending money overseas is straightforward.",
        homeObligations: "Your net salary after tax and high living costs needs to be carefully budgeted against any financial commitments in your home country.",
        savings: "Savings potential is high due to high salaries, but it is heavily dependent on lifestyle choices, especially regarding housing and dining out."
    },
    'South Korea': {
        taxStatus: "Income is subject to South Korean income tax. Rates are progressive. Your school will handle deductions.",
        housing: "Most schools provide furnished housing for teachers, which is a significant benefit as it removes a major expense and the hassle of finding a place.",
        flightAllowance: "An annual flight allowance is standard in many contracts, often as a reimbursed flight or a fixed amount.",
        dependentTuition: "Discounts on tuition for dependents are common but may not always be 100%. This is an important point to clarify in the contract.",
        gratuity: "By law, employers must pay a severance pay ('toegig-geum') equivalent to at least one month's salary for every year of service upon contract completion.",
        importedGoods: "Western groceries and goods are available in larger cities like Seoul but are expensive. A local diet is much more economical.",
        utilities: "Utilities are reasonably priced, though heating in the cold winters can increase costs. Some school-provided housing may include some utilities.",
        transportation: "Excellent, affordable, and efficient public transport systems in major cities like Seoul make cars unnecessary.",
        socialLeisure: "Social life is vibrant and can be very affordable. Local restaurants, soju, and beer are cheap. Western-style bars and restaurants are more expensive.",
        currency: "You are paid in South Korean Won (KRW). The currency can fluctuate, so this is a consideration when sending money home.",
        homeObligations: "With housing often provided, it can be easier to manage home country financial obligations from your Korean salary.",
        savings: "Moderate savings potential. The low cost of daily living and provided housing helps, but salaries are not as high as in some other regions."
    }
};

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
  const [selectedCountry, setSelectedCountry] = useState('United Kingdom');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [familyStatus, setFamilyStatus] = useState('single');
  const data = countrySpecificData[selectedCountry];

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    setSelectedSchoolId(null);
  };

  const schoolsInCountry = schools.filter(school => school.country === selectedCountry);
  const selectedSchool = selectedSchoolId ? schools.find(s => s.id === selectedSchoolId) : null;

  const familyStatusLabels: {[key: string]: string} = {
    single: 'Single',
    couple: 'Couple',
    family: 'Family (2+1)',
    family2: 'Family (2+2)',
  };

  let adults = 1;
  let children = 0;
  if (familyStatus === 'couple') {
    adults = 2;
    children = 0;
  } else if (familyStatus === 'family') {
    adults = 2;
    children = 1;
  } else if (familyStatus === 'family2') {
    adults = 2;
    children = 2;
  }

  const calculateTotal = (school: School | null) => {
    if (!school) return 0;
    const { costOfLiving } = school;
    const foodCost = costOfLiving.food * adults + costOfLiving.food * 0.5 * children;
    const transportCost = costOfLiving.transport * adults + costOfLiving.transport * 0.3 * children;
    const total = costOfLiving.apartment + foodCost + transportCost + costOfLiving.utilities + costOfLiving.internet;
    return total;
  };

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-center">See the True Costs</h1>
        <p className="text-muted-foreground text-center mt-4 mb-8 max-w-3xl mx-auto">
            A high salary doesn't always mean high savings. Our "True Costs" model breaks down the three pillars that truly determine your savings potential: Contract Perks, Lifestyle Reality, and Financial Strategy.
        </p>
        
        <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="country-select" className="text-base font-semibold block text-center">Target Country</Label>
            <Select value={selectedCountry} onValueChange={handleCountryChange}>
              <SelectTrigger id="country-select" className="mt-2">
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(countrySpecificData).map(country => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="school-select" className="text-base font-semibold block text-center">School (Optional)</Label>
             <Select value={selectedSchoolId ?? 'all'} onValueChange={(value) => setSelectedSchoolId(value === 'all' ? null : value)} disabled={schoolsInCountry.length === 0}>
                <SelectTrigger id="school-select" className="mt-2">
                  <SelectValue placeholder="Select a school" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">-- All Schools in {selectedCountry} --</SelectItem>
                  {schoolsInCountry.map(school => (
                    <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
          
          <div>
            <Label htmlFor="family-status-select" className="text-base font-semibold block text-center">Family Status</Label>
            <Select value={familyStatus} onValueChange={setFamilyStatus}>
              <SelectTrigger id="family-status-select" className="mt-2">
                <SelectValue placeholder="Select family status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="couple">Couple</SelectItem>
                <SelectItem value="family">Family (2+1)</SelectItem>
                <SelectItem value="family2">Family (2+2)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedSchool && (
            <Card className="mb-8 bg-card/70 backdrop-blur-sm border-border">
                <CardHeader>
                    <CardTitle className="flex items-center text-xl">
                        <DollarSign className="w-5 h-5 mr-2 text-primary" />
                        Cost Estimator: {selectedSchool.name}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground mb-6">
                        <div className="flex justify-between items-center">
                            <span className="flex items-center"><Home className="w-4 h-4 mr-2 text-sky-400" /> Apartment (1-2 bed)</span>
                            <span>{formatCurrency(selectedSchool.costOfLiving.apartment)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="flex items-center"><Utensils className="w-4 h-4 mr-2 text-amber-400" /> Monthly Groceries</span>
                            <span>~{formatCurrency(selectedSchool.costOfLiving.food * adults + selectedSchool.costOfLiving.food * 0.5 * children)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="flex items-center"><TramFront className="w-4 h-4 mr-2 text-rose-400" /> Public Transport</span>
                            <span>~{formatCurrency(selectedSchool.costOfLiving.transport * adults + selectedSchool.costOfLiving.transport * 0.3 * children)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="flex items-center"><Zap className="w-4 h-4 mr-2 text-green-400" /> Utilities</span>
                            <span>{formatCurrency(selectedSchool.costOfLiving.utilities)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="flex items-center"><Wifi className="w-4 h-4 mr-2 text-indigo-400" /> Internet</span>
                            <span>{formatCurrency(selectedSchool.costOfLiving.internet)}</span>
                        </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-border">
                        <div className="flex justify-between items-center text-lg font-bold">
                            <span className="text-primary-foreground">Estimated Monthly Total*</span>
                            <span className="text-primary">{formatCurrency(calculateTotal(selectedSchool))}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
            <Card className="bg-card/70 backdrop-blur-sm border-border flex flex-col">
                <CardHeader className="flex-row items-start gap-4 space-y-0 pb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                        <Landmark className="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-bold tracking-tight normal-case">Contract Perks</CardTitle>
                        <p className="text-sm text-muted-foreground capitalize">
                            {selectedCountry}
                            {selectedSchool ? ` | ${selectedSchool.name}` : ''}
                            {' | '}
                            {familyStatusLabels[familyStatus]}
                        </p>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-grow pt-0">
                     <p className="text-sm text-muted-foreground">These are contract-specific items that can change a job's value by over $20,000 annually.</p>
                     <FeatureDetail 
                        icon={<FileText className="w-5 h-5" />}
                        title="Tax Status"
                        description={data.taxStatus}
                    />
                     <FeatureDetail 
                        icon={<Home className="w-5 h-5" />}
                        title="Housing Arrangement"
                        description={data.housing}
                    />
                     <FeatureDetail 
                        icon={<Plane className="w-5 h-5" />}
                        title="Annual Flight Allowance"
                        description={data.flightAllowance}
                    />
                     <FeatureDetail 
                        icon={<SchoolIcon className="w-5 h-5" />}
                        title="Dependent Tuition"
                        description={data.dependentTuition}
                    />
                     <FeatureDetail 
                        icon={<Award className="w-5 h-5" />}
                        title="Gratuity / Bonus"
                        description={data.gratuity}
                    />
                </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-sm border-border flex flex-col">
                <CardHeader className="flex-row items-start gap-4 space-y-0 pb-4">
                     <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                        <ShoppingBasket className="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-bold tracking-tight normal-case">True Lifestyle</CardTitle>
                         <p className="text-sm text-muted-foreground capitalize">
                            {selectedCountry}
                            {selectedSchool ? ` | ${selectedSchool.name}` : ''}
                            {' | '}
                            {familyStatusLabels[familyStatus]}
                        </p>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-grow pt-0">
                    <p className="text-sm text-muted-foreground">Expats often have a premium on spending that standard data misses. This is the reality of your daily budget.</p>
                     <FeatureDetail 
                        icon={<ShoppingBasket className="w-5 h-5" />}
                        title="Imported Goods"
                        description={data.importedGoods}
                    />
                     <FeatureDetail 
                        icon={<Thermometer className="w-5 h-5" />}
                        title="Utilities (AC/Heat)"
                        description={data.utilities}
                    />
                     <FeatureDetail 
                        icon={<Car className="w-5 h-5" />}
                        title="Transportation"
                        description={data.transportation}
                    />
                     <FeatureDetail 
                        icon={<Beer className="w-5 h-5" />}
                        title="Social & Leisure"
                        description={data.socialLeisure}
                    />
                </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-sm border-border flex flex-col">
                <CardHeader className="flex-row items-start gap-4 space-y-0 pb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                        <LineChart className="h-6 w-6" />
                    </div>
                     <div>
                        <CardTitle className="text-lg font-bold tracking-tight normal-case">Financial Strategy</CardTitle>
                         <p className="text-sm text-muted-foreground capitalize">
                             {selectedCountry}
                             {selectedSchool ? ` | ${selectedSchool.name}` : ''}
                             {' | '}
                             {familyStatusLabels[familyStatus]}
                        </p>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-grow pt-0">
                    <p className="text-sm text-muted-foreground">This is what transforms a job into a wealth-building opportunity. Track what really matters.</p>
                     <FeatureDetail 
                        icon={<ArrowRightLeft className="w-5 h-5" />}
                        title="Currency & Fees"
                        description={data.currency}
                    />
                     <FeatureDetail 
                        icon={<PiggyBank className="w-5 h-5" />}
                        title="Home Obligations"
                        description={data.homeObligations}
                    />
                     <FeatureDetail 
                        icon={<LineChart className="w-5 h-5" />}
                        title="True Savings Potential"
                        description={data.savings}
                    />
                </CardContent>
            </Card>
        </div>
        
        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>*Disclaimer: The figures provided are estimates for illustrative purposes only and do not constitute financial advice. Actual costs and savings may vary based on individual lifestyle, spending habits, and market conditions.</p>
        </div>

      </div>
    </div>
  );
}
