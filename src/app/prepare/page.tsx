'use client';

import Link from 'next/link';
import { 
  FileText, 
  Search, 
  Trophy, 
  PlaneLanding, 
  ShoppingCart,
  MessageSquareQuote, 
  Lock,
  Eye,
  Banknote,
  Milestone,
  PackageCheck,
  LogOut,
  GraduationCap,
  Landmark,
  ShieldAlert,
  HeartPulse,
  FileCheck,
  Flag,
  Briefcase
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PreparePage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="mb-16 text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white normal-case">
            4. Are you prepared?
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto font-medium text-base md:text-lg leading-relaxed tracking-wide opacity-60 uppercase tracking-widest">
            The final audit. Ensure your tactical transition is fully operational.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-16">
        
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="size-6 text-primary" />
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white normal-case">The gold standard: Top schools</h2>
          </div>
          <Card className="glass border-primary/20 bg-primary/5">
            <CardContent className="pt-8">
              <p className="text-lg md:text-xl text-white leading-relaxed font-bold italic">
                "Before diving into the pitfalls, it is important to note that top international schools already know everything on this page. For the best employers, these points aren't 'negotiables'—they are the baseline for staff wellbeing. Excellent schools provide transparency because they want focused, happy teachers, not debt-stressed ones. If a school struggles with these questions, that tells you all you need to know!"
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-black stamped-dossier text-white normal-case">Contract flags</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-sm border border-red-500/20 bg-red-500/5 flex items-start gap-4">
              <div className="mt-1"><Flag className="size-4 fill-red-500 text-red-500" /></div>
              <div>
                <p className="text-[10px] font-black text-red-400 tracking-widest mb-1 uppercase">red flag</p>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">One or two are enough for you to seriously consider turning down your offer unless you are able to totally mitigate the impact.</p>
              </div>
            </div>
            <div className="p-4 rounded-sm border border-amber-500/20 bg-amber-500/5 flex items-start gap-4">
              <div className="mt-1"><Flag className="size-4 fill-amber-500 text-amber-500" /></div>
              <div>
                <p className="text-[10px] font-black text-amber-400 tracking-widest mb-1 uppercase">orange flag</p>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">Caution: consider what you can do to mitigate the impact. 4 or 5 flags mean you should re-evaluate the risk.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="size-7 text-accent" />
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white normal-case">1. The contract: Hard realities</h2>
          </div>
          <p className="text-base md:text-lg text-muted-foreground font-medium mb-8">You need to ensure you have full contractual clarity. Are you clear on all the specific definitions and terms? Don't move forward until baseline protections are explicitly documented.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass border-red-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><Lock className="size-5 text-primary" /> The "over-zealous" privacy clause</CardTitle>
                <Flag className="size-4 fill-red-500 text-red-500" />
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed space-y-4">
                <p>Watch for contracts with excessively aggressive Non-Disclosure Agreements (NDAs) or "disparagement" clauses that extend far beyond standard GDPR or student data protection.</p>
                <p>If a school threatens legal action for discussing "internal school climate" even after you leave, it is a hallmark of paranoid management.</p>
              </CardContent>
            </Card>

            <Card className="glass border-red-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><Banknote className="size-5 text-primary" /> Pay scale transparency</CardTitle>
                <Flag className="size-4 fill-red-500 text-red-500" />
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed space-y-4">
                <p>A hallmark of a professional institution is a published, transparent pay scale. If a school refuses to show you where you sit on a scale, you are likely being low-balled.</p>
              </CardContent>
            </Card>

            <Card className="glass border-amber-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><ShieldAlert className="size-5 text-primary" /> Vague logistical definitions</CardTitle>
                <Flag className="size-4 fill-amber-500 text-amber-500" />
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed space-y-4">
                <p>Ambiguity in contract definitions often leads to mission creep. If the housing, flight, or utility provision is not explicitly detailed, the school can unilaterally change the standard.</p>
              </CardContent>
            </Card>

            <Card className="glass border-amber-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><ShieldAlert className="size-5 text-primary" /> Exit & reference protocols</CardTitle>
                <Flag className="size-4 fill-amber-500 text-amber-500" />
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed space-y-4">
                <p>Ensure you verify the local exit protocols. If a school has the legal power to block your next move or withhold your gratuity based on "unprofessional conduct," the risk is high.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <PackageCheck className="size-7 text-primary" />
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white normal-case">2. The onboarding challenge</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 normal-case"><PlaneLanding className="size-5 text-primary" /> Upfront & hidden costs</h3>
                <Flag className="size-4 fill-amber-500 text-amber-500" />
              </div>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Upfront costs cover visa medicals and document legalisation. You'll also need ready cash for a housing security deposit.</p>
              <div className="p-6 glass border-red-500/20 bg-red-500/5 rounded-sm">
                <p className="text-[10px] font-black text-red-400 tracking-[0.2em] uppercase mb-2">Tactical reserve requirement</p>
                <p className="text-3xl font-black text-white tracking-tighter">£4,000 – £6,000</p>
                <p className="text-xs text-muted-foreground mt-2 font-medium">Minimum capital for family moves adjusted for the initial 6-week "gap month" before the first full salary cycle.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 normal-case"><ShoppingCart className="size-5 text-primary" /> The IKEA test</h3>
                <Flag className="size-4 fill-amber-500 text-amber-500" />
              </div>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">"Unfurnished" means no fridge or washing machine. Shipping your own goods can take 3+ months to arrive and clear customs.</p>
              <div className="p-6 glass border-accent/20 bg-accent/5 rounded-sm space-y-4">
                <p className="text-sm md:text-base text-muted-foreground italic leading-relaxed font-medium">Check local IKEA sites. A £1,000 'settling-in allowance' may only cover basic white goods. Is shipping worth the freight fees?</p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <HeartPulse className="size-7 text-primary" />
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white normal-case">3. Long-term survival</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass border-red-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><GraduationCap className="size-5 text-primary" /> The dependent education trap</CardTitle>
                <Flag className="size-4 fill-red-500 text-red-500" />
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed">
                <p>"Free schooling" often excludes capital levies, uniforms, and mandatory trips. If your child needs SEN support, some schools may charge you for that staff salary.</p>
              </CardContent>
            </Card>

            <Card className="glass border-amber-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><LogOut className="size-5 text-primary" /> The "offboarding cliff"</CardTitle>
                <Flag className="size-4 fill-amber-500 text-amber-500" />
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed">
                <p>Verify if the End of Service (EOS) gratuity is calculated on basic salary or total package. The difference can be 40%.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <div className="flex justify-center pt-8">
            <Button asChild size="lg" className="h-14 px-10 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-sm shadow-[0_0_25px_rgba(249,115,22,0.2)]">
                <Link href="/prepare/checklist">
                <FileCheck className="mr-3 size-5" /> Download strategic checksheet
                </Link>
            </Button>
        </div>

        <section className="space-y-8 pb-12">
          <div className="flex items-center gap-3 mb-2">
            <Search className="size-7 text-accent" />
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white normal-case">5. Essential questions</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "What is the weekly cap on teacher contact time?",
              "Is the EOS gratuity based on basic salary or total package?",
              "Can I see the full Schedule of Benefits for health insurance?",
              "What is the deductible and co-pay for inpatient care?",
              "Are all capital levies and mandatory fees waived for staff children?",
              "Can I speak to a current teacher in my department privately?",
              "What was the staff turnover rate in the last two years?",
              "Does the school pay for document legalisation fees upfront?",
              "Is the provided housing 'turnkey' or unfurnished?",
              "Is there a monthly cap on utility-inclusive housing?"
            ].map((q, i) => (
              <div key={i} className="flex items-start gap-4 p-5 bg-background/40 border border-white/5 rounded-sm hover:border-primary/30 transition-colors group">
                <MessageSquareQuote className="size-5 text-primary shrink-0 mt-1 opacity-50 group-hover:opacity-100 transition-opacity" />
                <p className="text-base font-medium text-white/90 leading-relaxed italic">"{q}"</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}