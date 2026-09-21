import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { 
  Scale, 
  ShieldAlert, 
  FileText, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Compass, 
  Globe2, 
  ExternalLink, 
  Mail,
  HelpCircle,
  Calculator
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: "Terms of Service | Leopard Fish Intel",
  description: "Read the Leopard Fish Intel Terms of Service, non-binding financial modeling disclaimer, candidate due diligence requirements, and acceptable use policy.",
  alternates: {
    canonical: "https://leopardfishintel.com/terms",
  },
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 selection:bg-[#d95f02]/30 selection:text-white pb-24">
      {/* Background radial glows */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#d95f02]/10 blur-[140px] rounded-full" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-amber-500/10 blur-[160px] rounded-full" />
      </div>

      {/* Top Breadcrumb / Nav */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-4">
        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" asChild className="border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800 px-4 py-2 text-xs">
            <Link href="/">
              <ArrowLeft className="mr-2 size-3.5" /> Back to Home
            </Link>
          </Button>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
            <Scale className="size-3.5" />
            <span>Governed by English Law</span>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <header className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 border-b border-slate-800/80">
        <div className="flex items-start gap-4 mb-4">
          <div className="size-14 rounded-2xl bg-[#d95f02]/15 border border-[#d95f02]/30 flex items-center justify-center text-[#d95f02] shrink-0 shadow-inner">
            <Scale className="size-7" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-[#d95f02]">Legal &amp; Compliance</span>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase mt-1">
              Terms of Service
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 mt-4">
          <span><strong>Last Updated:</strong> September 2026</span>
          <span className="text-slate-700">•</span>
          <span><strong>Effective Date:</strong> September 2026</span>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-12 leading-relaxed">

        {/* Section 1: Acceptance of Terms */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="font-mono text-[#d95f02] text-sm">01.</span>
            <h2>Acceptance of Terms</h2>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-300 text-sm">
            <p>
              By accessing or using Leopard Fish Intel (including <code className="text-amber-400 font-mono">/financial-forecaster</code>, <code className="text-amber-400 font-mono">/decide</code>, <code className="text-amber-400 font-mono">/schools</code>, and associated evaluation tools), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you must not access or use the platform.
            </p>
          </div>
        </section>

        {/* Section 2: Nature of Service & Financial Modeling Disclaimer */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="font-mono text-[#d95f02] text-sm">02.</span>
            <h2>Nature of Service &amp; Financial Modeling Disclaimer</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Calculator className="size-4" />
                <h3>A. Non-Binding Indicative Benchmarks</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Leopard Fish Intel provides informational, data-driven financial benchmarks and comparative tools designed for international educators. All financial outputs—including monthly disposable surplus estimates, 2-year bankable pots, local tax calculations, utilities/housing outgoings, and school match scores—are <strong>non-binding mathematical models</strong>.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <Globe2 className="size-4" />
                <h3>B. Methodological Framework</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Calculations are generated using standardized economic baseline models, including OECD Purchasing Power Parity (PPP) indices, 5-year step salary assumptions, and public tax frameworks. They do not represent a guaranteed salary offer, formal contract specification, or binding financial commitment from any hiring institution.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <ShieldAlert className="size-4" />
                <h3>C. No Professional Advice</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Content provided across the platform is for comparative research and informational guidance only. Leopard Fish Intel does not provide formal legal, tax, financial, immigration, or binding employment advice.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Candidate Due Diligence Requirement */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="font-mono text-[#d95f02] text-sm">03.</span>
            <h2>Candidate Due Diligence Requirement</h2>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3 text-sm text-slate-300">
            <p>
              International teaching packages vary significantly based on individual factors, including accredited years of experience, marital status, dependent child school fee allowances, local tax residency status, and specific contract negotiation.
            </p>
            <p>You acknowledge and agree that:</p>
            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>You are solely responsible for conducting your own independent due diligence.</span>
              </li>
              <li className="flex items-start gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>You must verify exact salary scales, housing allowance caps, medical coverage details, flight allocations, and visa eligibility criteria directly with the hiring school&apos;s HR department prior to executing employment contracts or making relocation decisions.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4: Intellectual Property & Direct Engine */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="font-mono text-[#d95f02] text-sm">04.</span>
            <h2>Intellectual Property, Fair Use, &amp; Direct Engine Architecture</h2>
          </div>
          
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4 text-sm text-slate-300">
            <div className="space-y-1.5">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">A. Nominative Fair Use</h4>
              <p className="text-xs text-slate-400">
                School names, regional locations, curriculum types, and factual job metadata displayed on the platform are used strictly for descriptive identification and comparative educational research purposes under nominative fair use principles.
              </p>
            </div>

            <div className="h-px bg-slate-800" />

            <div className="space-y-1.5">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">B. No Brand Affiliation or Endorsement</h4>
              <p className="text-xs text-slate-400">
                Leopard Fish Intel is an independent intelligence platform. Reference to any international school, educational group (e.g., GEMS, Cognita, Taaleem, Nord Anglia), or host ATS platform does not imply endorsement, sponsorship, corporate affiliation, or official partnership between Leopard Fish Intel and that entity.
              </p>
            </div>

            <div className="h-px bg-slate-800" />

            <div className="space-y-1.5">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">C. Outbound Indexing Architecture</h4>
              <p className="text-xs text-slate-400">
                Leopard Fish Intel operates as a direct indexing engine. We do not host application forms, alter official job specifications, or collect recruitment fees from candidates. Outbound source buttons (<code className="text-slate-300 font-mono">Direct ↗</code>, <code className="text-slate-300 font-mono">TES ↗</code>, <code className="text-slate-300 font-mono">PDF Spec ↗</code>) route candidates directly to primary HR endpoints and public career portals maintained by the respective schools.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: User Conduct */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="font-mono text-[#d95f02] text-sm">05.</span>
            <h2>User Conduct &amp; Acceptable Use</h2>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 text-sm text-slate-300">
            <p className="mb-3">When using Leopard Fish Intel, you agree not to:</p>
            <ul className="space-y-2 text-xs">
              <li className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start gap-2">
                <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Use automated scripts, bots, scrapers, or crawlers to extract platform data, benchmark tables, or underlying school datasets without prior written authorization.</span>
              </li>
              <li className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start gap-2">
                <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Interfere with, compromise, or disrupt the integrity or security of our servers, database APIs, or network routing infrastructure.</span>
              </li>
              <li className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start gap-2">
                <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Attempt to bypass authentication controls or access protected account routes without valid authorization.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Section 6: Limitation of Liability */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="font-mono text-[#d95f02] text-sm">06.</span>
            <h2>Limitation of Liability</h2>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3 text-sm text-slate-300">
            <p>
              To the maximum extent permitted by applicable law, Leopard Fish Intel, its founders, operators, and developers shall not be liable for any direct, indirect, incidental, consequential, special, or punitive damages arising from:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs text-slate-400 pl-1">
              <li>Your access to, reliance on, or inability to access the platform.</li>
              <li>Inaccuracies, errors, or omissions in financial models, cost-of-living indices, or job vacancy listings.</li>
              <li>Relocation costs, contract disputes, financial losses, or employment decisions resulting from research conducted on the platform.</li>
            </ul>
          </div>
        </section>

        {/* Section 7: Indemnification */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="font-mono text-[#d95f02] text-sm">07.</span>
            <h2>Indemnification</h2>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 text-sm text-slate-300">
            <p>
              You agree to defend, indemnify, and hold harmless Leopard Fish Intel, its operators, and contractors from and against any claims, liabilities, damages, judgments, awards, losses, costs, or legal fees resulting from your violation of these Terms or your misuse of the platform.
            </p>
          </div>
        </section>

        {/* Section 8: Modifications */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="font-mono text-[#d95f02] text-sm">08.</span>
            <h2>Modifications to Platform &amp; Terms</h2>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 text-sm text-slate-300">
            <p>
              We reserve the right to update, modify, or discontinue any aspect of the platform, financial models, or these Terms at any time without prior notice. Continued use of the platform following the posting of updated Terms constitutes your binding acceptance of those changes.
            </p>
          </div>
        </section>

        {/* Section 9: Governing Law & Jurisdiction */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="font-mono text-[#d95f02] text-sm">09.</span>
            <h2>Governing Law &amp; Jurisdiction</h2>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 text-sm text-slate-300">
            <p>
              These Terms and any dispute or claim arising out of or in connection with them shall be governed by and construed in accordance with the laws of England and Wales. You irrevocably agree that the courts of England and Wales shall have exclusive jurisdiction to settle any dispute or claim.
            </p>
          </div>
        </section>

        {/* Section 10: Contact Information */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="font-mono text-[#d95f02] text-sm">10.</span>
            <h2>Contact Information</h2>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2 text-sm text-slate-300">
            <p>For legal inquiries, terms clarification, or operational notices:</p>
            <div className="space-y-1 text-xs font-mono text-slate-400 pt-2">
              <p>• <strong>Email:</strong> <a href="mailto:roger@leopardfishintel.com" className="text-amber-400 underline hover:text-amber-300">roger@leopardfishintel.com</a></p>
              <p>• <strong>Legal Department:</strong> Leopard Fish Intel Legal &amp; Compliance</p>
            </div>
          </div>
        </section>

        {/* Bottom Navigation Link */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <Link href="/privacy" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
            <FileText className="size-3.5" />
            <span>Read our Privacy Policy &rarr;</span>
          </Link>
          <Link href="/methodology" className="text-slate-400 hover:text-white transition-colors">
            View Calculation Methodology &rarr;
          </Link>
        </div>

      </main>
    </div>
  );
}
