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
  Share2,
  Copy,
  Check,
  Users,
  ExternalLink,
  Clock,
  Bot,
  Send,
  ShieldCheck,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { submitAnonymousFieldIntelAction } from '@/app/actions/intelligence-actions';
import { requestExpeditedClearanceAction } from '@/app/actions/ai-clearance-actions';
import { transmitIntelligence } from '@/ai/flows/transmit-intelligence-flow';
import { disambiguateSchool } from '@/ai/flows/disambiguate-school-flow';
import { getTimeUntilLocalMidnight } from '@/lib/utils/timeUtils';
import { cn } from '@/lib/utils';
import { collection, doc, updateDoc, increment } from 'firebase/firestore';
import type { School } from '@/lib/types';

export function FieldIntelligenceModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDataLockMode, setIsDataLockMode] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'general' | 'bug' | 'school'>('general');
  const [unlockTab, setUnlockTab] = useState<'ai' | 'social'>('ai');
  const [isScanning, setIsScanning] = useState(false);
  
  // Feedback form fields
  const [category, setCategory] = useState<string>('Salary');
  const [organisation, setOrganisation] = useState('');
  const [location, setLocation] = useState('');
  const [accreditation, setAccreditation] = useState('IB / CIS');
  const [intel, setIntel] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // AI Uplift & Social fields
  const [hasCopiedRef, setHasCopiedRef] = useState(false);
  const [clearanceReason, setClearanceReason] = useState('');
  const [isRequestingClearance, setIsRequestingClearance] = useState(false);
  
  // School verification
  const [validationStatus, setValidationStatus] = useState('');

  // Reward / success animations
  const [isDestructing, setIsDestructing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('+20 Full School Evaluations Added');
  const [countdown, setCountdown] = useState(3);
  
  // Midnight reset clock
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  const { user } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();

  const schoolsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'schools') : null),
    [firestore]
  );
  const { data: schoolsRegistry } = useCollection<School>(schoolsQuery);

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
    setAccreditation('IB / CIS');
    setIntel('');
    setContactEmail('');
    setIsSubmitting(false);
    setValidationStatus('');
    setIsDataLockMode(false);
    setUnlockTab('ai');
    setHasCopiedRef(false);
    setClearanceReason('');
    setIsRequestingClearance(false);
  };

  const grantInstantCreditReward = async (amount: number, reason: string) => {
    if (user && firestore) {
      try {
        const teacherDoc = doc(firestore, 'teachers', user.uid);
        await updateDoc(teacherDoc, {
          evaluations_allowance: increment(amount),
          bonus_credits: increment(amount),
          contributions_count: increment(1)
        });
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

  // 🌐 SOCIAL UNLOCK HANDLER
  const handleSocialUnlock = (platform: 'facebook' | 'linkedin') => {
    const url = platform === 'facebook'
      ? 'https://www.facebook.com/leopardfishintel'
      : 'https://www.linkedin.com/company/leopardfishintel/';
    
    window.open(url, '_blank', 'noopener,noreferrer');
    grantInstantCreditReward(10, `${platform === 'facebook' ? 'Facebook' : 'LinkedIn'} Follow`);
    toast({
      title: "⚡ +10 Evaluations Unlocked!",
      description: `Thank you for supporting Leopardfish Intel on ${platform === 'facebook' ? 'Facebook' : 'LinkedIn'}.`,
    });
  };

  // 👥 REFERRAL UNLOCK HANDLER
  const handleCopyReferralLink = () => {
    const refCode = user?.uid?.substring(0, 8) || 'TEACH';
    const link = `https://leopardfishintel.com/signup?ref=${refCode}`;
    navigator.clipboard.writeText(link);
    setHasCopiedRef(true);
    grantInstantCreditReward(10, 'Colleague Invite Link Copied');
    toast({
      title: "📋 Referral Link Copied (+10 Evaluations)",
      description: "Share this link with your fellow educators to unlock collective insights.",
    });
  };

  const handleVerifySchool = async () => {
    if (!organisation || !location) return;
    try {
      const registry = schoolsRegistry?.map(s => ({ id: s.id, name: s.name })) || [];
      const result = await disambiguateSchool({
        user_input_school: organisation,
        user_input_city: location,
        verified_registry: registry,
      });
      setValidationStatus(result.message_to_user);
      if (!result.is_ambiguous && !result.is_new_entity && result.canonical_name !== organisation) {
        setOrganisation(result.canonical_name);
      }
    } catch (error) {
      console.error('Validation error:', error);
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

  // SUBMIT STRUCTURED SCHOOL INTEL (+10 REWARD)
  const handleSubmitSchoolIntel = async () => {
    if (!organisation || !location || !intel) {
      toast({ variant: 'destructive', title: 'Input required', description: 'Please enter the school name, location, and package details.' });
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

      await grantInstantCreditReward(10, 'Anonymous School Intel Verified');
      toast({
        title: "⚡ +10 Evaluations Unlocked!",
        description: "Your school report was anonymized and verified. +10 free evaluations added!",
      });

    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
      toast({ variant: 'destructive', title: 'Submission error', description: 'Could not submit intelligence.' });
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

                {/* --- TAB B: STRUCTURED SCHOOL INTEL --- */}
                {feedbackType === 'school' && (
                  <div className="space-y-3 text-left pt-1 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <Label htmlFor="school-org" className="text-xs font-bold text-slate-200">School Name</Label>
                        <Input 
                          id="school-org" 
                          placeholder="e.g. Vienna International School" 
                          className="bg-slate-900/95 border-slate-700 text-white h-8.5 text-xs rounded-md focus:border-[#d95f02] placeholder:text-slate-500" 
                          value={organisation} 
                          onChange={(e) => setOrganisation(e.target.value)} 
                          onBlur={handleVerifySchool} 
                        />
                        {validationStatus && <p className="text-[10px] font-bold text-amber-400">{validationStatus}</p>}
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="school-loc" className="text-xs font-bold text-slate-200">City, Country</Label>
                        <Input 
                          id="school-loc" 
                          placeholder="e.g. Vienna, Austria" 
                          className="bg-slate-900/95 border-slate-700 text-white h-8.5 text-xs rounded-md focus:border-[#d95f02] placeholder:text-slate-500" 
                          value={location} 
                          onChange={(e) => setLocation(e.target.value)} 
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
                          <SelectItem value="Admin">🛡️ Leadership & Admin Conduct</SelectItem>
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
                    Unlock extra full school evaluations for your account today.
                  </p>

                  {/* 2 CLEAN UPLIFT TABS */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setUnlockTab('ai')}
                      className={cn(
                        "flex items-center justify-center gap-1.5 p-2.5 rounded-md border transition-all text-xs font-bold cursor-pointer",
                        unlockTab === 'ai'
                          ? "bg-[#d95f02]/20 border-[#d95f02] text-white shadow-md shadow-[#d95f02]/20"
                          : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                      )}
                    >
                      <Bot className="size-4 text-[#d95f02]" />
                      <span>Instant AI Uplift</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold ml-1">+20</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUnlockTab('social')}
                      className={cn(
                        "flex items-center justify-center gap-1.5 p-2.5 rounded-md border transition-all text-xs font-bold cursor-pointer",
                        unlockTab === 'social'
                          ? "bg-[#d95f02]/20 border-[#d95f02] text-white shadow-md shadow-[#d95f02]/20"
                          : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                      )}
                    >
                      <Share2 className="size-4 text-sky-400" />
                      <span>Social & Invite</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold ml-1">+10</span>
                    </button>
                  </div>
                </DialogHeader>

                {/* TAB 1: AI CLEARANCE */}
                {unlockTab === 'ai' && (
                  <div className="space-y-3.5 py-1 text-left animate-in fade-in duration-150">
                    <div className="p-3 bg-slate-900/90 border border-slate-700/80 rounded-md space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#d95f02] uppercase tracking-wider">
                        <Bot className="size-3.5" />
                        AI Recruitment Desk Uplift
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Running on a deadline or need a few more checks? Let us know your scenario and we'll add another 20 views.
                      </p>
                    </div>

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
                  </div>
                )}

                {/* TAB 2: SOCIAL & REFERRALS */}
                {unlockTab === 'social' && (
                  <div className="space-y-3 py-1 text-left animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleSocialUnlock('facebook')}
                        className="p-3 bg-[#1877F2]/10 border border-[#1877F2]/30 hover:bg-[#1877F2]/20 rounded-md text-left transition-all group flex flex-col justify-between h-20 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase text-[#1877F2]">Facebook</span>
                          <ExternalLink className="size-3 text-[#1877F2]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Follow Page</p>
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">+10 Evaluations</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSocialUnlock('linkedin')}
                        className="p-3 bg-[#0A66C2]/10 border border-[#0A66C2]/30 hover:bg-[#0A66C2]/20 rounded-md text-left transition-all group flex flex-col justify-between h-20 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase text-[#0A66C2]">LinkedIn</span>
                          <ExternalLink className="size-3 text-[#0A66C2]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Follow Company</p>
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">+10 Evaluations</span>
                        </div>
                      </button>
                    </div>

                    {/* REFERRAL LINK */}
                    <div className="p-3 bg-slate-900/90 border border-slate-700/80 rounded-md space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <Users className="size-3.5 text-purple-400" />
                          Invite Colleague / Staff Room Link
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">+10 per invite</span>
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          readOnly 
                          value={`https://leopardfishintel.com/signup?ref=${user?.uid?.substring(0, 8) || 'TEACH'}`} 
                          className="bg-slate-950 border-slate-700 text-slate-300 text-xs font-mono h-8 select-all"
                        />
                        <Button
                          type="button"
                          onClick={handleCopyReferralLink}
                          className="bg-[#d95f02] hover:bg-[#c45300] text-white font-bold gap-1 text-xs h-8 px-3 shrink-0"
                        >
                          {hasCopiedRef ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                          {hasCopiedRef ? "Copied" : "Copy"}
                        </Button>
                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setIsDataLockMode(false)}
                        className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
                      >
                        ← Back to Feedback Form
                      </button>
                    </div>
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
