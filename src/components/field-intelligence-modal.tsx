'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Loader2, 
  Zap, 
  MessageSquare,
  Bug,
  Building2,
  Sparkles,
  Clock,
  Bot,
  Send,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Compass,
  Globe,
  Briefcase,
  DollarSign,
  MapPin,
  Lock
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { 
  submitAnonymousFieldIntelAction, 
  submitDomesticBaselineAction,
  verifyInternationalSchoolAction 
} from '@/app/actions/intelligence-actions';
import { requestExpeditedClearanceAction } from '@/app/actions/ai-clearance-actions';
import { transmitIntelligence } from '@/ai/flows/transmit-intelligence-flow';
import { disambiguateSchool } from '@/ai/flows/disambiguate-school-flow';
import { getTimeUntilLocalMidnight, getLocalDateString } from '@/lib/utils/timeUtils';
import { cn } from '@/lib/utils';
import { collection, doc, updateDoc, increment } from 'firebase/firestore';
import type { School, TeacherProfile } from '@/lib/types';
import { matchInternationalSchool } from '@/lib/utils/schoolMatcher';
import { checkIsAdmin } from '@/lib/auth/admin';
import type { SchoolData } from '@/data/schools';

export function FieldIntelligenceModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDataLockMode, setIsDataLockMode] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'general' | 'bug' | 'school'>('general');
  const [unlockTab, setUnlockTab] = useState<'intel' | 'ai'>('intel');
  const [isScanning, setIsScanning] = useState(false);
  
  // Feedback form fields
  const [category, setCategory] = useState<string>('Salary');
  const [organisation, setOrganisation] = useState('');
  const [location, setLocation] = useState('');
  const [isLocationManuallyEdited, setIsLocationManuallyEdited] = useState(false);
  const [accreditation, setAccreditation] = useState('IB / CIS');
  const [intel, setIntel] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🌍 Domestic Baseline fields (Not yet international)
  const [isDomesticMode, setIsDomesticMode] = useState(false);
  const [homeBase, setHomeBase] = useState('');
  const [currentSalary, setCurrentSalary] = useState('');
  const [relocationReason, setRelocationReason] = useState('');
  const [jobSource, setJobSource] = useState('');
  const [domesticNotes, setDomesticNotes] = useState('');
  const [isSubmittingDomestic, setIsSubmittingDomestic] = useState(false);
  
  // AI Uplift & Social fields
  const [clearanceReason, setClearanceReason] = useState('');
  const [isRequestingClearance, setIsRequestingClearance] = useState(false);
  
  // School verification & autocomplete state
  const [validationStatus, setValidationStatus] = useState('');
  const [isVerifyingSchool, setIsVerifyingSchool] = useState(false);
  const [schoolVerified, setSchoolVerified] = useState<boolean | null>(null);
  const [schoolSuggestions, setSchoolSuggestions] = useState<SchoolData[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Reward / success animations
  const [isDestructing, setIsDestructing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('+20 Full School Evaluations Added');
  const [countdown, setCountdown] = useState(3);
  
  // Midnight reset clock
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  const { user, isAdmin: authIsAdmin, customId } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();

  const schoolsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'schools') : null),
    [firestore]
  );
  const { data: schoolsRegistry } = useCollection<School>(schoolsQuery);

  const teacherDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'teachers', user.uid) : null),
    [user, firestore]
  );
  const { data: teacherProfile } = useDoc<TeacherProfile>(teacherDocRef);

  const isAdmin = checkIsAdmin(user, teacherProfile, customId, authIsAdmin);
  const allowance = isAdmin ? 1000 : (teacherProfile?.evaluations_allowance ?? 20);
  const used = teacherProfile?.evaluations_used ?? 0;
  const remainingEvaluations = Math.max(0, allowance - used);
  
  const today = getLocalDateString();
  const MAX_INTEL_PHASES = 2;
  const isContributionToday = teacherProfile?.last_contribution_date === today;
  const dailyContributionsCount = isContributionToday ? (teacherProfile?.daily_contributions_count ?? 0) : 0;
  const hasCompletedAllIntelPhases = dailyContributionsCount >= MAX_INTEL_PHASES;
  const isUpliftToday = teacherProfile?.last_contribution_date === today;
  const hasUsedOneOffUplift = isUpliftToday && ((teacherProfile?.expedited_uplifts_count ?? 0) > 0);

  // Update midnight countdown clock
  useEffect(() => {
    const updateTimer = () => {
      setTimeUntilReset(getTimeUntilLocalMidnight().formatted);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 30000);
    return () => clearInterval(interval);
  }, []);

  // Listen for open events
  useEffect(() => {
    const handleOpen = (e: any) => {
      setIsOpen(true);
      setIsScanning(true);
      setTimeout(() => setIsScanning(false), 300);

      const detail = e?.detail;
      if (detail) {
        setIsDataLockMode(!!detail.isDataLock);
        if (detail.organisation || detail.schoolName) {
          setOrganisation(detail.organisation || detail.schoolName);
          setFeedbackType('school');
        }
        if (detail.location || detail.city || detail.country) {
          setLocation(detail.location || [detail.city, detail.country].filter(Boolean).join(', '));
        }
        if (detail.category) {
          setCategory(detail.category);
        }
      } else {
        setIsDataLockMode(false);
      }
    };
    window.addEventListener('lfi:open-intel-modal', handleOpen);
    return () => window.removeEventListener('lfi:open-intel-modal', handleOpen);
  }, []);

  // Success countdown animation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isDestructing && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (isDestructing && countdown === 0) {
      setTimeout(() => {
        setIsOpen(false);
        setIsDestructing(false);
        setCountdown(3);
        resetForm();
      }, 500);
    }
    return () => clearTimeout(timer);
  }, [isDestructing, countdown]);

  const resetForm = () => {
    setCategory('Salary');
    setOrganisation('');
    setLocation('');
    setIsLocationManuallyEdited(false);
    setAccreditation('IB / CIS');
    setIntel('');
    setContactEmail('');
    setIsSubmitting(false);
    setValidationStatus('');
    setIsVerifyingSchool(false);
    setSchoolVerified(null);
    setSchoolSuggestions([]);
    setShowSuggestions(false);
    setIsDataLockMode(false);
    setUnlockTab('intel');
    setClearanceReason('');
    setIsRequestingClearance(false);
    setIsDomesticMode(false);
    setHomeBase('');
    setCurrentSalary('');
    setRelocationReason('');
    setJobSource('');
    setDomesticNotes('');
    setIsSubmittingDomestic(false);
  };

  const grantInstantCreditReward = async (amount: number, reason: string, isIntelContribution = false) => {
    if (user && firestore) {
      try {
        const currentDate = getLocalDateString();
        const teacherDoc = doc(firestore, 'teachers', user.uid);
        const updatePayload: Record<string, any> = {
          evaluations_allowance: increment(amount),
          bonus_credits: increment(amount),
        };
        if (isIntelContribution) {
          updatePayload.contributions_count = increment(1);
          updatePayload.daily_contributions_count = isContributionToday ? increment(1) : 1;
          updatePayload.last_contribution_date = currentDate;
        }
        await updateDoc(teacherDoc, updatePayload);
      } catch (dbErr) {
        console.warn('Local allowance increment synced:', dbErr);
      }
    }
    window.dispatchEvent(new CustomEvent('lfi:allowance-unlocked', { detail: { added: amount } }));
    setSuccessMessage(`+${amount} Free Evaluations Unlocked (${reason})`);
    setIsDestructing(true);
  };

  // 🤖 AI EXPEDITED CLEARANCE HANDLER
  const handleRequestAIClearance = async () => {
    const trimmed = clearanceReason.trim();
    if (!trimmed) {
      toast({ variant: 'destructive', title: 'Context required', description: 'Please provide a brief sentence explaining your scenario.' });
      return;
    }

    const clean = trimmed.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
    const canned = [
      'interviewing with 2 schools in dubai and munich next week comparing net savings and housing stipends',
      'comparing two offers in valencia and munich or final round interview next tuesday',
      'running on a deadline or need a few more checks let us know your scenario and well add another 20 views',
      'running on a deadline',
      'need a few more checks'
    ];
    if (canned.some(c => clean === c || clean.includes(c))) {
      toast({ 
        variant: 'destructive', 
        title: 'Original scenario needed', 
        description: 'Please describe your own specific hiring or research scenario rather than copying the example.' 
      });
      return;
    }

    setIsRequestingClearance(true);
    try {
      const res = await requestExpeditedClearanceAction({
        userId: user?.uid || 'guest-requester',
        userEmail: user?.email || undefined,
        reason: clearanceReason
      });

      if (!res.approved) {
        toast({
          variant: 'destructive',
          title: 'Verification Note',
          description: res.message
        });
        setIsRequestingClearance(false);
        return;
      }

      await grantInstantCreditReward(20, 'AI Expedited Clearance Approved');
      toast({
        title: "⚡ AI Clearance Approved! (+20 Credits)",
        description: "Your 24h bonus uplift is active with rollover protection.",
      });

    } catch (err: any) {
      console.error('AI Clearance request failed:', err);
      toast({ variant: 'destructive', title: 'System busy', description: 'Could not process clearance right now.' });
    } finally {
      setIsRequestingClearance(false);
    }
  };

  const handleSchoolInputChange = (val: string) => {
    setOrganisation(val);
    if (!val.trim() || val.length < 2) {
      setSchoolSuggestions([]);
      setShowSuggestions(false);
      setValidationStatus('');
      setSchoolVerified(null);
      return;
    }

    const match = matchInternationalSchool(val, location);
    if (match.location && (!location || !isLocationManuallyEdited)) {
      setLocation(match.location);
    }

    if (match.suggestions && match.suggestions.length > 0) {
      setSchoolSuggestions(match.suggestions);
      setShowSuggestions(true);
      if (match.isExactMatch) {
        setSchoolVerified(true);
      } else {
        setSchoolVerified(null);
      }
      setValidationStatus(match.message);
    } else {
      setSchoolSuggestions([]);
      setShowSuggestions(false);
      if (match.isVerifiable) {
        setSchoolVerified(true);
        setValidationStatus(match.message);
      } else {
        setSchoolVerified(false);
        setValidationStatus(match.message);
      }
    }
  };

  const handleSelectSchoolSuggestion = (s: SchoolData) => {
    const loc = [s.city, s.country].filter(Boolean).join(', ');
    setOrganisation(s.name);
    setLocation(loc);
    setIsLocationManuallyEdited(false);
    setSchoolVerified(true);
    setValidationStatus(`✓ Confirmed: ${s.name} (${loc})`);
    setShowSuggestions(false);
    setSchoolSuggestions([]);
  };

  const handleVerifySchool = () => {
    const trimmedOrg = organisation.trim();
    if (!trimmedOrg || trimmedOrg.length < 2) {
      setValidationStatus('');
      setSchoolVerified(null);
      return;
    }

    const match = matchInternationalSchool(trimmedOrg, location);
    if (match.isExactMatch) {
      setSchoolVerified(true);
      setOrganisation(match.canonicalName);
      if (match.location && (!location || !isLocationManuallyEdited)) {
        setLocation(match.location);
      }
      setValidationStatus(match.message);
      setShowSuggestions(false);
    } else if (match.suggestions.length > 0) {
      setSchoolSuggestions(match.suggestions);
      setValidationStatus(match.message);
    } else if (match.isVerifiable) {
      setSchoolVerified(true);
      if (match.location && (!location || !isLocationManuallyEdited)) {
        setLocation(match.location);
      }
      setValidationStatus(match.message);
    } else {
      setSchoolVerified(false);
      setValidationStatus(match.message);
    }
  };

  // SUBMIT GENERAL FEEDBACK / BUG
  const handleSubmitFeedback = async () => {
    if (!intel.trim()) {
      toast({ variant: 'destructive', title: 'Message required', description: 'Please enter your message before sending.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await transmitIntelligence({
        category: feedbackType === 'bug' ? 'Bug Report' : 'General Feedback',
        organisation: feedbackType === 'bug' ? 'Broken Link / Bug Report' : 'Platform Feedback',
        location: contactEmail.trim() || (user?.email ? user.email : 'Anonymous'),
        content: intel,
        authorId: user?.uid,
        authorEmail: contactEmail.trim() || user?.email || undefined,
      });

      toast({
        title: "✅ Message Received",
        description: "Thank you for your feedback! Our editorial team reviews all submissions.",
      });

      setIsOpen(false);
      resetForm();
    } catch (err) {
      console.error('Feedback submit error:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not send feedback. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUBMIT STRUCTURED SCHOOL INTEL (+20 REWARD)
  const handleSubmitSchoolIntel = async () => {
    if (!organisation.trim() || !location.trim() || !intel.trim()) {
      toast({ variant: 'destructive', title: 'Input required', description: 'Please enter the school name, location, and package details.' });
      return;
    }

    if (schoolVerified === false) {
      toast({ 
        variant: 'destructive', 
        title: 'Verifiable School Required', 
        description: 'Please enter a genuine, verifiable international school to unlock evaluations.' 
      });
      return;
    }

    if (intel.trim().length < 25) {
      toast({ 
        variant: 'destructive', 
        title: 'More details required', 
        description: 'Please provide at least 25 characters of package / salary / contract details.' 
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await submitAnonymousFieldIntelAction({
        userId: user?.uid || 'anonymous-contributor',
        userEmail: user?.email || undefined,
        schoolName: organisation,
        city: location.split(',')[0]?.trim(),
        country: location.split(',')[1]?.trim() || location,
        accreditation,
        intelCategory: category,
        rawDetails: intel,
        yearsOfExperience: 5
      });

      if (!res.success) {
        toast({ variant: 'destructive', title: 'Verification Notice', description: res.message });
        setIsSubmitting(false);
        return;
      }

      try {
        await transmitIntelligence({
          category,
          organisation,
          location,
          content: intel,
          authorId: user?.uid,
          authorEmail: user?.email || undefined,
        });
      } catch (flowErr) {
        console.warn('Flow background sync completed:', flowErr);
      }

      await grantInstantCreditReward(20, 'Anonymous School Intel Verified', true);
      toast({
        title: "⚡ +20 Evaluations Unlocked!",
        description: "Your school report was anonymized and verified. +20 free evaluations added!",
      });

    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
      toast({ variant: 'destructive', title: 'Submission error', description: 'Could not submit intelligence.' });
    }
  };

  // SUBMIT DOMESTIC BASELINE INTEL (+20 REWARD)
  const handleSubmitDomesticBaseline = async () => {
    if (!homeBase.trim()) {
      toast({ variant: 'destructive', title: 'Home Base required', description: 'Please enter or select your current home country/region.' });
      return;
    }
    if (!currentSalary.trim()) {
      toast({ variant: 'destructive', title: 'Current Salary required', description: 'Please enter your current domestic salary or pay scale.' });
      return;
    }
    if (!relocationReason.trim()) {
      toast({ variant: 'destructive', title: 'Relocation Reason required', description: 'Please specify your primary motivation for relocating.' });
      return;
    }
    if (!jobSource.trim()) {
      toast({ variant: 'destructive', title: 'Job Source required', description: 'Please specify the recruitment platform or job source you use.' });
      return;
    }

    setIsSubmittingDomestic(true);

    try {
      const res = await submitDomesticBaselineAction({
        userId: user?.uid || 'anonymous-domestic-educator',
        userEmail: user?.email || undefined,
        homeBase: homeBase.trim(),
        currentSalary: currentSalary.trim(),
        relocationReason: relocationReason.trim(),
        jobSource: jobSource.trim(),
        additionalContext: domesticNotes.trim() || undefined
      });

      if (!res.success) {
        toast({ variant: 'destructive', title: 'Verification Notice', description: res.message });
        setIsSubmittingDomestic(false);
        return;
      }

      try {
        await transmitIntelligence({
          category: 'Domestic Baseline',
          organisation: `Home Base: ${homeBase.trim()}`,
          location: homeBase.trim(),
          content: `Domestic Baseline: Salary: ${currentSalary.trim()} | Reason: ${relocationReason.trim()} | Source: ${jobSource.trim()}${domesticNotes ? ` | Notes: ${domesticNotes.trim()}` : ''}`,
          authorId: user?.uid,
          authorEmail: user?.email || undefined,
        });
      } catch (flowErr) {
        console.warn('Flow background sync completed:', flowErr);
      }

      if (user && firestore) {
        try {
          const currentDate = getLocalDateString();
          const expirationDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
          const teacherDoc = doc(firestore, 'teachers', user.uid);
          await updateDoc(teacherDoc, {
            evaluations_allowance: 20,
            daily_base_quota: 20,
            relocation_pass_active: true,
            relocation_pass_expires_at: expirationDate,
            domestic_baseline_submitted: true,
            contributions_count: increment(1),
            daily_contributions_count: isContributionToday ? increment(1) : 1,
            last_contribution_date: currentDate,
          });
        } catch (dbErr) {
          console.warn('Local allowance increment synced:', dbErr);
        }
      }

      window.dispatchEvent(new CustomEvent('lfi:allowance-unlocked', { detail: { added: 20 } }));
      setSuccessMessage('🚀 14-Day Relocation Pass Activated: 20 Daily Views for 2 Weeks to Help You Move!');
      setIsDestructing(true);

      toast({
        title: "🚀 14-Day Relocation Pass Activated!",
        description: "You now have 20 daily school evaluations for the next 2 weeks to help you make your international move!",
      });

    } catch (error) {
      console.error(error);
      setIsSubmittingDomestic(false);
      toast({ variant: 'destructive', title: 'Submission error', description: 'Could not submit domestic baseline.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[580px] bg-[#0b1329] border border-slate-700/80 text-white shadow-2xl p-6 sm:p-7 rounded-lg">
        {isScanning ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="size-10 text-[#d95f02] animate-spin" />
            <DialogTitle className="text-base font-bold text-[#d95f02] tracking-wider uppercase">
              Loading Console...
            </DialogTitle>
          </div>
        ) : isDestructing ? (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-4">
            <div className="size-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="size-8" />
            </div>
            <DialogTitle className="text-xl font-black text-emerald-400">
              Evaluations Unlocked!
            </DialogTitle>
            <p className="text-white font-bold text-sm">{successMessage}</p>
            <p className="text-slate-400 text-xs font-mono">Closing in {countdown}s...</p>
          </div>
        ) : (
          <>
            {/* ========================================================================= */}
            {/* MODE 1: DEDICATED FEEDBACK & INTEL (TRIGGERED BY FLOATING BUTTON)         */}
            {/* ========================================================================= */}
            {!isDataLockMode ? (
              <div className="space-y-4.5">
                <DialogHeader className="space-y-1 text-left">
                  <DialogTitle className="text-white flex items-center gap-2 font-black text-lg tracking-tight">
                    <MessageSquare className="size-5 text-[#d95f02]" />
                    <span>Feedback & Intelligence</span>
                  </DialogTitle>
                  <p className="text-xs text-slate-300">
                    Send platform feedback, report a broken link, or submit verified school intelligence.
                  </p>
                </DialogHeader>

                {/* 3 CLEAN PILLS */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setFeedbackType('general')}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-md text-xs font-bold transition-all border cursor-pointer text-center",
                      feedbackType === 'general'
                        ? "bg-[#d95f02] text-white border-[#d95f02] shadow-md shadow-[#d95f02]/20"
                        : "bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                    )}
                  >
                    <MessageSquare className="size-3.5 shrink-0" />
                    <span>General</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedbackType('bug')}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-md text-xs font-bold transition-all border cursor-pointer text-center",
                      feedbackType === 'bug'
                        ? "bg-[#d95f02] text-white border-[#d95f02] shadow-md shadow-[#d95f02]/20"
                        : "bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                    )}
                  >
                    <Bug className="size-3.5 shrink-0" />
                    <span>Broken Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedbackType('school')}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-md text-xs font-bold transition-all border cursor-pointer text-center",
                      feedbackType === 'school'
                        ? "bg-[#d95f02] text-white border-[#d95f02] shadow-md shadow-[#d95f02]/20"
                        : "bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                    )}
                  >
                    <Building2 className="size-3.5 shrink-0" />
                    <span>School Intel</span>
                  </button>
                </div>

                {/* --- TAB A: GENERAL FEEDBACK OR BROKEN LINK --- */}
                {(feedbackType === 'general' || feedbackType === 'bug') && (
                  <div className="space-y-3.5 text-left pt-1 animate-in fade-in duration-150">
                    <div className="space-y-1.5">
                      <Label htmlFor="feedback-text" className="text-xs font-bold text-slate-200">
                        {feedbackType === 'bug' ? 'Issue / Broken Link Description' : 'Your Feedback or Suggestion'}
                      </Label>
                      <Textarea 
                        id="feedback-text" 
                        placeholder={
                          feedbackType === 'bug' 
                            ? "Tell us which job, page, or career link is broken..." 
                            : "What's on your mind? Feedback, ideas, questions, or improvements..."
                        }
                        className="min-h-[120px] bg-slate-900/95 border-slate-700 text-white text-xs leading-relaxed rounded-md focus:border-[#d95f02] placeholder:text-slate-500" 
                        value={intel} 
                        onChange={(e) => setIntel(e.target.value)} 
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="feedback-email" className="text-xs font-bold text-slate-200">
                        Your Email <span className="text-[10px] font-normal text-slate-400">(Optional, if you would like a reply)</span>
                      </Label>
                      <Input
                        id="feedback-email"
                        type="email"
                        placeholder={user?.email || "educator@domain.com"}
                        className="bg-slate-900/95 border-slate-700 text-white h-9 text-xs rounded-md focus:border-[#d95f02] placeholder:text-slate-500"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                      />
                    </div>

                    <div className="border-t border-slate-800 pt-3.5 flex items-center justify-between">
                      {/* Subtle link to request more views */}
                      <button
                        type="button"
                        onClick={() => setIsDataLockMode(true)}
                        className="text-[11px] font-bold text-[#d95f02] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Need more daily views?</span>
                        <ArrowRight className="size-3" />
                      </button>

                      <Button
                        type="button"
                        onClick={handleSubmitFeedback}
                        disabled={isSubmitting || !intel.trim()}
                        className="bg-[#d95f02] hover:bg-[#c45300] text-white font-bold text-xs uppercase px-5 py-2 h-9 rounded-md cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin mr-1.5" />
                            Sending...
                          </>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <Send className="size-3.5" />
                            {feedbackType === 'bug' ? 'Report Issue' : 'Send Feedback'}
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* --- TAB B: STRUCTURED SCHOOL INTEL OR DOMESTIC BASELINE --- */}
                {feedbackType === 'school' && (
                  isDomesticMode ? (
                    /* 🌍 DOMESTIC BASELINE SCREEN (NOT YET INTERNATIONAL) */
                    <div className="space-y-3.5 text-left pt-1 animate-in fade-in duration-150">
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                          <Compass className="size-3.5 text-amber-400" />
                          14-Day Relocation Pass (20 Daily Views for 2 Weeks)
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Not teaching internationally yet? Complete all 4 boxes below to unlock <strong>20 daily evaluation views for the next 2 weeks (14 days)</strong> — specifically to help you plan and make your international move! 🚀
                        </p>
                      </div>

                      {/* 1. HOME BASE */}
                      <div className="space-y-1">
                        <Label htmlFor="tab-domestic-home" className="text-xs font-bold text-slate-200 flex items-center justify-between">
                          <span>Home Base (Country / Region / City)</span>
                          <span className="text-[10px] text-slate-400 font-normal">Where you currently teach</span>
                        </Label>
                        <Input
                          id="tab-domestic-home"
                          placeholder="e.g. United Kingdom (London), USA (Texas), Australia (Sydney), Canada (Ontario)"
                          className="bg-slate-900/95 border-slate-700 text-white h-8.5 text-xs rounded-md focus:border-[#d95f02] placeholder:text-slate-500"
                          value={homeBase}
                          onChange={(e) => setHomeBase(e.target.value)}
                        />
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {['UK (London)', 'UK (Regional)', 'USA (State/District)', 'Canada', 'Australia', 'Ireland', 'South Africa', 'New Zealand'].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setHomeBase(preset)}
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer",
                                homeBase === preset
                                  ? "bg-amber-500/20 border-amber-500 text-amber-300"
                                  : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
                              )}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 2. CURRENT SALARY */}
                      <div className="space-y-1">
                        <Label htmlFor="tab-domestic-sal" className="text-xs font-bold text-slate-200 flex items-center justify-between">
                          <span>Current Domestic Salary / Scale</span>
                          <span className="text-[10px] text-slate-400 font-normal">Gross or net pay scale</span>
                        </Label>
                        <Input
                          id="tab-domestic-sal"
                          placeholder="e.g. £44,000 (MPS 5), $65,000 USD (Step 4), $88,000 AUD, €42,000"
                          className="bg-slate-900/95 border-slate-700 text-white h-8.5 text-xs rounded-md focus:border-[#d95f02] placeholder:text-slate-500"
                          value={currentSalary}
                          onChange={(e) => setCurrentSalary(e.target.value)}
                        />
                      </div>

                      {/* 3. REASON FOR RELOCATING */}
                      <div className="space-y-1.5">
                        <Label htmlFor="tab-domestic-reason" className="text-xs font-bold text-slate-200 flex items-center justify-between">
                          <span>Reason for Relocating</span>
                          <span className="text-[10px] text-slate-400 font-normal">Primary motivation</span>
                        </Label>
                        <Input
                          id="tab-domestic-reason"
                          placeholder="e.g. High savings potential & tax efficiency, career advancement, cultural adventure..."
                          className="bg-slate-900/95 border-slate-700 text-white h-8.5 text-xs rounded-md focus:border-[#d95f02] placeholder:text-slate-500"
                          value={relocationReason}
                          onChange={(e) => setRelocationReason(e.target.value)}
                        />
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {[
                            '💰 High Savings & Tax Benefits',
                            '⚖️ Work-Life Balance',
                            '🌍 Cultural Adventure & Travel',
                            '🎓 IB / Cambridge Experience',
                            '👨‍👩‍👧 Family Lifestyle',
                            '📉 Cost of Living Relief'
                          ].map((reason) => (
                            <button
                              key={reason}
                              type="button"
                              onClick={() => setRelocationReason(reason)}
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer",
                                relocationReason === reason
                                  ? "bg-[#d95f02]/20 border-[#d95f02] text-[#ff8c42]"
                                  : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
                              )}
                            >
                              {reason}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 4. JOB SOURCE USING */}
                      <div className="space-y-1.5">
                        <Label htmlFor="tab-domestic-source" className="text-xs font-bold text-slate-200 flex items-center justify-between">
                          <span>Job Source Using</span>
                          <span className="text-[10px] text-slate-400 font-normal">Recruitment platforms or fairs</span>
                        </Label>
                        <Input
                          id="tab-domestic-source"
                          placeholder="e.g. TES, Search Associates, Schrole, GRC Fair, Teacher Horizons"
                          className="bg-slate-900/95 border-slate-700 text-white h-8.5 text-xs rounded-md focus:border-[#d95f02] placeholder:text-slate-500"
                          value={jobSource}
                          onChange={(e) => setJobSource(e.target.value)}
                        />
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {[
                            'TES',
                            'Search Associates',
                            'Schrole',
                            'GRC Fair',
                            'Teacher Horizons',
                            'Direct Application',
                            'LinkedIn',
                            'Carney Sandoe'
                          ].map((source) => (
                            <button
                              key={source}
                              type="button"
                              onClick={() => {
                                const current = jobSource ? jobSource.split(', ').map(s => s.trim()) : [];
                                if (current.includes(source)) {
                                  setJobSource(current.filter(s => s !== source).join(', '));
                                } else {
                                  setJobSource(current.length > 0 ? `${jobSource}, ${source}` : source);
                                }
                              }}
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer",
                                jobSource.includes(source)
                                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold"
                                  : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
                              )}
                            >
                              {source}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* FOOTER ACTIONS */}
                      <div className="border-t border-slate-800 pt-3.5 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setIsDomesticMode(false)}
                          className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
                        >
                          ← Back to School Intel
                        </button>

                        <Button
                          type="button"
                          onClick={handleSubmitDomesticBaseline}
                          disabled={isSubmittingDomestic || !homeBase.trim() || !currentSalary.trim() || !relocationReason.trim() || !jobSource.trim()}
                          className="bg-[#d95f02] hover:bg-[#c45300] text-white font-bold text-xs uppercase px-4 py-2 h-9 rounded-md cursor-pointer"
                        >
                          {isSubmittingDomestic ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin mr-1.5" />
                              Activating Pass...
                            </>
                          ) : (
                            "Activate 14-Day Pass (20 Daily Views)"
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* STANDARD INTERNATIONAL SCHOOL INTEL FORM */
                    <div className="space-y-3 text-left pt-1 animate-in fade-in duration-150">
                      {/* 🚀 NOT TEACHING INTERNATIONALLY YET PROMPT BANNER */}
                      <div className="flex items-center justify-between p-2.5 bg-slate-900/90 border border-amber-500/40 rounded-md">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <Compass className="size-3.5 shrink-0 text-amber-400" />
                            Not teaching internationally yet?
                          </p>
                          <p className="text-[11px] text-slate-300">
                            State your home base, salary & plans to unlock views.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsDomesticMode(true)}
                          className="border-amber-500/60 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 text-xs font-bold h-7 px-2.5 shrink-0 cursor-pointer"
                        >
                          Contribute Baseline →
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="relative space-y-1">
                          <Label htmlFor="school-org" className="text-xs font-bold text-slate-200">School Name</Label>
                          <Input 
                            id="school-org" 
                            placeholder="e.g. Vienna International School, Prague English" 
                            autoComplete="off"
                            className="bg-slate-900/95 border-slate-700 text-white h-8.5 text-xs rounded-md focus:border-[#d95f02] placeholder:text-slate-500" 
                            value={organisation} 
                            onChange={(e) => handleSchoolInputChange(e.target.value)} 
                            onBlur={() => {
                              setTimeout(() => setShowSuggestions(false), 250);
                              handleVerifySchool();
                            }} 
                            onFocus={() => {
                              if (schoolSuggestions.length > 0) setShowSuggestions(true);
                            }}
                          />

                          {/* AUTOCOMPLETE SUGGESTIONS DROPDOWN */}
                          {showSuggestions && schoolSuggestions.length > 0 && (
                            <div className="absolute top-[58px] left-0 right-0 z-50 bg-[#0f172a] border border-slate-700 rounded-md shadow-2xl max-h-48 overflow-y-auto py-1">
                              {schoolSuggestions.map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onMouseDown={() => handleSelectSchoolSuggestion(s)}
                                  className="w-full text-left px-3 py-2 hover:bg-[#d95f02]/20 hover:text-white transition-colors flex items-center justify-between text-xs border-b border-slate-800/50 last:border-0 cursor-pointer"
                                >
                                  <div>
                                    <p className="font-bold text-slate-200">{s.name}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">{s.city}, {s.country}</p>
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded shrink-0">
                                    Verified
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}

                          {isVerifyingSchool ? (
                            <p className="text-[10px] font-mono text-sky-400 flex items-center gap-1">
                              <Loader2 className="size-3 animate-spin" /> Verifying international school...
                            </p>
                          ) : validationStatus ? (
                            <p className={cn(
                              "text-[10px] font-bold",
                              schoolVerified === true ? "text-emerald-400" : "text-rose-400"
                            )}>
                              {validationStatus}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="school-loc" className="text-xs font-bold text-slate-200">City, Country</Label>
                          <Input 
                            id="school-loc" 
                            placeholder="e.g. Prague, Czechia" 
                            className="bg-slate-900/95 border-slate-700 text-white h-8.5 text-xs rounded-md focus:border-[#d95f02] placeholder:text-slate-500" 
                            value={location} 
                            onChange={(e) => {
                              setLocation(e.target.value);
                              setIsLocationManuallyEdited(true);
                            }} 
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="intel-cat" className="text-xs font-bold text-slate-200">Intel Category</Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger id="intel-cat" className="bg-slate-900/95 border-slate-700 text-white text-xs h-8.5 rounded-md focus:border-[#d95f02]">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0b1329] border-slate-700 text-white">
                            <SelectItem value="Salary">💰 Salary & Allowances</SelectItem>
                            <SelectItem value="Housing">🏠 Housing & Utilities</SelectItem>
                            <SelectItem value="Contract">📋 Contract & Legal Terms</SelectItem>
                            <SelectItem value="Other">💡 General Intelligence</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="school-details" className="text-xs font-bold text-slate-200">
                          Package Details or Living Cost Intel
                        </Label>
                        <Textarea 
                          id="school-details" 
                          placeholder="Provide concrete salary scales, monthly housing allowance, flights, or local living cost reality..." 
                          className="min-h-[85px] bg-slate-900/95 border-slate-700 text-white text-xs leading-relaxed rounded-md focus:border-[#d95f02] placeholder:text-slate-500" 
                          value={intel} 
                          onChange={(e) => setIntel(e.target.value)} 
                        />
                      </div>

                      <div className="border-t border-slate-800 pt-3.5 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setIsDataLockMode(true)}
                          className="text-[11px] font-bold text-[#d95f02] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Need more daily views?</span>
                          <ArrowRight className="size-3" />
                        </button>

                        <Button
                          type="button"
                          onClick={handleSubmitSchoolIntel}
                          disabled={isSubmitting || intel.trim().length < 10}
                          className="bg-[#d95f02] hover:bg-[#c45300] text-white font-bold text-xs uppercase px-4 py-2 h-9 rounded-md cursor-pointer"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin mr-1.5" />
                              Submitting...
                            </>
                          ) : (
                            "Submit Intel (+10 Views)"
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              /* ========================================================================= */
              /* MODE 2: DEDICATED EVALUATION QUOTA UPLIFT (TRIGGERED BY AI UPLIFT / LIMIT) */
              /* ========================================================================= */
              <div className="space-y-4">
                <DialogHeader className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <DialogTitle className="text-white flex items-center gap-2 font-black text-lg tracking-tight">
                      <Zap className="size-5 text-[#d95f02]" />
                      <span>Evaluation Quota Uplift</span>
                    </DialogTitle>
                    <div className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-300">
                      <Clock className="size-3 text-amber-400" />
                      <span>Resets in: <strong className="text-white">{timeUntilReset || 'midnight'}</strong></span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300">
                    Unlock extra full school evaluation views
                  </p>

                  {/* HEADER STATUS / BADGE */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                      {!hasCompletedAllIntelPhases ? (
                        isDomesticMode ? (
                          <>
                            <Compass className="size-4 text-amber-400" />
                            <span>Domestic Baseline Benchmark</span>
                          </>
                        ) : (
                          <>
                            <Building2 className="size-4 text-[#d95f02]" />
                            <span>Contribute School Intel</span>
                          </>
                        )
                      ) : (
                        <>
                          <Bot className="size-4 text-[#d95f02]" />
                          <span>One Off Uplift</span>
                        </>
                      )}
                    </div>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded text-[10px] font-mono font-bold",
                      !hasCompletedAllIntelPhases
                        ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-400"
                        : "bg-[#d95f02]/20 border border-[#d95f02]/40 text-amber-400"
                    )}>
                      {!hasCompletedAllIntelPhases 
                        ? `Phase ${dailyContributionsCount + 1} of ${MAX_INTEL_PHASES} (+20 Views)` 
                        : "One-Off Emergency Uplift (+20 Views)"}
                    </span>
                  </div>
                </DialogHeader>

                {/* --- OPTION 1: CONTRIBUTE INTEL OR DOMESTIC BASELINE (SHOWN DURING ALL CONTRIBUTE PHASES) --- */}
                {!hasCompletedAllIntelPhases ? (
                  isDomesticMode ? (
                    /* 🌍 DOMESTIC BASELINE FORM IN DATA LOCK MODE */
                    <div className="space-y-3.5 text-left pt-1 animate-in fade-in duration-150">
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                          <Compass className="size-3.5 text-amber-400" />
                          14-Day Relocation Pass (20 Daily Views for 2 Weeks)
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Not teaching internationally yet? Complete all 4 boxes below to unlock <strong>20 daily evaluation views for the next 2 weeks (14 days)</strong> — specifically to help you plan and make your international move! 🚀
                        </p>
                      </div>

                      {/* 1. HOME BASE */}
                      <div className="space-y-1">
                        <Label htmlFor="uplift-domestic-home" className="text-xs font-bold text-slate-200 flex items-center justify-between">
                          <span>Home Base (Country / Region / City)</span>
                          <span className="text-[10px] text-slate-400 font-normal">Where you currently teach</span>
                        </Label>
                        <Input
                          id="uplift-domestic-home"
                          placeholder="e.g. United Kingdom (London), USA (Texas), Australia (Sydney), Canada (Ontario)"
                          className="bg-slate-900/95 border-slate-700 text-white h-8.5 text-xs rounded-md focus:border-[#d95f02] placeholder:text-slate-500"
                          value={homeBase}
                          onChange={(e) => setHomeBase(e.target.value)}
                        />
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {['UK (London)', 'UK (Regional)', 'USA (State/District)', 'Canada', 'Australia', 'Ireland', 'South Africa', 'New Zealand'].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setHomeBase(preset)}
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer",
                                homeBase === preset
                                  ? "bg-amber-500/20 border-amber-500 text-amber-300"
                                  : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
                              )}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 2. CURRENT SALARY */}
                      <div className="space-y-1">
                        <Label htmlFor="uplift-domestic-sal" className="text-xs font-bold text-slate-200 flex items-center justify-between">
                          <span>Current Domestic Salary / Scale</span>
                          <span className="text-[10px] text-slate-400 font-normal">Gross or net pay scale</span>
                        </Label>
                        <Input
                          id="uplift-domestic-sal"
                          placeholder="e.g. £44,000 (MPS 5), $65,000 USD (Step 4), $88,000 AUD, €42,000"
                          className="bg-slate-900/95 border-slate-700 text-white h-8.5 text-xs rounded-md focus:border-[#d95f02] placeholder:text-slate-500"
                          value={currentSalary}
                          onChange={(e) => setCurrentSalary(e.target.value)}
                        />
                      </div>

                      {/* 3. REASON FOR RELOCATING */}
                      <div className="space-y-1.5">
                        <Label htmlFor="uplift-domestic-reason" className="text-xs font-bold text-slate-200 flex items-center justify-between">
                          <span>Reason for Relocating</span>
                          <span className="text-[10px] text-slate-400 font-normal">Primary motivation</span>
                        </Label>
                        <Input
                          id="uplift-domestic-reason"
                          placeholder="e.g. High savings potential & tax efficiency, career advancement, cultural adventure..."
                          className="bg-slate-900/95 border-slate-700 text-white h-8.5 text-xs rounded-md focus:border-[#d95f02] placeholder:text-slate-500"
                          value={relocationReason}
                          onChange={(e) => setRelocationReason(e.target.value)}
                        />
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {[
                            '💰 High Savings & Tax Benefits',
                            '⚖️ Work-Life Balance',
                            '🌍 Cultural Adventure & Travel',
                            '🎓 IB / Cambridge Experience',
                            '👨‍👩‍👧 Family Lifestyle',
                            '📉 Cost of Living Relief'
                          ].map((reason) => (
                            <button
                              key={reason}
                              type="button"
                              onClick={() => setRelocationReason(reason)}
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer",
                                relocationReason === reason
                                  ? "bg-[#d95f02]/20 border-[#d95f02] text-[#ff8c42]"
                                  : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
                              )}
                            >
                              {reason}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 4. JOB SOURCE USING */}
                      <div className="space-y-1.5">
                        <Label htmlFor="uplift-domestic-source" className="text-xs font-bold text-slate-200 flex items-center justify-between">
                          <span>Job Source Using</span>
                          <span className="text-[10px] text-slate-400 font-normal">Recruitment platforms or fairs</span>
                        </Label>
                        <Input
                          id="uplift-domestic-source"
                          placeholder="e.g. TES, Search Associates, Schrole, GRC Fair, Teacher Horizons"
                          className="bg-slate-900/95 border-slate-700 text-white h-8.5 text-xs rounded-md focus:border-[#d95f02] placeholder:text-slate-500"
                          value={jobSource}
                          onChange={(e) => setJobSource(e.target.value)}
                        />
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {[
                            'TES',
                            'Search Associates',
                            'Schrole',
                            'GRC Fair',
                            'Teacher Horizons',
                            'Direct Application',
                            'LinkedIn',
                            'Carney Sandoe'
                          ].map((source) => (
                            <button
                              key={source}
                              type="button"
                              onClick={() => {
                                const current = jobSource ? jobSource.split(', ').map(s => s.trim()) : [];
                                if (current.includes(source)) {
                                  setJobSource(current.filter(s => s !== source).join(', '));
                                } else {
                                  setJobSource(current.length > 0 ? `${jobSource}, ${source}` : source);
                                }
                              }}
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer",
                                jobSource.includes(source)
                                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold"
                                  : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
                              )}
                            >
                              {source}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* FOOTER ACTIONS */}
                      <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setIsDomesticMode(false)}
                          className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
                        >
                          ← Back to School Intel
                        </button>

                        <Button
                          type="button"
                          onClick={handleSubmitDomesticBaseline}
                          disabled={isSubmittingDomestic || !homeBase.trim() || !currentSalary.trim() || !relocationReason.trim() || !jobSource.trim()}
                          className="bg-[#d95f02] hover:bg-[#c45300] text-white font-bold text-xs uppercase px-4 py-2 h-9 rounded-md cursor-pointer"
                        >
                          {isSubmittingDomestic ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin mr-1.5" />
                              Activating Pass...
                            </>
                          ) : (
                            "Activate 14-Day Pass (20 Daily Views)"
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* STANDARD INTERNATIONAL SCHOOL INTEL VIEW */
                    <div className="space-y-3 text-left pt-1 animate-in fade-in duration-150">
                      <div className="p-3 bg-slate-900/90 border border-slate-700/80 rounded-md space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#d95f02] uppercase tracking-wider">
                          <Building2 className="size-3.5" />
                          Anonymous Data Contribution
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Share verified salary scales, housing stipends, or contract terms to help fellow educators and unlock 20 full evaluation views.
                        </p>
                      </div>

                      {/* 🚀 NOT TEACHING INTERNATIONALLY YET PROMPT BANNER */}
                      <div className="flex items-center justify-between p-2.5 bg-slate-900/90 border border-amber-500/40 rounded-md">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <Compass className="size-3.5 shrink-0 text-amber-400" />
                            Not teaching internationally yet?
                          </p>
                          <p className="text-[11px] text-slate-300">
                            State your home base, salary & plans to unlock views.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsDomesticMode(true)}
                          className="border-amber-500/60 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 text-xs font-bold h-7 px-2.5 shrink-0 cursor-pointer"
                        >
                          Contribute Baseline →
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="relative space-y-1">
                          <Label htmlFor="uplift-school-org" className="text-xs font-bold text-slate-200">School Name</Label>
                          <Input 
                            id="uplift-school-org" 
                            placeholder="e.g. Vienna International School, Prague English" 
                            autoComplete="off"
                            className="bg-slate-900/95 border-slate-700 text-white h-8.5 text-xs rounded-md focus:border-[#d95f02] placeholder:text-slate-500" 
                            value={organisation} 
                            onChange={(e) => handleSchoolInputChange(e.target.value)} 
                            onBlur={() => {
                              setTimeout(() => setShowSuggestions(false), 250);
                              handleVerifySchool();
                            }} 
                            onFocus={() => {
                              if (schoolSuggestions.length > 0) setShowSuggestions(true);
                            }}
                          />

                          {/* AUTOCOMPLETE SUGGESTIONS DROPDOWN */}
                          {showSuggestions && schoolSuggestions.length > 0 && (
                            <div className="absolute top-[58px] left-0 right-0 z-50 bg-[#0f172a] border border-slate-700 rounded-md shadow-2xl max-h-48 overflow-y-auto py-1">
                              {schoolSuggestions.map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onMouseDown={() => handleSelectSchoolSuggestion(s)}
                                  className="w-full text-left px-3 py-2 hover:bg-[#d95f02]/20 hover:text-white transition-colors flex items-center justify-between text-xs border-b border-slate-800/50 last:border-0 cursor-pointer"
                                >
                                  <div>
                                    <p className="font-bold text-slate-200">{s.name}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">{s.city}, {s.country}</p>
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded shrink-0">
                                    Verified
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}

                          {isVerifyingSchool ? (
                            <p className="text-[10px] font-mono text-sky-400 flex items-center gap-1">
                              <Loader2 className="size-3 animate-spin" /> Verifying international school...
                            </p>
                          ) : validationStatus ? (
                            <p className={cn(
                              "text-[10px] font-bold",
                              schoolVerified === true ? "text-emerald-400" : "text-rose-400"
                            )}>
                              {validationStatus}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="uplift-school-loc" className="text-xs font-bold text-slate-200">City, Country</Label>
                          <Input 
                            id="uplift-school-loc" 
                            placeholder="e.g. Prague, Czechia" 
                            className="bg-slate-900/95 border-slate-700 text-white h-8.5 text-xs rounded-md focus:border-[#d95f02] placeholder:text-slate-500" 
                            value={location} 
                            onChange={(e) => {
                              setLocation(e.target.value);
                              setIsLocationManuallyEdited(true);
                            }} 
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="uplift-intel-cat" className="text-xs font-bold text-slate-200">Intel Category</Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger id="uplift-intel-cat" className="bg-slate-900/95 border-slate-700 text-white text-xs h-8.5 rounded-md focus:border-[#d95f02]">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0b1329] border-slate-700 text-white">
                            <SelectItem value="Salary">💰 Salary & Allowances</SelectItem>
                            <SelectItem value="Housing">🏠 Housing & Utilities</SelectItem>
                            <SelectItem value="Contract">📋 Contract & Legal Terms</SelectItem>
                            <SelectItem value="Other">💡 General Intelligence</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="uplift-school-details" className="text-xs font-bold text-slate-200">
                          Package Details or Living Cost Intel
                        </Label>
                        <Textarea 
                          id="uplift-school-details" 
                          placeholder="Provide concrete salary scales, monthly housing allowance, flights, or local living cost reality..." 
                          className="min-h-[80px] bg-slate-900/95 border-slate-700 text-white text-xs leading-relaxed rounded-md focus:border-[#d95f02] placeholder:text-slate-500" 
                          value={intel} 
                          onChange={(e) => setIntel(e.target.value)} 
                        />
                      </div>

                      <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setIsDataLockMode(false)}
                          className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
                        >
                          ← Back to Feedback Form
                        </button>

                        <Button
                          type="button"
                          onClick={handleSubmitSchoolIntel}
                          disabled={isSubmitting || intel.trim().length < 10}
                          className="bg-[#d95f02] hover:bg-[#c45300] text-white font-bold text-xs uppercase px-4 py-2 h-9 rounded-md cursor-pointer"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin mr-1.5" />
                              Submitting...
                            </>
                          ) : (
                            "Submit Intel (+20 Views)"
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                ) : (
                  /* --- OPTION 2: ONE OFF UPLIFT (ONLY REVEALED WHEN ALL INTEL PHASES ARE COMPLETE) --- */
                  <div className="space-y-3.5 py-1 text-left animate-in fade-in duration-150">
                    <div className="p-3 bg-slate-900/90 border border-slate-700/80 rounded-md space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#d95f02] uppercase tracking-wider">
                        <Bot className="size-3.5" />
                        One Off Uplift Clearance
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        All data contribution phases completed. Let us know your active scenario for one-off automated AI audit clearance (+20 views).
                      </p>
                    </div>

                    {hasUsedOneOffUplift ? (
                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-md text-center space-y-2">
                        <CheckCircle2 className="size-8 text-emerald-400 mx-auto" />
                        <p className="text-xs font-bold text-white">One Off Uplift Claimed</p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          You have utilized your one-off uplift for this cycle. Your daily evaluation quota will reset at midnight.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="ai-reason" className="text-xs font-bold text-slate-200">
                            Your Scenario (1 brief sentence)
                          </Label>
                          <Textarea
                            id="ai-reason"
                            placeholder="e.g. Interviewing with 2 schools in Dubai and Munich next week, comparing package savings..."
                            className="min-h-[85px] bg-slate-900/95 border-slate-700 text-white text-xs leading-relaxed rounded-md focus:border-[#d95f02] placeholder:text-slate-500"
                            value={clearanceReason}
                            onChange={(e) => setClearanceReason(e.target.value)}
                          />
                        </div>

                        <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setIsDataLockMode(false)}
                            className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
                          >
                            ← Back to Feedback Form
                          </button>
                          <Button
                            type="button"
                            onClick={handleRequestAIClearance}
                            disabled={isRequestingClearance || clearanceReason.trim().length < 8}
                            className={cn(
                              "py-2 px-4 rounded-md text-xs font-bold uppercase transition-all",
                              clearanceReason.trim().length >= 8 && !isRequestingClearance
                                ? "bg-[#d95f02] hover:bg-[#c45300] text-white shadow-md cursor-pointer"
                                : "bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed"
                            )}
                          >
                            {isRequestingClearance ? (
                              <span className="flex items-center gap-1.5">
                                <Loader2 className="size-3.5 animate-spin" />
                                Auditing (~1.5s)...
                              </span>
                            ) : (
                              "Request +20 Evaluations"
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
