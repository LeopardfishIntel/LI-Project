'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Briefcase, Home, Banknote, CheckCircle2, 
  ChevronRight, ChevronDown, Scale, GraduationCap, AlertTriangle, Info,
  Maximize2, ExternalLink, ShieldCheck, Sparkles, Check, X
} from 'lucide-react';
import { getCoupleAdvisory, CoupleCountryAdvisory } from '@/lib/marital-advisories';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Props {
  country?: string;
  familyStatus?: string;
  partnerSalary?: string | number;
  currency?: string;
  onFocusPartnerSalary?: () => void;
  onUpdatePartnerSalary?: (value: string) => void;
  onUpdateFamilyStatus?: (value: string) => void;
  className?: string;
}

type TabType = 'unmarried' | 'trailingSpouse' | 'dualTeacher' | 'sameSex';

const FAMILY_OPTIONS = ['Couple', 'Family +1', 'Family +2', 'Family +3'];

export default function CoupleCountryAdvisoryPanel({
  country = '',
  familyStatus = 'Couple',
  partnerSalary = '0',
  currency = 'USD',
  onFocusPartnerSalary,
  onUpdatePartnerSalary,
  onUpdateFamilyStatus,
  className
}: Props) {
  const [activeFamilyStatus, setActiveFamilyStatus] = useState<string>(familyStatus);

  useEffect(() => {
    setActiveFamilyStatus(familyStatus);
  }, [familyStatus]);

  const hasDependents = activeFamilyStatus.includes('+1') || activeFamilyStatus.includes('+2') || activeFamilyStatus.includes('+3') || activeFamilyStatus.toLowerCase().includes('family');
  const isFamily3 = activeFamilyStatus.includes('+3') || activeFamilyStatus.toLowerCase().includes('3');

  const [activeTab, setActiveTab] = useState<TabType>('unmarried');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Local state for partner salary inside modal
  const [tempSalary, setTempSalary] = useState<string>(String(partnerSalary || '0'));

  useEffect(() => {
    setTempSalary(String(partnerSalary || '0'));
  }, [partnerSalary]);

  const advisory: CoupleCountryAdvisory = getCoupleAdvisory(country);
  const parsedPartnerSalary = typeof partnerSalary === 'number' ? partnerSalary : parseFloat(partnerSalary || '0');
  const hasPartnerIncome = !isNaN(parsedPartnerSalary) && parsedPartnerSalary > 0;

  const tabConfigs: { id: TabType; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: 'unmarried', label: 'Unmarried Couples', icon: <Users className="size-3.5" />, show: true },
    { id: 'trailingSpouse', label: 'Trailing Spouse', icon: <Briefcase className="size-3.5" />, show: true },
    { id: 'dualTeacher', label: 'Teaching Couples', icon: <Home className="size-3.5" />, show: true },
    { id: 'sameSex', label: 'LGBTQ+ Rights', icon: <Scale className="size-3.5" />, show: true },
  ];

  const handleFamilyStatusSelect = (newStatus: string) => {
    setActiveFamilyStatus(newStatus);
    if (onUpdateFamilyStatus) {
      onUpdateFamilyStatus(newStatus);
    }
  };

  const handleApplyModalSalary = () => {
    if (onUpdatePartnerSalary) {
      onUpdatePartnerSalary(tempSalary);
    }
    if (onFocusPartnerSalary) {
      onFocusPartnerSalary();
    }
  };

  const handleSalaryClick = () => {
    if (onFocusPartnerSalary) {
      onFocusPartnerSalary();
    }
  };

  return (
    <>
      {/* 🌟 SUMMARY CARD IN PAGE */}
      <div className={cn(
        "mt-3 p-3 bg-[#0b1224]/95 border border-[#d95f02]/30 rounded-md space-y-2.5 text-left animate-in fade-in slide-in-from-top-1 duration-200 shadow-lg relative overflow-hidden",
        className
      )}>
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#d95f02]/5 rounded-full blur-2xl pointer-events-none" />

        {/* 🏷️ TITLE & ACTION ROW */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="text-[11.5px] font-bold text-[#d95f02] truncate">
              Immigration & Family Policy in {advisory.country}
            </h4>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 hover:border-teal-500/40 px-3 py-1 rounded-sm cursor-pointer transition-all shadow-sm shrink-0 group"
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 group-hover:text-white transition-colors">
              Find out more
            </span>
          </button>
        </div>

        {/* 💡 INLINE PARTNER SALARY REMINDER / ENTRY POINT */}
        <div className={cn(
          "flex items-center justify-between px-2.5 py-1.5 rounded text-[10px] font-medium transition-all border",
          hasPartnerIncome
            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
            : "bg-teal-500/10 text-teal-300 border-teal-500/20 hover:bg-teal-500/15"
        )}>
          <div className="flex items-center gap-2 truncate">
            {hasPartnerIncome ? (
              <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
            ) : (
              <Banknote className="size-3.5 text-teal-400 shrink-0" />
            )}
            <span className="truncate">
              {hasPartnerIncome
                ? `Combined Household Mode Active (+${currency} ${parsedPartnerSalary.toLocaleString()}/mo)`
                : "Partner earning? Add partner salary."}
            </span>
          </div>

          {!hasPartnerIncome && onFocusPartnerSalary && (
            <button
              type="button"
              onClick={handleSalaryClick}
              className="inline-flex items-center gap-0.5 text-[9.5px] font-black text-teal-300 hover:text-white uppercase tracking-wider shrink-0 ml-2 bg-teal-500/20 hover:bg-teal-500/30 px-2 py-0.5 rounded transition-all"
            >
              Add Salary <ChevronRight className="size-3" />
            </button>
          )}

          {hasPartnerIncome && onFocusPartnerSalary && (
            <button
              type="button"
              onClick={handleSalaryClick}
              className="text-[9px] font-bold text-emerald-300/80 hover:text-emerald-200 underline uppercase tracking-wider shrink-0 ml-2"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* 🪟 POP-OUT MODAL DIALOG */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[94vw] max-w-2xl sm:max-w-2xl md:max-w-3xl flex flex-col bg-[#0b1224] border border-[#d95f02]/40 text-white shadow-2xl p-0 overflow-hidden sm:rounded-xl gap-0">
          {/* Modal Header with Integrated Family Selector Dropdown */}
          <div className="p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-[#0b1224] via-[#131d36] to-[#0b1224] space-y-2.5 w-full min-w-0 pr-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base sm:text-lg font-bold text-[#d95f02] truncate">
                  Immigration & Family Policy in {advisory.country}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 font-medium">
                  School hiring practices & spousal visa guidance ({advisory.region})
                </DialogDescription>
              </div>

              {/* Compact Family Size Dropdown */}
              <div className="flex items-center gap-1.5 bg-black/60 border border-white/15 hover:border-teal-500/50 rounded-md px-2.5 py-1 text-xs font-bold text-slate-200 shrink-0 transition-all">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">FAMILY SIZE:</span>
                <div className="relative inline-flex items-center">
                  <select
                    value={activeFamilyStatus}
                    onChange={(e) => handleFamilyStatusSelect(e.target.value)}
                    className="appearance-none bg-transparent text-teal-300 font-black text-xs focus:outline-none cursor-pointer uppercase pr-4"
                  >
                    {FAMILY_OPTIONS.map((status) => (
                      <option key={status} value={status} className="bg-[#0b1224] text-white font-bold">
                        {status}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="size-3 text-teal-300 absolute right-0 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Modal Badges Row */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {advisory.badges.map((badge, idx) => (
                <span
                  key={idx}
                  className="text-[9.5px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* 🔘 OFFSET / WRAPPING TABS (SOLE PRIMARY NAVIGATION ELEMENT) */}
          <div className="px-4 sm:px-5 py-2.5 bg-black/20 border-b border-white/10 w-full min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 w-full">
              {tabConfigs.filter(t => t.show).map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all rounded-md",
                      isActive
                        ? "bg-teal-500/20 text-teal-300 border border-teal-500/50 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-white/5"
                    )}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Tab Body Content */}
          <div className="p-4 sm:p-5 max-h-[50vh] overflow-y-auto space-y-4 text-slate-300 text-xs font-normal leading-relaxed w-full min-w-0 break-words">
            {activeTab === 'unmarried' && (
              <div className="space-y-3 w-full min-w-0">
                <div className="flex items-center gap-2 text-[#F8FAFC] font-bold text-sm">
                  <Users className="size-4 shrink-0 text-slate-400" />
                  <span>Unmarried Cohabitation & Visas in {advisory.country}</span>
                </div>

                {/* Structured Callout Card with Left-Border Accent */}
                <div className={cn(
                  "p-4 rounded-lg space-y-3 whitespace-normal break-words border border-white/10",
                  advisory.cohabitationStatus === 'illegal_strict'
                    ? "border-l-4 border-l-rose-500 bg-rose-500/[0.03]"
                    : advisory.cohabitationStatus === 'decriminalized_no_visa'
                    ? "border-l-4 border-l-amber-500 bg-amber-500/[0.03]"
                    : "border-l-4 border-l-teal-500 bg-teal-500/[0.03]"
                )}>
                  <p className="text-slate-200 leading-relaxed font-normal">
                    {advisory.guidance.unmarried}
                  </p>

                  <div className="pt-2.5 border-t border-white/10 space-y-2 text-[11.5px]">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                      <span className="font-bold text-slate-200 shrink-0 sm:min-w-[140px]">
                        • Sponsorship & Visas:
                      </span>
                      <span className="text-slate-300">
                        {advisory.cohabitationStatus === 'recognized_with_visas'
                          ? "Unmarried partners can qualify for dependent or partner residency (e.g., registered civil cohabitation or de facto documentation) without a formal marriage certificate."
                          : advisory.cohabitationStatus === 'decriminalized_no_visa'
                          ? "Cohabitation in private housing is legal, but dependent spousal visas require a recognized legal marriage certificate. Unmarried partners must hold independent employment visas."
                          : "An attested, apostilled marriage certificate is strictly required for spousal visa sponsorship. Unmarried partners cannot sponsor one another."}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                      <span className="font-bold text-slate-200 shrink-0 sm:min-w-[140px]">
                        • Housing Reality:
                      </span>
                      <span className="text-slate-300">
                        {advisory.cohabitationStatus === 'recognized_with_visas'
                          ? <span>Cohabitation is completely unrestricted across private rentals and school-provided accommodations. Landlords and schools do not require marriage certificates.</span>
                          : advisory.cohabitationStatus === 'decriminalized_no_visa'
                          ? <span>Unmarried couples can legally share private rental accommodations. For school-provided faculty housing, allocation policies vary by institution (some offer joint units, others separate single housing).</span>
                          : <span><strong className="text-white">School-Provided Housing</strong> strictly enforces marriage certificates for shared staff accommodation. In <strong className="text-white">Private Rentals</strong>, tenancy enforcement is strictly bound by local law.</span>}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                      <span className="font-bold text-slate-200 shrink-0 sm:min-w-[140px]">
                        • Contract Strategy:
                      </span>
                      <span className="text-slate-300">
                        {advisory.cohabitationStatus === 'recognized_with_visas'
                          ? "Teaching couples can either hold dual independent contracts or enter via partner sponsorship with full local residency and work authorization."
                          : advisory.cohabitationStatus === 'decriminalized_no_visa'
                          ? "Unmarried teaching partners should secure dual independent contracts with separate work visas/permits sponsored by the school."
                          : "Unmarried teaching partners should apply as two independent single candidates, securing separate contracts, individual work visas, and separate single housing."}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'trailingSpouse' && (
              <div className="space-y-3 w-full min-w-0">
                <div className="flex items-center gap-2 text-[#F8FAFC] font-bold text-sm">
                  <Briefcase className="size-4 shrink-0 text-slate-400" />
                  <span>Trailing Spouse Work Rights in {advisory.country}</span>
                </div>

                {/* Main Trailing Spouse Card */}
                <div className={cn(
                  "p-3.5 rounded-lg space-y-2 border border-white/10 whitespace-normal break-words",
                  advisory.trailingSpouseWork === 'prohibited_on_dependent_visa'
                    ? "border-l-4 border-l-rose-500 bg-rose-500/[0.03]"
                    : advisory.trailingSpouseWork === 'separate_work_visa_only' || advisory.trailingSpouseWork === 'loc_permit_required'
                    ? "border-l-4 border-l-amber-500 bg-amber-500/[0.03]"
                    : "border-l-4 border-l-emerald-500 bg-emerald-500/[0.03]"
                )}>
                  <p className="leading-relaxed text-slate-200">{advisory.guidance.trailingSpouse}</p>
                </div>

                {/* Female Teacher Sponsoring Male Spouse */}
                <div className={cn(
                  "p-3.5 rounded-lg space-y-1.5 whitespace-normal break-words border border-white/10",
                  advisory.femaleSponsoringMale === 'prohibited' || advisory.femaleSponsoringMale === 'restricted_difficult'
                    ? "border-l-4 border-l-rose-500 bg-rose-500/[0.03]"
                    : advisory.femaleSponsoringMale === 'salary_threshold'
                    ? "border-l-4 border-l-amber-500 bg-amber-500/[0.03]"
                    : "border-l-4 border-l-emerald-500 bg-emerald-500/[0.03]"
                )}>
                  <span className="text-[11.5px] font-bold text-[#F8FAFC]">
                    Female Teacher Sponsoring Male Spouse in {advisory.country}:
                  </span>
                  <p className="text-[11.5px] text-slate-300 leading-relaxed">
                    {advisory.guidance.femaleSponsor}
                  </p>
                </div>

                {/* Integrated Tuition Guidance for Family Profiles (Amber Accent) */}
                {hasDependents && (
                  <div className="p-3.5 bg-amber-500/[0.03] border border-white/10 border-l-4 border-l-amber-500 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-2 text-[#F8FAFC] font-semibold text-xs">
                      <GraduationCap className="size-4 text-amber-400 shrink-0" />
                      <span>{isFamily3 ? `Family +3 Tuition & Housing Allocation in ${advisory.country}` : `Dependent Child Tuition & Housing Terms in ${advisory.country}`}</span>
                    </div>
                    <p className="text-[11.5px] text-slate-300 leading-relaxed">
                      {isFamily3
                        ? `Tuition seats for a 3rd child are rarely 100% covered under standard international school contracts in ${advisory.country}. Additionally, provided staff housing is typically restricted to 2–3 bedroom configurations.`
                        : `International schools in ${advisory.country} typically provide tuition discounts or full coverage for 1–2 dependent children, subject to seat availability and capital levies.`}
                    </p>
                    <p className="text-[10.5px] text-amber-300/90 italic">
                      💡 Advisory Tip: Always verify whether capital levies, registration fees, and school bus transportation are included or charged as out-of-pocket expenses by schools in {advisory.country}.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'dualTeacher' && (
              <div className="space-y-3 w-full min-w-0">
                <div className="flex items-center gap-2 text-[#F8FAFC] font-bold text-sm">
                  <Home className="size-4 shrink-0 text-slate-400" />
                  <span>Teaching Couples Housing & Contract Packaging in {advisory.country}</span>
                </div>

                {/* Financial Advantage Card (Emerald Accent) */}
                <div className="p-3.5 bg-emerald-500/[0.03] border border-white/10 border-l-4 border-l-emerald-500 rounded-lg space-y-2.5 whitespace-normal break-words">
                  <p className="leading-relaxed text-slate-200">{advisory.guidance.dualTeacher}</p>
                  <div className="text-[11.5px] text-slate-300 border-t border-white/10 pt-2 whitespace-normal break-words">
                    <strong className="text-emerald-400">Financial Advantage in {advisory.country}: </strong>
                    Dual-income educator households in {advisory.country} international schools typically achieve 2× to 3× higher annual net savings rates by pooling accommodation allowances and double annual flight allocations.
                  </div>
                </div>

                {/* Integrated Tuition Guidance for Family Profiles (Amber Accent) */}
                {hasDependents && (
                  <div className="p-3.5 bg-amber-500/[0.03] border border-white/10 border-l-4 border-l-amber-500 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-2 text-[#F8FAFC] font-semibold text-xs">
                      <GraduationCap className="size-4 text-amber-400 shrink-0" />
                      <span>{isFamily3 ? `Family +3 Tuition & Housing Allocation in ${advisory.country}` : `Dependent Child Tuition & Housing Terms in ${advisory.country}`}</span>
                    </div>
                    <p className="text-[11.5px] text-slate-300 leading-relaxed">
                      {isFamily3
                        ? `Tuition seats for a 3rd child are rarely 100% covered under standard international school contracts in ${advisory.country}. Additionally, provided staff housing is typically restricted to 2–3 bedroom configurations.`
                        : `International schools in ${advisory.country} typically provide tuition discounts or full coverage for 1–2 dependent children, subject to seat availability and capital levies.`}
                    </p>
                    <p className="text-[10.5px] text-amber-300/90 italic">
                      💡 Advisory Tip: Always verify whether capital levies, registration fees, and school bus transportation are included or charged as out-of-pocket expenses by schools in {advisory.country}.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sameSex' && (
              <div className="space-y-3 w-full min-w-0">
                <div className="flex items-center gap-2 text-[#F8FAFC] font-bold text-sm">
                  <Scale className="size-4 shrink-0 text-slate-400" />
                  <span>LGBTQ+ Recognition & Legal Standing in {advisory.country}</span>
                </div>

                {/* Legal Standing Card */}
                <div className={cn(
                  "p-3.5 rounded-lg space-y-2 border border-white/10 whitespace-normal break-words",
                  advisory.sameSexRecognition === 'recognized'
                    ? "border-l-4 border-l-emerald-500 bg-emerald-500/[0.03]"
                    : advisory.sameSexRecognition === 'unrecognized_safe'
                    ? "border-l-4 border-l-amber-500 bg-amber-500/[0.03]"
                    : "border-l-4 border-l-rose-500 bg-rose-500/[0.03]"
                )}>
                  <p className="leading-relaxed text-slate-200">{advisory.guidance.sameSex}</p>
                </div>

                {/* Recruitment & Housing Practice Card */}
                <div className={cn(
                  "p-3.5 rounded-lg space-y-1.5 whitespace-normal break-words border border-white/10",
                  advisory.sameSexRecognition === 'recognized'
                    ? "border-l-4 border-l-emerald-500/80 bg-emerald-500/[0.02]"
                    : advisory.sameSexRecognition === 'unrecognized_safe'
                    ? "border-l-4 border-l-amber-500/80 bg-amber-500/[0.02]"
                    : "border-l-4 border-l-rose-500/80 bg-rose-500/[0.02]"
                )}>
                  <span className="text-[11.5px] font-bold text-[#F8FAFC]">
                    {advisory.sameSexRecognition === 'recognized'
                      ? `Legal Protection & Inclusivity in ${advisory.country}:`
                      : advisory.sameSexRecognition === 'unrecognized_safe'
                      ? `Recruitment & Visas in ${advisory.country}:`
                      : `Recruitment & Discretion in ${advisory.country}:`}
                  </span>
                  <p className="text-[11.5px] text-slate-300 leading-relaxed">
                    {advisory.sameSexRecognition === 'recognized'
                      ? `Same-sex marriage and registered partnerships enjoy full legal equality and statutory anti-discrimination protections in ${advisory.country}. International schools welcome LGBTQ+ educator couples openly with equal spousal benefits.`
                      : advisory.sameSexRecognition === 'unrecognized_safe'
                      ? `While same-sex relationships are socially safe and legal, host-nation immigration does not recognize same-sex marriages for dependent visas. Partners should secure independent employer-sponsored work permits.`
                      : `Host-nation laws do not recognize LGBTQ+ partnerships. International school recruitment agencies advise applying as two independent single candidates with separate work permits and practicing standard personal discretion.`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer: Interactive Partner Salary CTA */}
          <div className="p-3 sm:p-4 bg-black/60 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 w-full min-w-0">
            <div className="flex items-center gap-2.5 w-full sm:w-auto min-w-0">
              <div className={cn(
                "p-1.5 rounded-full shrink-0",
                hasPartnerIncome ? "bg-teal-500/20 text-teal-400" : "bg-teal-500/20 text-teal-400"
              )}>
                {hasPartnerIncome ? <CheckCircle2 className="size-4" /> : <Banknote className="size-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-slate-200 truncate">
                  {hasPartnerIncome ? "Joint Household Mode Active" : "Add partner monthly net salary to calculate your joint savings surplus."}
                </p>
                {hasPartnerIncome && (
                  <p className="text-[9.5px] sm:text-[10px] text-slate-400 truncate">
                    Current partner net: {currency} {parsedPartnerSalary.toLocaleString()}/mo
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
              {onUpdatePartnerSalary ? (
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Uneditable attached prefix label box */}
                  <div className="flex items-center rounded-md border border-white/20 bg-black/50 overflow-hidden focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500/50 shadow-inner flex-1 sm:flex-initial">
                    <span className="px-3 py-1.5 text-xs font-black text-slate-400 bg-white/5 border-r border-white/10 select-none shrink-0">
                      {currency}
                    </span>
                    <input
                      type="number"
                      placeholder="Partner Salary"
                      value={tempSalary === '0' ? '' : tempSalary}
                      onChange={(e) => setTempSalary(e.target.value)}
                      className="w-full sm:w-48 bg-transparent px-3 py-1.5 text-xs font-bold text-white focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleApplyModalSalary();
                      setIsModalOpen(false);
                    }}
                    className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-md text-xs font-black uppercase tracking-wider transition-all shrink-0 shadow-sm"
                  >
                    Apply
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    handleSalaryClick();
                  }}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-xs font-black uppercase tracking-wider transition-all inline-flex items-center gap-1 shrink-0"
                >
                  <span>{hasPartnerIncome ? "Edit Partner Salary" : "Add Partner Salary"}</span>
                  <ChevronRight className="size-3" />
                </button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

