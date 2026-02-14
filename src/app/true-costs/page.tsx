
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, Home, Plane, School as SchoolIcon, Award, ShoppingBasket, Thermometer, Car, Beer, ArrowRightLeft, PiggyBank, LineChart, FileText, DollarSign, Utensils, TramFront, Zap, Wifi, Smartphone, Coffee, Stethoscope } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { schools } from '@/lib/mock-data';
import type { School } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';

type FeatureScore = 'good' | 'neutral' | 'bad';
type Feature = { text: string; score: FeatureScore; multiplier?: string };

type CountryData = {
  [country: string]: {
    taxStatus: Feature;
    housing: Feature;
    flightAllowance: Feature;
    dependentTuition: Feature;
    gratuity: Feature;
    importedGoods: Feature;
    utilities: Feature;
    transportation: Feature;
    socialLeisure: Feature;
    currency: Feature;
    homeObligations: Feature;
    savings: Feature;
  };
};

const countrySpecificData: CountryData = {
    'United Kingdom': {
        taxStatus: { text: "Salaries are subject to UK income tax (20-45%) and National Insurance contributions. Tax-free salaries are not a feature here.", score: 'bad' },
        housing: { text: "Housing is almost never provided. You'll receive a salary and be expected to cover your own rent, which varies massively between cities like London and smaller towns.", score: 'bad' },
        flightAllowance: { text: "Annual flights are not a standard perk for jobs within the UK. This is typically reserved for international posts abroad.", score: 'bad' },
        dependentTuition: { text: "In the private sector (where most international schools are), staff children often get heavily discounted or free places, but this is a key point to negotiate.", score: 'neutral' },
        gratuity: { text: "There is no end-of-service gratuity system in the UK. Instead, schools contribute to a pension scheme (like the Teachers' Pension Scheme).", score: 'neutral' },
        importedGoods: { text: "As a major economy, most goods are readily available. You won't face a significant 'expat premium' on groceries, but costs are generally high.", score: 'neutral', multiplier: "1.1x" },
        utilities: { text: "Heating is a significant winter expense. Council tax (a local property tax) is another major monthly bill not found in many other countries.", score: 'bad', multiplier: "1.3x" },
        transportation: { text: "Public transport is extensive but can be very expensive, especially train travel. Many people outside of major cities rely on a car.", score: 'neutral', multiplier: "1.2x" },
        socialLeisure: { text: "The cost of a pint of beer or a meal out varies by city but is generally high compared to many teaching destinations. Gym memberships are common.", score: 'bad', multiplier: "1.4x" },
        currency: { text: "You're paid in GBP (£). If you have debts in another currency, you're exposed to exchange rate fluctuations. Remittance fees for sending money abroad are standard, averaging 0.5-2% via banks or online services.", score: 'neutral' },
        homeObligations: { text: "This is your home base. The tool helps you budget your UK salary against your existing UK financial commitments like mortgages or loans.", score: 'neutral' },
        savings: { text: "Calculates your projected annual savings in GBP after all UK taxes and your specified lifestyle costs are deducted.", score: 'neutral' }
    },
    'UAE': {
        taxStatus: { text: "Salaries are 100% tax-free (0% income tax). This is the single biggest financial advantage of working in the UAE.", score: 'good' },
        housing: { text: "Most schools provide either free, furnished accommodation (often on a shared campus) or a housing allowance. Check if the allowance covers a good quality apartment in a desirable area.", score: 'good' },
        flightAllowance: { text: "An annual flight allowance is standard. It's often a cash sum, which offers flexibility. Check if it covers dependents.", score: 'good' },
        dependentTuition: { text: "Crucial. Top-tier schools usually provide 1-2 free child places. Less established schools may offer partial discounts. A lack of this benefit can wipe out your savings.", score: 'good' },
        gratuity: { text: "An end-of-service gratuity is legally required, typically 21 days' basic salary for each of the first five years of service, and 30 days for each year after.", score: 'good' },
        importedGoods: { text: "Supermarkets are full of imported Western brands, but they come at a premium. Eating and buying local is cheaper.", score: 'neutral', multiplier: "1.3x" },
        utilities: { text: "AC is non-negotiable for 6-8 months of the year and will be your largest utility bill. 'Chiller fees' (for AC) can be a major variable.", score: 'bad', multiplier: "1.2x" },
        transportation: { text: "A car is almost essential outside of Dubai's metro line. Factor in costs for car leasing/purchase, petrol (which is relatively cheap), and road tolls (Salik).", score: 'neutral', multiplier: "1.0x" },
        socialLeisure: { text: "The 'brunch' culture is a major social outlet but can be very expensive. Alcohol is heavily taxed, making it a luxury item.", score: 'bad', multiplier: "1.8x" },
        currency: { text: "You're paid in UAE Dirhams (AED), pegged to the USD. This provides stability. Remittance fees are very low, often a small fixed fee rather than a percentage, making it cheap to send money home.", score: 'good' },
        homeObligations: { text: "Your tax-free salary makes it easier to cover obligations back home. The tool lets you input these to see your true disposable income.", score: 'good' },
        savings: { text: "Calculates your projected annual savings in your home currency, showcasing the power of a tax-free salary and benefits package.", score: 'good' }
    },
    'Japan': {
        taxStatus: { text: "Your salary is subject to Japanese income tax (5-45%), inhabitant tax, and social security. Taxes are significant but often lower than Western Europe.", score: 'neutral' },
        housing: { text: "Varies. Some schools provide subsidized/free housing. In Tokyo, you'll likely get an allowance that may not cover the full rent, requiring a top-up.", score: 'neutral' },
        flightAllowance: { text: "An annual flight home is not always standard but is offered by many top international schools. It might be a reimbursed ticket rather than cash.", score: 'neutral' },
        dependentTuition: { text: "Most reputable international schools will offer free or heavily discounted tuition for dependents. This is a critical benefit due to the high cost of education in Japan.", score: 'good' },
        gratuity: { text: "There is no 'gratuity' system. Schools contribute to the Japanese pension system. Some schools might offer a contract completion bonus, but it's not standard.", score: 'neutral' },
        importedGoods: { text: "Finding specific Western brands can be difficult and expensive outside of specialty import stores in major cities. You'll adapt to excellent local alternatives.", score: 'bad', multiplier: "1.5x" },
        utilities: { text: "Reasonable, but heating in winter and AC in the humid summer can cause bills to spike. Housing is often less insulated than in colder climates.", score: 'neutral', multiplier: "0.9x" },
        transportation: { text: "World-class public transport is the norm in cities. A monthly pass (Teiki) is cost-effective. Owning a car in a major city is prohibitively expensive and unnecessary.", score: 'good', multiplier: "0.7x" },
        socialLeisure: { text: "Eating out can be very affordable. Social life often revolves around restaurants and izakayas. Western-style bars, gyms, and social events can be more expensive.", score: 'good', multiplier: "0.8x" },
        currency: { text: "You are paid in Japanese Yen (JPY), a major but sometimes volatile currency. Standard bank remittance fees can be high; using a service like Wise or Revolut is recommended to minimize costs, which can be under 1%.", score: 'neutral' },
        homeObligations: { text: "Use the tool to see how your net JPY salary stacks up against your financial commitments in your home currency after conversion.", score: 'neutral' },
        savings: { text: "Calculates your projected annual savings, converting from JPY to your home currency to give a clear picture of your wealth-building potential.", score: 'neutral' }
    },
    'Switzerland': {
        taxStatus: { text: "Salaries are subject to federal, cantonal, and municipal taxes, which can be high (up to 40% combined). However, salaries are also among the highest in the world.", score: 'neutral' },
        housing: { text: "Housing is not provided and is extremely expensive, especially in cities like Zurich and Geneva. This is the largest expense for most teachers.", score: 'bad' },
        flightAllowance: { text: "Not a standard benefit. Flights are typically paid for by the teacher.", score: 'bad' },
        dependentTuition: { text: "Most international schools offer significant discounts for staff children, which is a major benefit given the high cost of tuition.", score: 'good' },
        gratuity: { text: "There is no end-of-service gratuity. Instead, Switzerland has a mandatory three-pillar pension system to which both employer and employee contribute.", score: 'neutral' },
        importedGoods: { text: "Switzerland is not in the EU, so imported goods can be more expensive. However, quality local products are abundant.", score: 'neutral', multiplier: "1.2x" },
        utilities: { text: "Heating costs during the long, cold winters are a significant expense. Electricity and other utilities are also costly.", score: 'bad', multiplier: "1.6x" },
        transportation: { text: "Public transportation is incredibly efficient and widely used, but it is expensive. Many people in cities do not own cars.", score: 'neutral', multiplier: "1.5x" },
        socialLeisure: { text: "The cost of living is very high. Eating out, drinks, and leisure activities are among the most expensive in the world. Outdoor activities like hiking are popular and free.", score: 'bad', multiplier: "2.0x" },
        currency: { text: "You're paid in Swiss Francs (CHF), a strong, stable currency. International bank transfers can be costly (1-3%), so using dedicated currency exchange services is advisable for better rates and lower fees.", score: 'good' },
        homeObligations: { text: "High salaries can help cover home country obligations, but the high cost of living in Switzerland reduces savings potential.", score: 'neutral' },
        savings: { text: "Calculates your projected annual savings in your home currency, taking into account high salaries but also very high living costs.", score: 'neutral' }
    },
    'Singapore': {
        taxStatus: { text: "Income tax is progressive and relatively low (0-22%) compared to many Western countries. It is not tax-free, but the effective tax rate is often competitive.", score: 'good' },
        housing: { text: "Housing is extremely expensive. Most schools provide a housing allowance, but it is unlikely to cover the full cost of a family-sized condominium in a central location.", score: 'bad' },
        flightAllowance: { text: "An annual flight allowance is common, often as a cash benefit, providing flexibility.", score: 'good' },
        dependentTuition: { text: "A crucial benefit. Top schools offer free or heavily subsidized places for dependents, which is a massive financial saving.", score: 'good' },
        gratuity: { text: "There is no mandatory end-of-service gratuity. Some schools may offer a contract completion or renewal bonus.", score: 'neutral' },
        importedGoods: { text: "A major trade hub, so a wide variety of imported goods is available, but they are expensive. Local food in hawker centers is famously delicious and affordable.", score: 'neutral', multiplier: "1.4x" },
        utilities: { text: "High due to the need for constant air conditioning. Electricity costs are a significant part of the monthly budget.", score: 'bad', multiplier: "1.3x" },
        transportation: { text: "World-class, efficient, and affordable public transport (MRT and buses) makes owning a car unnecessary and prohibitively expensive.", score: 'good', multiplier: "0.8x" },
        socialLeisure: { text: "Singapore has a vibrant social scene with many high-end restaurants and bars, which are expensive. Gym memberships are comparable to other major world cities.", score: 'bad', multiplier: "1.7x" },
        currency: { text: "Payment is in Singapore Dollars (SGD), a stable regional currency. Sending money overseas is efficient with competitive fees, especially through Singapore's fintech solutions which often beat traditional bank rates.", score: 'good' },
        homeObligations: { text: "Your net salary after tax and high living costs needs to be carefully budgeted against any financial commitments in your home country.", score: 'neutral' },
        savings: { text: "Savings potential is high due to high salaries, but it is heavily dependent on lifestyle choices, especially regarding housing and dining out.", score: 'good' }
    },
    'South Korea': {
        taxStatus: { text: "Income is subject to South Korean income tax (6-45%). Rates are progressive. Your school will handle deductions.", score: 'neutral' },
        housing: { text: "Most schools provide furnished housing for teachers, which is a significant benefit as it removes a major expense and the hassle of finding a place.", score: 'good' },
        flightAllowance: { text: "An annual flight allowance is standard in many contracts, often as a reimbursed flight or a fixed amount.", score: 'good' },
        dependentTuition: { text: "Discounts on tuition for dependents are common but may not always be 100%. This is an important point to clarify in the contract.", score: 'neutral' },
        gratuity: { text: "By law, employers must pay a severance pay ('toegig-geum') equivalent to at least one month's salary for every year of service upon contract completion.", score: 'good' },
        importedGoods: { text: "Western groceries and goods are available in larger cities like Seoul but are expensive. A local diet is much more economical.", score: 'bad', multiplier: "1.4x" },
        utilities: { text: "Reasonably priced, though heating in the cold winters can increase costs. Some school-provided housing may include some utilities.", score: 'good', multiplier: "0.9x" },
        transportation: { text: "Excellent, affordable, and efficient public transport systems in major cities like Seoul make cars unnecessary.", score: 'good', multiplier: "0.7x" },
        socialLeisure: { text: "Social life is vibrant and can be very affordable. Local restaurants, soju, and beer are cheap. Western-style bars and restaurants are more expensive.", score: 'good', multiplier: "0.8x" },
        currency: { text: "You are paid in South Korean Won (KRW). The currency can fluctuate. Strict regulations can make sending large sums of money out of the country more complex; plan remittances carefully. Fees can be moderate.", score: 'bad' },
        homeObligations: { text: "With housing often provided, it can be easier to manage home country financial obligations from your Korean salary.", score: 'good' },
        savings: { text: "Moderate savings potential. The low cost of daily living and provided housing helps, but salaries are not as high as in some other regions.", score: 'neutral' }
    }
};

