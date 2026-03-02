'use client';

import { 
  ShieldCheck, 
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
  CheckCircle2,
  Lock,
  Stethoscope,
  Eye,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export default function PreparePage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      {/* Page Header */}
      <div className="mb-16 text-center">
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-4 text-white">
          4. Are you prepared?
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto font-medium text-sm leading-relaxed tracking-widest opacity-60">
          Have you considered all of the contract implications? What about the non-contract factors? We provide the intel you need to ensure the fine print doesn't leave you trapped. Make sure the 'hidden' costs don't derail your experience.
        </p>
      </div>

      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* The Gold Standard Note */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="size-6 text-primary" />
            <h2 className="text-2xl font-black stamped-dossier text-white">The Gold Standard: A note on top schools</h2>
          </div>
          <Card className="glass border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <p className="text-muted-foreground leading-relaxed font-medium italic">
                "Before diving into the pitfalls, it is important to note that top international schools already know everything on this page. For the best employers, these points aren't 'negotiables'—they are the baseline for staff wellbeing. Excellent schools provide transparency because they want focused, happy teachers, not distracted, debt-stressed ones. If a school struggles with these questions, then you have your answer!"
              </p>
            </CardContent>
          </Card>
        </section>

        {/* 1. The Contract */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="size-6 text-accent" />
            <h2 className="text-2xl font-black stamped-dossier text-white">1. The Contract: Hard realities & fine print</h2>
          </div>
          <p className="text-muted-foreground font-medium mb-6">The contract is designed to protect the school, not you. If the logistics are vague, the risk is yours.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass border-white/5">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-white"><Lock className="size-4 text-primary" /> The "over-zealous" privacy clause</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>Watch for contracts with excessively aggressive Non-Disclosure Agreements (NDAs) or "disparagement" clauses that extend far beyond standard GDPR or student data protection.</p>
                <p>If a school threatens legal action for discussing "internal school climate" even after you leave, it is a hallmark of paranoid management. This usually suggests a board with a history of turnover problems who would rather silence staff than fix the culture.</p>
              </CardContent>
            </Card>

            <Card className="glass border-white/5">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-white"><AlertTriangle className="size-4 text-primary" /> The NOC & reference reality</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>While many countries have officially modernised their labour laws to allow mobility, the "Letter of No Objection" (NOC) culture still lingers.</p>
                <div className="p-3 bg-background/50 rounded-sm border border-white/5">
                  <p className="text-[10px] font-black uppercase text-accent tracking-widest mb-1">The soft reality</p>
                  <p>In places like Kuwait, Romania, and the Czech Republic, the legal requirement for an employer to "release" your visa or provide a specific format of reference can still be used as leverage.</p>
                </div>
                <div className="p-3 bg-primary/5 rounded-sm border border-primary/10">
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">The check</p>
                  <p>Research the specific 2026 labour laws for your host country. A school that mentions "withholding references" as a penalty for resignation is often operating on the edge of local legality to keep staff trapped.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="glass border-white/5">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-white"><Coins className="size-4 text-primary" /> Currency erosion & pegging</CardTitle>
              <CardDescription>If you are paid in a local currency not pegged to a stable one (GBP/USD), your savings can vanish overnight.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-accent mb-4">The USD Peg List (2026 status)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {[
                    { country: 'UAE', rate: '3.67' },
                    { country: 'Saudi Arabia', rate: '3.75' },
                    { country: 'Qatar', rate: '3.64' },
                    { country: 'Bahrain', rate: '0.376' },
                    { country: 'Oman', rate: '0.385' },
                    { country: 'Jordan', rate: '0.71' },
                  ].map((peg) => (
                    <div key={peg.country} className="p-3 bg-background/50 border border-white/5 rounded-sm text-center">
                      <p className="text-[10px] font-black text-muted-foreground uppercase">{peg.country}</p>
                      <p className="text-base font-bold text-white">{peg.rate}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] font-black uppercase text-muted-foreground mr-2">Official tender:</span>
                {['Bahamas', 'Bermuda', 'Ecuador', 'El Salvador', 'Panama', 'Turks and Caicos', 'BVI'].map(country => (
                  <Badge key={country} variant="outline" className="bg-accent/5 border-accent/20 text-accent font-bold uppercase text-[9px] px-2">{country}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground italic bg-background/30 p-3 rounded-sm">Note: If your destination isn't on this list, you must ask how the school mitigates exchange rate volatility.</p>
            </CardContent>
          </Card>
        </section>

        {/* 2. The Onboarding Cash-Flow Crater */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="size-6 text-red-400" />
            <h2 className="text-2xl font-black stamped-dossier text-white">2. The onboarding "cash-flow crater"</h2>
          </div>
          <p className="text-muted-foreground font-medium mb-6">Onboarding is the most financially dangerous phase of an international move.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><PlaneLanding className="size-4 text-primary" /> The family runway (6+ weeks)</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">For a single teacher, the "Gap Month" is a challenge. For a family, it is a potential crisis. Most schools pay in arrears; if you arrive on 1st August, your first full salary may not hit until 30th August.</p>
              <div className="p-4 glass border-red-500/20 bg-red-500/5 rounded-sm">
                <p className="text-[10px] font-black uppercase text-red-400 tracking-widest mb-2">Tactical reserve requirement</p>
                <p className="text-xl font-bold text-white">£4,000 – £6,000</p>
                <p className="text-xs text-muted-foreground mt-1">Minimum accessible liquid cash for a family move.</p>
              </div>
              <ul className="text-xs space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2"><span className="text-primary font-bold">Upfront costs:</span> You are paying for 4+ flights, 4+ visa medicals, and 4+ sets of document legalisation.</li>
                <li className="flex items-start gap-2"><span className="text-primary font-bold">Hidden first week:</span> Groceries, car rentals, and home basics before any reimbursement protocol triggers.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><ShoppingCart className="size-4 text-primary" /> The empty flat & the IKEA test</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">"Unfurnished" often means exactly that: no fridge, no washing machine, no lightbulbs.</p>
              <div className="p-4 glass border-accent/20 bg-accent/5 rounded-sm">
                <p className="text-[10px] font-black uppercase text-accent tracking-widest mb-2">The intel</p>
                <p className="text-sm text-muted-foreground italic leading-relaxed">Don't take the recruiter's word for it. Get on regional housing sites (PropertyFinder/Zillow) and check the local IKEA. Check out and join local Facebook Marketplace pages; you could grab a local bargain. Calculate a "Starter Kit" (Bed, Fridge, Basic Sofa) in local currency.</p>
              </div>
              <p className="text-xs text-muted-foreground border-l-2 border-primary pl-4">"That £1,000 'settling-in allowance' rarely covers a family-sized refrigerator."</p>
            </div>
          </div>
        </section>

        {/* 3. Professional Reality */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className="size-6 text-primary" />
            <h2 className="text-2xl font-black stamped-dossier text-white">3. Professional reality: The daily grind</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-4 glass rounded-sm space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">The "floating" teacher</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">Pushing a trolley between rooms can eat 2–3 hours of your week. Is this factored into your contact hours?</p>
            </div>
            <div className="p-4 glass rounded-sm space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Administrative bloat</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">The #1 cause of international burnout. You may spend more time on "social media evidence" than lesson planning.</p>
            </div>
            <div className="p-4 glass rounded-sm space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Parental overreach</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">Ensure the leadership team backs educational best practices over "customer satisfaction" in high-fee schools.</p>
            </div>
          </div>
        </section>

        {/* Field Anecdotes: Raw Intel */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquareQuote className="size-6 text-primary" />
            <h2 className="text-2xl font-black stamped-dossier text-white">Field anecdotes: Raw intelligence</h2>
          </div>
          <p className="text-muted-foreground font-medium mb-6">Direct reports from the field on medical and bureaucratic realities.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="glass border-primary/10 bg-primary/5 rounded-sm">
              <CardContent className="pt-6 space-y-3">
                <Stethoscope className="size-5 text-primary opacity-50" />
                <p className="text-sm text-muted-foreground leading-relaxed italic font-medium">
                  "We have seen some truly horrifying Dentist Surgeries, despite the pain we just turned and walked."
                </p>
              </CardContent>
            </Card>
            <Card className="glass border-primary/10 bg-primary/5 rounded-sm">
              <CardContent className="pt-6 space-y-3">
                <Coins className="size-5 text-primary opacity-50" />
                <p className="text-sm text-muted-foreground leading-relaxed italic font-medium">
                  "Paying 300 gbp up front for the ambulance ride (claimed back later) was stressful."
                </p>
              </CardContent>
            </Card>
            <Card className="glass border-primary/10 bg-primary/5 rounded-sm">
              <CardContent className="pt-6 space-y-3">
                <Eye className="size-5 text-primary opacity-50" />
                <p className="text-sm text-muted-foreground leading-relaxed italic font-medium">
                  "My eye test for my driving license required my to just be able to place my credit card on the card reader!"
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 4. Essential Questions */}
        <section className="space-y-6 pb-12">
          <div className="flex items-center gap-3 mb-2">
            <Search className="size-6 text-accent" />
            <h2 className="text-2xl font-black stamped-dossier text-white">4. Essential questions</h2>
          </div>
          <p className="text-muted-foreground font-medium mb-6">Flush out the truth before you pack your bags.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "Is the relocation allowance paid as upfront cash on arrival, or via the first month’s payroll?",
              "What is the exact weekly contact time in minutes? (Reject 'it varies').",
              "Can I speak to a current teacher in my department, one-to-one, without a member of SLT present?",
              "What was the staff turnover rate in the last two academic years?",
              "Does the school pay for document legalisation and Apostille fees upfront?",
              "Is the provided housing 'Turnkey', or will I need a furniture fund for white goods?",
              "Can I see the full Schedule of Benefits for the health insurance policy? (Do not accept 'Medical is included')."
            ].map((q, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-background/40 border border-white/5 rounded-sm hover:border-primary/30 transition-colors group">
                <MessageSquareQuote className="size-4 text-primary shrink-0 mt-1 opacity-50 group-hover:opacity-100" />
                <p className="text-sm font-medium text-white/90 leading-relaxed italic">"{q}"</p>
              </div>
            ))}
          </div>
          
          <div className="mt-8 p-6 glass border-accent/20 bg-accent/5 rounded-sm flex items-start gap-4">
            <Info className="size-6 text-accent shrink-0 mt-1" />
            <div className="space-y-2">
              <h4 className="text-sm font-black uppercase tracking-widest text-accent">Insurance vetting strategy</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You need to know if it covers dental, chronic conditions, and which specific hospitals are in-network. A \"Basic\" local plan is often useless for expats. Always request the full policy document before signing.
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
