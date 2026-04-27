"use client";

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Printer, ShieldAlert, CheckCircle2, 
  FileText, Home, Wallet, Car, AlertTriangle, Zap, Coins
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { Binoculars } from '@/components/icons/Binoculars';

function ReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const data = {
    reserve: parseFloat(searchParams.get('reserve') || '0'),
    currency: searchParams.get('currency') || 'GBP',
    country: searchParams.get('country') || 'Your Destination',
    school: searchParams.get('school') || '',
    days: searchParams.get('days') || '45',
    status: searchParams.get('status') || 'single',
    docs: parseFloat(searchParams.get('docs') || '0'),
    rent: parseFloat(searchParams.get('rent') || '0'),
    living: parseFloat(searchParams.get('living') || '0'),
    transport: parseFloat(searchParams.get('transport') || '0'),
    commitments: parseFloat(searchParams.get('commitments') || '0'),
  };

  const handlePrint = () => typeof window !== 'undefined' && window.print();

  return (
    <div className="min-h-screen bg-white text-black p-4 md:p-12 print:p-0 font-sans selection:bg-[#f97316]/20">
      
      {/* Navigation Controls */}
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-12 print:hidden">
        <Button variant="outline" onClick={() => router.back()} className="border-black/20 text-black px-6 hover:bg-black hover:text-white transition-all">
          <ArrowLeft className="mr-2 size-4" /> Return to Calculator
        </Button>
        <Button onClick={handlePrint} className="bg-black text-white font-bold px-8 hover:bg-[#f97316] transition-all">
          <Printer className="mr-2 size-4" /> Print dossier
        </Button>
      </div>

      <div className="max-w-4xl mx-auto border-[4px] border-black p-8 md:p-16 space-y-12 relative bg-white shadow-2xl print:shadow-none print:border-none print:p-4">
        <Binoculars className="absolute top-0 right-0 size-64 opacity-5 rotate-[15deg] pointer-events-none p-6" />
        
        {/* Header */}
        <header className="border-b-[6px] border-black pb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-black text-white p-3">
              <ShieldAlert className="size-10" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">Field Manual</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mt-1">Arrival & Setup Protocol: {data.country}</p>
            </div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 mt-6">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="size-4 text-amber-600" />
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Tactical Warning</p>
            </div>
            <p className="text-xs font-bold text-gray-700 leading-relaxed italic">
              These figures are regional estimates. School-specific benefits such as hotel stays, flight caps, or housing stipends can significantly shift your actual reserve requirements. Use the verification checklist below to finalize your budget.
            </p>
          </div>
        </header>

        {/* Budget Breakdown Section */}
        <section className="space-y-8">
          <div className="flex justify-between items-end border-b-4 border-black pb-4">
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Total Setup Reserve</h2>
              <p className="text-6xl font-black tracking-tighter italic">{formatCurrency(data.reserve, data.currency)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest leading-none">Projected Gap</p>
              <p className="text-2xl font-black italic">{data.days} Days</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase border-b-2 border-black pb-1 flex items-center gap-2">
                <Zap className="size-4 text-[#f97316]" /> Estimated Outgoings
              </h3>
              <div className="space-y-2">
                <BudgetRow label="Visas & Documentation" value={data.docs} currency={data.currency} icon={FileText} />
                <BudgetRow label="Rent & Deposit (Est.)" value={data.rent} currency={data.currency} icon={Home} />
                <BudgetRow label={`Living Expenses (${data.days} days)`} value={data.living} currency={data.currency} icon={Wallet} />
                <BudgetRow label="Transport Setup" value={data.transport} currency={data.currency} icon={Car} />
                {data.commitments > 0 && (
                  <BudgetRow label="Monthly Commitments" value={data.commitments} currency={data.currency} icon={Coins} />
                )}
              </div>
            </div>
            <div className="bg-gray-50 p-6 border-l-4 border-black space-y-4">
               <h3 className="text-sm font-black uppercase flex items-center gap-2">
                <CheckCircle2 className="size-4" /> Profile Context
               </h3>
               <div className="space-y-3">
                 <div>
                   <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">School</p>
                   <p className="text-sm font-black italic">{data.school || 'Not specified'}</p>
                 </div>
                 <div>
                   <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Household</p>
                   <p className="text-sm font-black italic uppercase">{data.status.replace('-', ' ')}</p>
                 </div>
               </div>
            </div>
          </div>
        </section>

        {/* Tactical Verification Checklist */}
        <section className="space-y-6 pt-8 border-t-2 border-gray-100">
            <h2 className="text-xl font-black uppercase tracking-tight border-b-[4px] border-black pb-2">Tactical Verification Checklist</h2>
            <p className="text-xs font-bold text-gray-500 italic">Verify these specific contract points with your HR department before departure.</p>
            
            <div className="grid gap-4">
               {[
                  { title: "Hotel Accommodation Allowance", desc: "Does the school provide a hotel for the first 7-14 days? If not, increase your Rent/Living reserve." },
                  { title: "Shipping Caps & Timing", desc: "Is there a shipping allowance? Does it pay out on arrival or only after receipts are submitted?" },
                  { title: "Flight Reimbursement", desc: "Are flights paid upfront by the school or reimbursed? Reimbursed flights require thousands in extra cash." },
                  { title: "Bank Account Lead Times", desc: "How long does it take to get a local bank account? You may need physical cash for the first 30 days." },
                  { title: "Utility Deposits", desc: "Check if electricity and water require large security deposits for foreign residents." }
               ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 border border-black/5 rounded-sm hover:bg-gray-50 transition-colors group">
                    <div className="mt-1 size-6 border-2 border-black rounded-sm bg-white shrink-0 group-hover:bg-black transition-colors"></div>
                    <div className="space-y-1">
                      <p className="text-sm font-black uppercase tracking-tight leading-tight">{item.title}</p>
                      <p className="text-xs font-bold text-gray-500 italic leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
               ))}
            </div>
        </section>

        <footer className="mt-16 pt-8 border-t-2 border-gray-200 flex flex-col md:flex-row justify-between items-center gap-6 opacity-60">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-8" />
              <p className="text-[10px] font-black uppercase tracking-widest">Leopardfish Certified Tactical Protocol</p>
            </div>
            <p className="text-[9px] font-bold italic">Generated on {new Date().toLocaleDateString()}</p>
        </footer>
      </div>
      
      {/* Print Background Styling */}
      <div className="fixed inset-0 -z-10 bg-[#080c18] print:hidden"></div>
    </div>
  );
}

function BudgetRow({ label, value, currency, icon: Icon }: { label: string, value: number, currency: string, icon: any }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100">
      <div className="flex items-center gap-2">
        <Icon className="size-3 text-gray-400" />
        <span className="text-[11px] font-bold uppercase text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-black tabular-nums">{formatCurrency(value, currency)}</span>
    </div>
  );
}

export default function PrepareReportPage() {
  return <Suspense fallback={null}><ReportContent /></Suspense>;
}
