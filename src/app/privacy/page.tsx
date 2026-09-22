import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { 
  ShieldCheck, 
  Lock, 
  EyeOff, 
  ArrowLeft, 
  FileText, 
  CheckCircle2, 
  Cookie, 
  Server, 
  ExternalLink, 
  Mail,
  UserCheck,
  Scale
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: "Privacy Policy | Leopard Fish Intel",
  description: "Learn about Leopard Fish Intel's strict privacy-first architecture, zero-tracker policy, essential session tokens, and compliance with UK/EU GDPR.",
  alternates: {
    canonical: "https://leopardfishintel.com/privacy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 selection:bg-[#d95f02]/30 selection:text-white pb-24">
      {/* Background radial glows */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-500/10 blur-[140px] rounded-full" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-[#007FFF]/10 blur-[160px] rounded-full" />
      </div>

      {/* Top Breadcrumb / Nav */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-4">
        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" asChild className="border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800 px-4 py-2 text-xs">
            <Link href="/">
              <ArrowLeft className="mr-2 size-3.5" /> Back to Home
            </Link>
          </Button>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            <ShieldCheck className="size-3.5" />
            <span>UK &amp; EU GDPR Compliant</span>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <header className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 border-b border-slate-800/80">
        <div className="flex items-start gap-4 mb-4">
          <div className="size-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <Lock className="size-7" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Privacy &amp; Data Protection</span>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase mt-1">
              Privacy Policy
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
        
        {/* Section 1: Introduction */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="font-mono text-emerald-400 text-sm">01.</span>
            <h2>Introduction &amp; Core Philosophy</h2>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3 text-slate-300 text-sm">
            <p>
              Leopard Fish Intel (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates an independent data aggregation and financial benchmarking platform for international educators. We are committed to a strict privacy-first architecture.
            </p>
            <p>
              We do not sell, rent, trade, or monetize candidate data. We do not run advertising networks, drop third-party tracking pixels (such as Facebook Pixel or LinkedIn Insight Tags), or serve targeted commercial advertisements. This Privacy Policy details how we handle user data, local browser storage, and essential technical session tokens in compliance with UK GDPR, EU GDPR, and the UK Data Protection Act 2018.
            </p>
          </div>
        </section>

        {/* Section 2: Information We Collect */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="font-mono text-emerald-400 text-sm">02.</span>
            <h2>Information We Collect</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <EyeOff className="size-4" />
                <h3>A. Guests (Public Browsing)</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                If you browse school profiles, use the Financial Forecaster, or run comparisons without creating an account, we collect <strong>zero personally identifiable information (PII)</strong>. You remain completely anonymous.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <UserCheck className="size-4" />
                <h3>B. Registered Accounts</h3>
              </div>
              <div className="text-xs text-slate-300 leading-relaxed space-y-1.5">
                <p>When you voluntarily register an account to access protected features, save custom profile settings, or store comparison history, we collect and store:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                  <li>Your email address</li>
                  <li>Your unique authentication user ID (via Firebase Auth)</li>
                  <li>Your selected UI preferences (currency, household status)</li>
                </ul>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Scale className="size-4" />
                <h3>C. Peer Submissions</h3>
              </div>
              <div className="text-xs text-slate-300 leading-relaxed space-y-1.5">
                <p>If you contribute package benchmarks, contract data, or workplace insights to our data models:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                  <li>Entries are automatically stripped of personal identifiers, names, and contact details.</li>
                  <li>Submitted data is aggregated into regional statistical models so individual contributors cannot be re-identified.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Cookies & Local Storage */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="font-mono text-emerald-400 text-sm">03.</span>
            <h2>Cookies &amp; Local Browser Storage</h2>
          </div>
          
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-5 text-sm text-slate-300">
            <p>
              Under UK PECR and UK/EU GDPR, &quot;Strictly Necessary&quot; technical storage essential for providing a service explicitly requested by the user is exempt from prior consent banners. We maintain a minimal, privacy-focused storage footprint:
            </p>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Cookie className="size-4" />
                First-Party Essential Technical Cookies
              </h4>
              <ul className="space-y-2 text-xs">
                <li className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <strong className="text-white font-mono">__session (Strictly Necessary):</strong> A first-party technical session cookie used exclusively by Firebase Authentication to keep logged-in teachers authenticated while navigating protected account routes (<code className="text-amber-400">/dashboard</code>, <code className="text-amber-400">/profile</code>, <code className="text-amber-400">/admin</code>). It contains no third-party tracking payload and is not set for guest users browsing public tools.
                </li>
                <li className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <strong className="text-white font-mono">sidebar_state (UI Functional):</strong> A first-party technical cookie used solely to remember whether you collapsed or expanded the navigation sidebar, preventing layout flicker upon page load.
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Server className="size-4" />
                Client-Side Local Storage (localStorage)
              </h4>
              <p className="text-xs text-slate-400">
                We use client-side <code className="text-slate-300 font-mono">localStorage</code> to preserve interactive calculator states and compliance acknowledgments directly on your device. This data remains local to your browser and is not sent over HTTP headers to external ad networks:
              </p>
              <ul className="space-y-2 text-xs">
                <li className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <strong className="text-white font-mono">lfi_compliance_disclaimer_v1:</strong> Remembers your acknowledgment of our legal financial modeling terms so you do not have to accept the modal repeatedly.
                </li>
                <li className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <strong className="text-white font-mono">lf_net_v15 &amp; lf_fam_v15:</strong> Stores your financial forecaster slider positions, currency selections (GBP/USD/EUR), and household configurations locally so your calculations persist between page reloads.
                </li>
              </ul>
            </div>

            <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl space-y-1 text-xs">
              <h4 className="font-bold text-emerald-300 uppercase tracking-wider">Cookieless Analytics Architecture</h4>
              <p className="text-slate-300">
                We use privacy-first, cookieless telemetry to measure aggregated site usage (such as pageview counts and popular school searches). Our analytics pipeline operates without setting persistent tracking cookies, collecting IP addresses, or profiling users across external websites.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: How We Use Information */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="font-mono text-emerald-400 text-sm">04.</span>
            <h2>How We Use Information</h2>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 text-sm text-slate-300">
            <p className="mb-3">We use the limited data we collect strictly to:</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <li className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Authenticate user accounts and secure protected application routes.</span>
              </li>
              <li className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Persist your financial calculator settings and comparison preferences locally.</span>
              </li>
              <li className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Aggregate anonymized regional compensation trends to improve benchmark accuracy.</span>
              </li>
              <li className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Maintain site security, prevent abuse, and enforce our Terms of Service.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Section 5: Third-Party Deep Links */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="font-mono text-emerald-400 text-sm">05.</span>
            <h2>Third-Party Deep Links &amp; Outbound Direct Engines</h2>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3 text-sm text-slate-300">
            <p>
              Our platform indexes job vacancies and deep-links directly to official school career portals, host ATS platforms (e.g., TES, GEMS, Cognita), and public PDF specifications.
            </p>
            <p className="text-xs text-slate-400">
              When you click an outbound link (marked with ↗), you leave Leopard Fish Intel. We do not pass personal tracking parameters or candidate data to these external sites. Your interaction on external career portals is governed entirely by the privacy policies and terms of those respective institutions.
            </p>
          </div>
        </section>

        {/* Section 6: Data Security */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="font-mono text-emerald-400 text-sm">06.</span>
            <h2>Data Security &amp; Storage Infrastructure</h2>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 text-sm text-slate-300">
            <p>
              Your account data is secured using industry-standard encryption protocols in transit (TLS 1.3) and at rest. Account authentication infrastructure is managed via Firebase Authentication (Google Cloud Platform), hosted within secure enterprise data centers adhering to SOC 2 and ISO 27001 compliance standards.
            </p>
          </div>
        </section>

        {/* Section 7: Your Data Rights */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="font-mono text-emerald-400 text-sm">07.</span>
            <h2>Your Data Rights</h2>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4 text-sm text-slate-300">
            <p>Under UK and EU data protection laws, you hold full rights regarding your personal data:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <h4 className="font-bold text-white mb-1">Right to Access</h4>
                <p className="text-slate-400">You may request a copy of the personal data associated with your account.</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <h4 className="font-bold text-white mb-1">Right to Erasure</h4>
                <p className="text-slate-400">You may request the permanent deletion of your account and associated email records at any time.</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <h4 className="font-bold text-white mb-1">Right to Rectification</h4>
                <p className="text-slate-400">You may update or correct your account preferences directly within your profile settings.</p>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              To exercise any of these rights, submit a request to <a href="mailto:roger@leopardfishintel.com" className="text-emerald-400 underline hover:text-emerald-300">roger@leopardfishintel.com</a>.
            </p>
          </div>
        </section>

        {/* Section 8: Contact Information */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="font-mono text-emerald-400 text-sm">08.</span>
            <h2>Contact Information</h2>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2 text-sm text-slate-300">
            <p>For privacy-related inquiries, data requests, or compliance questions:</p>
            <div className="space-y-1 text-xs font-mono text-slate-400 pt-2">
              <p>• <strong>Email:</strong> <a href="mailto:roger@leopardfishintel.com" className="text-emerald-400 underline hover:text-emerald-300">roger@leopardfishintel.com</a></p>
              <p>• <strong>Data Controller:</strong> Leopard Fish Intel Compliance Office</p>
            </div>
          </div>
        </section>

        {/* Bottom Navigation Link */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <Link href="/terms" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
            <FileText className="size-3.5" />
            <span>Read our Terms of Service &rarr;</span>
          </Link>
          <Link href="/methodology" className="text-slate-400 hover:text-white transition-colors">
            View Calculation Methodology &rarr;
          </Link>
        </div>

      </main>
    </div>
  );
}