const scoreColorClasses = {
  good: 'text-green-400',
  neutral: 'text-amber-400',
  bad: 'text-red-400',
};

const FeatureDetail = ({ icon, title, description, score, multiplier }: { icon: React.ReactNode, title: string, description: string, score: FeatureScore, multiplier?: string }) => (
    <div className="flex items-start gap-4">
        <div className="mt-1 text-primary">{icon}</div>
        <div className="w-full">
            <div className="flex justify-between items-baseline">
                <h4 className={cn("font-semibold tracking-tight", scoreColorClasses[score])}>{title}</h4>
                {multiplier && <span className={cn("font-bold text-sm", scoreColorClasses[score])}>{multiplier}</span>}
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
    </div>
);


export default function TrueCostsPage() {
  const [selectedCountry, setSelectedCountry] = useState('United Kingdom');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>('acs-cobham-international-school');
  const [familyStatus, setFamilyStatus] = useState('single');
  const [currency, setCurrency] = useState('GBP');
  const data = countrySpecificData[selectedCountry];

  const conversionRates: { [key: string]: number } = {
    USD: 1, // Base currency in mock data
    GBP: 0.8,
    EUR: 0.92,
  };

  const convert = (amount: number) => amount * conversionRates[currency];

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    const firstSchoolInCountry = schools.find(s => s.country === country);
    if (country === 'United Kingdom') {
      setSelectedSchoolId('acs-cobham-international-school');
    } else {
      setSelectedSchoolId(firstSchoolInCountry?.id || null);
    }
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
    const mobileCost = costOfLiving.mobile * adults;
    const diningSocialCost = costOfLiving.diningSocial * adults;
    const uncoveredMedicalCost = costOfLiving.uncoveredMedical * adults + costOfLiving.uncoveredMedical * 0.5 * children;

    const total =
      costOfLiving.apartment +
      foodCost +
      transportCost +
      costOfLiving.utilities +
      costOfLiving.internet +
      mobileCost +
      diningSocialCost +
      costOfLiving.vehicleInsuranceMaint +
      uncoveredMedicalCost;
      
    return total;
  };

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-center">See the True Costs</h1>
        <p className="text-muted-foreground text-center mt-4 mb-8 max-w-3xl mx-auto">
          A high salary doesn't always mean high savings. Our "True Costs" model analyzes contract perks, lifestyle realities, and financial strategy to reveal your true savings potential.
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
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="flex items-center text-xl">
                        <DollarSign className="w-5 h-5 mr-2 text-primary" />
                        Cost Estimator: {selectedSchool.name}
                    </CardTitle>
                    <div className="w-[120px]">
                        <Select value={currency} onValueChange={setCurrency}>
                            <SelectTrigger id="currency-select-page">
                                <SelectValue placeholder="Currency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="GBP">GBP (£)</SelectItem>
                                <SelectItem value="USD">USD ($)</SelectItem>
                                <SelectItem value="EUR">EUR (€)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex justify-between items-center">
                            <span className="flex items-center"><Home className="w-4 h-4 mr-2 text-sky-400" /> Monthly Rent (1-2 Bed)</span>
                            <span>{formatCurrency(convert(selectedSchool.costOfLiving.apartment), currency)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="flex items-center"><Zap className="w-4 h-4 mr-2 text-green-400" /> Utilities (Water/Elec/Gas)</span>
                            <span>{formatCurrency(convert(selectedSchool.costOfLiving.utilities), currency)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="flex items-center"><Wifi className="w-4 h-4 mr-2 text-indigo-400" /> High-Speed Internet</span>
                            <span>{formatCurrency(convert(selectedSchool.costOfLiving.internet), currency)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="flex items-center"><Smartphone className="w-4 h-4 mr-2 text-slate-400" /> Mobile</span>
                            <span>{formatCurrency(convert(selectedSchool.costOfLiving.mobile * adults), currency)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="flex items-center"><Utensils className="w-4 h-4 mr-2 text-amber-400" /> Monthly Groceries</span>
                            <span>{formatCurrency(convert(selectedSchool.costOfLiving.food * adults + selectedSchool.costOfLiving.food * 0.5 * children), currency)}</span>
                        </div>
                         <div className="flex justify-between items-center">
                            <span className="flex items-center"><Coffee className="w-4 h-4 mr-2 text-yellow-600" /> Dining & Social</span>
                            <span>{formatCurrency(convert(selectedSchool.costOfLiving.diningSocial * adults), currency)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="flex items-center"><TramFront className="w-4 h-4 mr-2 text-rose-400" /> Public Transport / Fuel</span>
                            <span>{formatCurrency(convert(selectedSchool.costOfLiving.transport * adults + selectedSchool.costOfLiving.transport * 0.3 * children), currency)}</span>
                        </div>
                         {selectedSchool.costOfLiving.vehicleInsuranceMaint > 0 && <div className="flex justify-between items-center">
                            <span className="flex items-center"><Car className="w-4 h-4 mr-2 text-neutral-400" /> Vehicle Insurance/Maint.</span>
                            <span>{formatCurrency(convert(selectedSchool.costOfLiving.vehicleInsuranceMaint), currency)}</span>
                        </div>}
                         <div className="flex justify-between items-center">
                            <span className="flex items-center"><Stethoscope className="w-4 h-4 mr-2 text-red-400" /> Medical Gaps (e.g. Dental)</span>
                            <span>{formatCurrency(convert(selectedSchool.costOfLiving.uncoveredMedical * adults + selectedSchool.costOfLiving.uncoveredMedical * 0.5 * children), currency)}</span>
                        </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-border">
                        <div className="flex justify-between items-center text-lg font-bold">
                            <span className="text-primary-foreground">Estimated Monthly Total</span>
                            <span className="text-primary">{formatCurrency(convert(calculateTotal(selectedSchool)), currency)}</span>
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
                     <FeatureDetail 
                        icon={<FileText className="w-5 h-5" />}
                        title="Tax Status"
                        description={data.taxStatus.text}
                        score={data.taxStatus.score}
                    />
                     <FeatureDetail 
                        icon={<Home className="w-5 h-5" />}
                        title="Housing Arrangement"
                        description={data.housing.text}
                        score={data.housing.score}
                    />
                     <FeatureDetail 
                        icon={<Plane className="w-5 h-5" />}
                        title="Annual Flight Allowance"
                        description={data.flightAllowance.text}
                        score={data.flightAllowance.score}
                    />
                     <FeatureDetail 
                        icon={<SchoolIcon className="w-5 h-5" />}
                        title="Dependent Tuition"
                        description={data.dependentTuition.text}
                        score={data.dependentTuition.score}
                    />
                     <FeatureDetail 
                        icon={<Award className="w-5 h-5" />}
                        title="Gratuity / Bonus"
                        description={data.gratuity.text}
                        score={data.gratuity.score}
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
                     <FeatureDetail 
                        icon={<ShoppingBasket className="w-5 h-5" />}
                        title="Imported Goods"
                        description={data.importedGoods.text}
                        score={data.importedGoods.score}
                        multiplier={data.importedGoods.multiplier}
                    />
                     <FeatureDetail 
                        icon={<Thermometer className="w-5 h-5" />}
                        title="Utilities (AC/Heat)"
                        description={data.utilities.text}
                        score={data.utilities.score}
                        multiplier={data.utilities.multiplier}
                    />
                     <FeatureDetail 
                        icon={<Car className="w-5 h-5" />}
                        title="Transportation"
                        description={data.transportation.text}
                        score={data.transportation.score}
                        multiplier={data.transportation.multiplier}
                    />
                     <FeatureDetail 
                        icon={<Beer className="w-5 h-5" />}
                        title="Social & Leisure"
                        description={data.socialLeisure.text}
                        score={data.socialLeisure.score}
                        multiplier={data.socialLeisure.multiplier}
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
                     <FeatureDetail 
                        icon={<ArrowRightLeft className="w-5 h-5" />}
                        title="Currency & Fees"
                        description={data.currency.text}
                        score={data.currency.score}
                    />
                     <FeatureDetail 
                        icon={<PiggyBank className="w-5 h-5" />}
                        title="Home Obligations"
                        description={data.homeObligations.text}
                        score={data.homeObligations.score}
                    />
                     <FeatureDetail 
                        icon={<LineChart className="w-5 h-5" />}
                        title="True Savings Potential"
                        description={data.savings.text}
                        score={data.savings.score}
                    />
                </CardContent>
            </Card>
        </div>
        
        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>Disclaimer: The figures provided are estimates for illustrative purposes only and do not constitute financial advice. Actual costs and savings may vary based on individual lifestyle, spending habits, and market conditions.</p>
        </div>

      </div>
    </div>
  );
}

    

    