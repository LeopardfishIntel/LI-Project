'use client';

import Link from 'next/link';
import { 
  FileText, 
  TrendingDown, 
  Briefcase, 
  Search, 
  Trophy, 
  AlertTriangle, 
  Coins, 
  PlaneLanding, 
  ShoppingCart,
  MessageSquareQuote, 
  Lock,
  Stethoscope,
  Eye,
  Info,
  Banknote,
  Milestone,
  ExternalLink,
  PackageCheck,
  LogOut,
  GraduationCap,
  Landmark,
  ShieldAlert,
  Clock,
  Zap,
  HeartPulse,
  FileCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function PreparePage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      {/* Page Header */}
      <div className="mb-16 text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white">
            4. Are you prepared?
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto font-medium text-base md:text-lg leading-relaxed tracking-wide opacity-70">
            We provide the questions you need to consider to ensure the fine print doesn't leave you unhappy or trapped. Make sure these 'hidden' implications don't derail your experience.
          </p>
        </div>
        
        <div className="flex justify-center">
          <Button asChild size="lg" className="h-14 px-8 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-sm shadow-[0_0_25px_rgba(249,115,22,0.2)]">
            <Link href="/prepare/checklist">
              <FileCheck className="mr-3 size-5" /> Download strategic checksheet
            </Link>
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-16">
        
        {/* The Gold Standard Note */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="size-6 text-primary" />
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white">The Gold Standard: A note on top schools</h2>
          </div>
          <Card className="glass border-primary/20 bg-primary/5">
            <CardContent className="pt-8">
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-medium italic">
                "Before diving into the pitfalls, it is important to note that top international schools already know everything on this page. For the best employers, these points aren't 'negotiables'—they are the baseline for staff wellbeing. Excellent schools provide transparency because they want focused, happy teachers, not distracted, debt-stressed ones. If a school struggles with these questions, that tells you all you need to know!"
              </p>
            </CardContent>
          </Card>
        </section>

        {/* 1. The Contract */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="size-7 text-accent" />
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white">1. The Contract: Hard realities & fine print</h2>
          </div>
          <p className="text-base md:text-lg text-muted-foreground font-medium mb-8">If the definitions are vague or missing, the risk is then entirely yours.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass border-red-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white"><Lock className="size-5 text-primary" /> The "over-zealous" privacy clause</CardTitle>
                <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 font-bold text-[9px] px-2 py-0.5 whitespace-nowrap ml-2">Red Flag: No Go</Badge>
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed space-y-4">
                <p>Watch for contracts with excessively aggressive Non-Disclosure Agreements (NDAs) or "disparagement" clauses that extend far beyond standard GDPR or student data protection.</p>
                <p>If a school threatens legal action for discussing "internal school climate" even after you leave, it is a hallmark of paranoid management. This usually suggests a board with a history of turnover problems who would rather silence staff than fix the culture.</p>
              </CardContent>
            </Card>

            <Card className="glass border-amber-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white"><AlertTriangle className="size-5 text-primary" /> Vague logistical definitions</CardTitle>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold text-[9px] px-2 py-0.5 whitespace-nowrap ml-2">Amber Flag: Consider implications</Badge>
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed space-y-4">
                <p>Ambiguity in contract definitions often leads to mission creep. If the housing, flight, or utility provision is not explicitly detailed, the school can unilaterally change the standard.</p>
                <div className="p-4 bg-background/50 rounded-sm border border-white/5">
                  <p className="text-[10px] font-black text-accent tracking-[0.2em] uppercase mb-2">Diagnostic strategy</p>
                  <p className="text-sm">Demand specific parameters for any clause containing "as per policy" or "to be determined."</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-red-500/20 md:col-span-2">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white"><Banknote className="size-5 text-primary" /> Pay scale transparency & annual reviews</CardTitle>
                <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 font-bold text-[9px] px-2 py-0.5 whitespace-nowrap ml-2">Red Flag: No Go</Badge>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="text-sm md:text-base text-muted-foreground leading-relaxed space-y-4">
                  <p>A hallmark of a professional institution is a published, transparent pay scale. If a school refuses to show you where you sit on a scale, or if "salary is based on experience" without a clear framework, you are likely being low-balled.</p>
                  <p>Furthermore, check for specific mention of an <strong>Annual Pay Review</strong>. In inflationary environments, a static 2-year contract without an adjustment clause is a guaranteed real-terms pay cut.</p>
                </div>
                <div className="p-6 bg-primary/5 rounded-sm border border-primary/10 flex flex-col justify-center">
                  <p className="text-[10px] font-black text-primary tracking-[0.2em] uppercase mb-3">Diagnostic signal</p>
                  <p className="text-sm md:text-base text-muted-foreground italic leading-relaxed">"If the school says pay increases are 'discretionary' or 'performance-linked' without a clear rubric, assume they won't happen. Elite schools bake cost-of-living adjustments into their operational budgets."</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-amber-500/20 md:col-span-2">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white"><ShieldAlert className="size-5 text-primary" /> Visa and reference protocols</CardTitle>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold text-[9px] px-2 py-0.5 whitespace-nowrap ml-2">Amber Flag: Consider implications</Badge>
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed space-y-4">
                <p>While many countries have officially modernised their labour laws to allow mobility, the "Letter of No Objection" (NOC) culture still lingers in certain territories.</p>
                <p>In places like Kuwait, Romania, and the Czech Republic, the legal requirement for an employer to "release" your visa or provide a specific format of reference may be different to your home country. Make sure you understand your situation before you go.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 2. Logistical Payload */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <PackageCheck className="size-7 text-primary" />
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white">2. Logistical payload: The relocation crater</h2>
          </div>
          <p className="text-base md:text-lg text-muted-foreground font-medium mb-8">Onboarding and shipping are the most financially dangerous phases of an international move.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><PlaneLanding className="size-5 text-primary" /> Upfront & hidden costs</h3>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold text-[9px] px-2 py-0.5">Amber Flag</Badge>
              </div>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Upfront costs cover visa medicals and document legalisation for the whole family. You'll also need ready cash for a housing security deposit plus car rental fees and deposits. Groceries and home basics will also need to be covered before any reimbursement protocol triggers.</p>
              <div className="p-6 glass border-red-500/20 bg-red-500/5 rounded-sm">
                <p className="text-[10px] font-black text-red-400 tracking-[0.2em] uppercase mb-2">Tactical reserve requirement</p>
                <p className="text-3xl font-black text-white tracking-tighter">£4,000 – £6,000</p>
                <p className="text-xs text-muted-foreground mt-2 font-medium">Minimum capital for family moves adjusted for the initial 6-week "gap month" before the first full salary cycle.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><ShoppingCart className="size-5 text-primary" /> The empty flat & shipping delay</h3>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold text-[9px] px-2 py-0.5">Amber Flag</Badge>
              </div>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">"Unfurnished" means no fridge or washing machine. Shipping your own goods can take 3+ months to arrive and clear customs.</p>
              <div className="p-6 glass border-accent/20 bg-accent/5 rounded-sm space-y-4">
                <p className="text-[10px] font-black text-accent tracking-[0.2em] uppercase">The cost/benefit trade-off</p>
                <p className="text-sm md:text-base text-muted-foreground italic leading-relaxed font-medium">Don't take the recruiter's word for it. Check the local IKEA website and join local Facebook Marketplace pages; you could grab a local bargain. A £1,000 'settling-in allowance' may only cover a family-sized refrigerator if you buy new. Is shipping your 5-year-old sofa worth £2,000 in freight and port fees?</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Long-term Survival */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="size-7 text-primary" />
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white">3. Long-term mission survival: Avoiding burnout</h2>
          </div>
          <p className="text-base md:text-lg text-muted-foreground font-medium mb-8">Identify the "slow-burn" financial drains that cause mid-contract exits.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass border-amber-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white"><LogOut className="size-5 text-primary" /> The "offboarding cliff"</CardTitle>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold text-[9px] px-2 py-0.5 whitespace-nowrap ml-2">Amber Flag</Badge>
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed space-y-4">
                <p>In many regions (especially the Middle East), the End of Service (EOS) gratuity is your only real savings vehicle. You must verify if this is calculated on <strong>Basic Salary</strong> or <strong>Total Package</strong>. The difference can be 40%.</p>
                <p>Also check the flight protocol: does the school provide the final flight only if you complete the full contract? What happens when you have a two year contract and want to fly the family home for the summer?</p>
              </CardContent>
            </Card>

            <Card className="glass border-amber-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white"><HeartPulse className="size-5 text-primary" /> The "co-pay creep"</CardTitle>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold text-[9px] px-2 py-0.5 whitespace-nowrap ml-2">Amber Flag</Badge>
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed space-y-4">
                <p>Even with "Premium" insurance, a 20% co-pay on a $5,000 emergency surgery in a private expat hospital is a $1,000 out-of-pocket hit. This is the #1 medical red flag.</p>
                <p>Always request the "Schedule of Benefits" to check the deductible (excess) for both inpatient and outpatient care before signing.</p>
              </CardContent>
            </Card>

            <Card className="glass border-red-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white"><GraduationCap className="size-5 text-primary" /> The dependent education trap</CardTitle>
                <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 font-bold text-[9px] px-2 py-0.5 whitespace-nowrap ml-2">Red Flag: No Go</Badge>
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed space-y-4">
                <p>"Free schooling" often excludes Capital Levies ($500–$1,000/yr), books, and mandatory international trips. If your child needs SEN support (LSA), some schools may charge <strong>you</strong> for that staff salary.</p>
              </CardContent>

            <Card className="glass border-amber-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white"><Landmark className="size-5 text-primary" /> The "tax residency" ghost</CardTitle>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold text-[9px] px-2 py-0.5 whitespace-nowrap ml-2">Amber Flag</Badge>
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed space-y-4">
                <p>Tax-free at the source does not mean tax-free at home. If you don't spend enough days out of your home country (e.g., UK Statutory Residence Test), you might owe your home government a massive chunk of that salary.</p>
                <p className="italic font-bold text-white/80">Consult a specialist on residency rules before assuming your savings are 'net'.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 4. Professional Reality */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className="size-7 text-primary" />
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white">4. Professional reality: The daily grind</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 glass rounded-sm space-y-3 hover:border-amber-500/30 transition-colors border-amber-500/10">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black tracking-[0.2em] text-primary uppercase">The "floating" teacher</h4>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold text-[8px] px-1 py-0">Amber</Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">Lugging your books and equipment between rooms can eat 2–3 hours of your week. Is this factored into your contact hours? Look out for transition time between campuses, and help with transport.</p>
            </div>
            <div className="p-6 glass rounded-sm space-y-3 hover:border-amber-500/30 transition-colors border-amber-500/10">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black tracking-[0.2em] text-primary uppercase">Administrative bloat</h4>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold text-[8px] px-1 py-0">Amber</Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">The #1 cause of international burnout. You may spend more time on "social media evidence" than lesson planning. A quick review of their Social media pages can provide numerous insights.</p>
            </div>
            <div className="p-6 glass rounded-sm space-y-3 hover:border-red-500/30 transition-colors border-red-500/10">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black tracking-[0.2em] text-primary uppercase">Parental overreach</h4>
                <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 font-bold text-[8px] px-1 py-0">Red Flag</Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">Ensure the leadership team backs educational best practices over "customer satisfaction" in high-fee schools. Do they maintain professional boundaries for enrolment? Is this driven by a student's ability to thrive, rather than external financial pressure.</p>
            </div>
          </div>
        </section>

        {/* Field Anecdotes: Raw Intel */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquareQuote className="size-7 text-primary" />
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white">Field anecdotes: Raw intelligence</h2>
          </div>
          <p className="text-base md:text-lg text-muted-foreground font-medium mb-8">Direct reports from the field on medical and bureaucratic realities.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="glass border-primary/10 bg-primary/5 rounded-sm">
              <CardContent className="pt-8 space-y-4">
                <Stethoscope className="size-6 text-primary opacity-50" />
                <p className="text-base text-muted-foreground leading-relaxed italic font-medium">
                  "We have seen some truly horrifying Dentist Surgeries, despite the pain we just turned and walked."
                </p>
              </CardContent>
            </Card>
            <Card className="glass border-primary/10 bg-primary/5 rounded-sm">
              <CardContent className="pt-8 space-y-4">
                <Coins className="size-6 text-primary opacity-50" />
                <p className="text-base text-muted-foreground leading-relaxed italic font-medium">
                  "Paying up front for the ambulance ride (claimed back later) only added to a already stressful situation."
                </p>
              </CardContent>
            </Card>
            <Card className="glass border-primary/10 bg-primary/5 rounded-sm">
              <CardContent className="pt-8 space-y-4">
                <Eye className="size-6 text-primary opacity-50" />
                <p className="text-base text-muted-foreground leading-relaxed italic font-medium">
                  "My eye test for my driving license required me to just be able see well enough to place my credit card on their card reader!"
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 5. Essential Questions */}
        <section className="space-y-8 pb-12">
          <div className="flex items-center gap-3 mb-2">
            <Search className="size-7 text-accent" />
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white">5. Essential Questions</h2>
          </div>
          <p className="text-base md:text-lg text-muted-foreground font-medium mb-8">Flush out the truth before you pack your bags.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "What is the weekly cap on teacher contact time, and how is my protected PPA time structurally guaranteed against administrative encroachment? for example being excessively used for cover can eat into your prep time.",
              "Does the End of Service Gratuity calculate based on the total monthly package or the basic salary only? Is this paid alongside my final salary payment?",
              "What is the deductible (excess) and co-pay percentage for inpatient and outpatient care? Is there a direct-billing agreement or is it a pay and reclaim agreement with the major international hospitals in the city?",
              "Are all dependent educational fees (capital levies, books, uniforms, and exams) fully waived for staff children, or just the base tuition?",
              "Does the school require weekend attendance for open days, marketing events, or residential trips, and is this compensated with time-in-lieu?",
              "In the event of a family emergency back home, does the school have a policy for compassionate leave and emergency flight assistance?",
              "Is the housing 'utility-inclusive' (DEWA/Electricity/Water), or is there a monthly cap? If not, what is the average monthly utility bill for a family in August/September?",
              "Can I speak to a current teacher in my department, one-to-one, without a member of SLT present?",
              "What was the staff turnover rate in the last two academic years?",
              "Does the school pay for document legalisation and Apostille fees upfront?",
              "Is the provided housing 'Turnkey', or will I need a furniture fund for white goods?",
              "Can I see the full Schedule of Benefits for the health insurance policy? (Do not accept 'Medical is included')."
            ].map((q, i) => (
              <div key={i} className="flex items-start gap-4 p-5 bg-background/40 border border-white/5 rounded-sm hover:border-primary/30 transition-colors group">
                <MessageSquareQuote className="size-5 text-primary shrink-0 mt-1 opacity-50 group-hover:opacity-100 transition-opacity" />
                <p className="text-base font-medium text-white/90 leading-relaxed italic">"{q}"</p>
              </div>
            ))}
          </div>
          
          <div className="mt-12 p-8 glass border-accent/20 bg-accent/5 rounded-sm flex items-start gap-6">
            <div className="flex-shrink-0 mt-1"><Info className="size-8 text-accent" /></div>
            <div className="space-y-3">
              <h4 className="text-sm font-black tracking-[0.2em] text-accent uppercase">Insurance vetting strategy</h4>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium">
                You need to know if it covers dental, chronic conditions, and which specific hospitals are in-network. A "Basic" local plan is often useless for expats. Always request the full policy document before signing.
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
