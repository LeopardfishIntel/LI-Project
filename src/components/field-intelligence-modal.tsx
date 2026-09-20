'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, 
  Zap, 
  Lock, 
  MapPin, 
  Paperclip, 
  X, 
  FileText, 
  DollarSign, 
  Link2, 
  Scale, 
  Lightbulb, 
  CheckCircle2, 
  ShieldCheck 
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { transmitIntelligence } from '@/ai/flows/transmit-intelligence-flow';
import { disambiguateSchool } from '@/ai/flows/disambiguate-school-flow';
import { cn } from '@/lib/utils';
import { collection } from 'firebase/firestore';
import type { School } from '@/lib/types';

interface TopicChip {
  id: string;
  label: string;
  icon: React.ReactNode;
  category: string;
  template: string;
}

const TOPIC_CHIPS: TopicChip[] = [
  {
    id: 'salary',
    label: 'Salary / Housing Correction',
    icon: <DollarSign className="size-3.5 text-emerald-400" />,
    category: 'Salary',
    template: 'Current listed salary: $X. Actual 2026 salary scale: $Y\nHousing provision details: '
  },
  {
    id: 'link',
    label: 'Broken Careers Link',
    icon: <Link2 className="size-3.5 text-sky-400" />,
    category: 'Other',
    template: 'The careers / application portal URL has moved to: '
  },
  {
    id: 'visa',
    label: 'Visa / Legal Update',
    icon: <Scale className="size-3.5 text-amber-400" />,
    category: 'Contract',
    template: 'Visa / marital / tax law update for this host country: '
  },
  {
    id: 'general',
    label: 'General Feedback',
    icon: <Lightbulb className="size-3.5 text-orange-400" />,
    category: 'Other',
    template: 'Correction / suggestion for this school dossier: '
  }
];

export function FieldIntelligenceModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [category, setCategory] = useState<string>('Salary');
  const [organisation, setOrganisation] = useState('');
  const [location, setLocation] = useState('');
  const [intel, setIntel] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState('');

  const [isDestructing, setIsDestructing] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isSmoked, setIsSmoked] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();

  const schoolsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'schools') : null),
    [firestore]
  );
  const { data: schoolsRegistry } = useCollection<School>(schoolsQuery);

  const [contextMetadata, setContextMetadata] = useState<{ url?: string; path?: string; schoolId?: string; schoolName?: string } | null>(null);

  useEffect(() => {
    const handleOpen = (e: any) => {
      setIsOpen(true);
      setIsScanning(true);
      setTimeout(() => setIsScanning(false), 800);

      const detail = e?.detail;
      if (detail) {
        setContextMetadata({
          url: detail.url,
          path: detail.path,
          schoolId: detail.schoolId,
          schoolName: detail.schoolName
        });
        if (detail.organisation || detail.schoolName) {
          setOrganisation(detail.organisation || detail.schoolName);
        }
        if (detail.location || detail.city || detail.country) {
          setLocation(detail.location || [detail.city, detail.country].filter(Boolean).join(', '));
        }
        if (detail.category) {
          setCategory(detail.category);
        }
      }
    };
    window.addEventListener('lfi:open-intel-modal', handleOpen);
    return () => window.removeEventListener('lfi:open-intel-modal', handleOpen);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isDestructing && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (isDestructing && countdown === 0) {
      setIsSmoked(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsDestructing(false);
        setIsSmoked(false);
        setCountdown(5);
        resetForm();
      }, 800);
    }
    return () => clearTimeout(timer);
  }, [isDestructing, countdown]);

  const resetForm = () => {
    setCategory('Salary');
    setOrganisation('');
    setLocation('');
    setIntel('');
    setSelectedFile(null);
    setActiveChip(null);
    setConsent(false);
    setIsSubmitting(false);
    setValidationStatus('');
  };

  const handleChipClick = (chip: TopicChip) => {
    setActiveChip(chip.id);
    setCategory(chip.category);
    
    // Auto-inject template if empty or replacing standard template
    const isStandardTemplate = TOPIC_CHIPS.some(c => c.template === intel);
    if (!intel.trim() || isStandardTemplate) {
      setIntel(chip.template);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'File too large', description: 'Maximum file size is 10MB.' });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleVerifySchool = async () => {
    if (!organisation || !location) return;
    setIsValidating(true);
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
    } finally {
      setIsValidating(false);
    }
  };

  const handleTransmit = async () => {
    if (!category || !organisation || !location || !intel) {
      toast({ variant: 'destructive', title: 'Input required', description: 'Please complete all required fields.' });
      return;
    }
    if (!consent) return;

    setIsSubmitting(true);

    try {
      await transmitIntelligence({
        category,
        organisation,
        location,
        content: intel,
        attachmentName: selectedFile ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})` : undefined,
        authorId: user?.uid,
        authorEmail: user?.email || undefined,
      });
      setIsDestructing(true);
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
      toast({ variant: 'destructive', title: 'Transmission error', description: 'Failed to establish uplink.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className={cn(
        "sm:max-w-[580px] glass bg-[#0a0f1d]/95 border-primary/30 text-white transition-all duration-500 shadow-2xl",
        isSmoked && "animate-smoke"
      )}>
        {isScanning ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-6">
            <Loader2 className="size-12 text-[#d95f02] animate-spin" />
            <DialogTitle className="text-lg font-bold text-[#d95f02] tracking-widest uppercase">
              Establishing Secure Uplink...
            </DialogTitle>
          </div>
        ) : isDestructing ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
            <Zap className="size-12 text-[#d95f02] animate-pulse" />
            <DialogTitle className="text-2xl font-black stamped-dossier text-[#d95f02]">
              Transmission Complete
            </DialogTitle>
            <p className="text-white font-bold text-lg">Self-destruct in {countdown}...</p>
          </div>
        ) : (
          <>
            <DialogHeader className="space-y-2.5">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-white flex items-center gap-2 font-black text-xl tracking-tight">
                  <ShieldCheck className="size-5 text-[#d95f02]" />
                  Field Intelligence Report
                </DialogTitle>
                <span className="text-[10px] font-mono text-[#d95f02] bg-[#d95f02]/10 border border-[#d95f02]/30 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Verified Uplink
                </span>
              </div>

              {/* 📍 Auto-Captured Page Context Badge */}
              {organisation ? (
                <div className="bg-gradient-to-r from-[#d95f02]/15 via-orange-500/10 to-transparent border border-[#d95f02]/30 p-2.5 rounded-sm flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="size-3.5 text-[#d95f02] shrink-0" />
                    <span className="text-slate-300 truncate text-[11px] sm:text-xs">
                      Reporting on: <strong className="text-white font-bold">{organisation}</strong>
                    </span>
                  </div>
                  {location && (
                    <span className="bg-slate-900/90 border border-white/10 px-2 py-0.5 rounded text-[10px] font-mono text-[#d95f02] font-bold shrink-0">
                      {location}
                    </span>
                  )}
                </div>
              ) : null}

              <DialogDescription asChild>
                <div className="bg-slate-950/60 border border-white/10 p-3 rounded-sm text-xs text-slate-300 leading-relaxed text-left">
                  <span className="text-white font-bold block mb-1">Submission Protocol</span>
                  Your anonymity is 100% protected. All submissions are stripped of sender telemetry immediately upon receipt. Please verify figures are factual and ensure any uploaded files or text do not contain personal names or private identifiers.
                </div>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2 max-h-[55vh] overflow-y-auto px-1">
              {/* Organization & Location Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="organisation" className="text-xs font-bold text-slate-300">Organisation / School</Label>
                  <Input 
                    id="organisation" 
                    placeholder="School or Agency..." 
                    className="bg-slate-950/70 border-white/10 text-white font-medium h-9 text-xs rounded-sm focus:border-[#d95f02]" 
                    value={organisation} 
                    onChange={(e) => setOrganisation(e.target.value)} 
                    onBlur={handleVerifySchool} 
                  />
                  {validationStatus && <p className="text-[10px] font-bold text-amber-400">{validationStatus}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="location" className="text-xs font-bold text-slate-300">Location</Label>
                  <Input 
                    id="location" 
                    placeholder="City, Country" 
                    className="bg-slate-950/70 border-white/10 text-white font-medium h-9 text-xs rounded-sm focus:border-[#d95f02]" 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)} 
                  />
                </div>
              </div>

              {/* Classification dropdown */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="category" className="text-xs font-bold text-slate-300">Report Classification</Label>
                </div>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-slate-950/70 border-white/10 text-white text-xs h-9 rounded-sm focus:border-[#d95f02]">
                    <SelectValue placeholder="Select classification..." />
                  </SelectTrigger>
                  <SelectContent className="glass bg-[#0a0f1d] border-white/15 text-white">
                    <SelectItem value="Salary">💰 Salary & Allowances</SelectItem>
                    <SelectItem value="Housing">🏠 Housing & Utilities</SelectItem>
                    <SelectItem value="Contract">📋 Contract & Legal Terms</SelectItem>
                    <SelectItem value="Admin">🛡️ Leadership & Admin Conduct</SelectItem>
                    <SelectItem value="Other">💡 General Intelligence / Corrections</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quick-Select Topic Chips */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  Quick Report Templates <span className="text-[10px] font-normal text-slate-400">(Click to pre-fill)</span>
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {TOPIC_CHIPS.map((chip) => {
                    const isSelected = activeChip === chip.id;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => handleChipClick(chip)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border",
                          isSelected 
                            ? "bg-[#d95f02] text-white border-[#f97316] shadow-[0_0_12px_rgba(217,95,2,0.4)]" 
                            : "bg-slate-900/80 text-slate-300 border-white/10 hover:border-[#d95f02]/60 hover:text-white"
                        )}
                      >
                        {chip.icon}
                        <span>{chip.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Details Narrative Textarea */}
              <div className="space-y-1.5">
                <Label htmlFor="intel" className="text-xs font-bold text-slate-300">
                  Details / What needs updating?
                </Label>
                <Textarea 
                  id="intel" 
                  placeholder="Provide specific salary figures, housing allowances, updated application links, or operational insights..." 
                  className="min-h-[100px] bg-slate-950/70 border-white/10 text-white text-xs leading-relaxed rounded-sm focus:border-[#d95f02]" 
                  value={intel} 
                  onChange={(e) => setIntel(e.target.value)} 
                />
              </div>

              {/* 📎 File Attachment Input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Attachment <span className="text-[10px] font-normal text-slate-400">(Contract PDF, salary scale, or screenshot)</span></span>
                  <span className="text-[10px] text-slate-400">Optional (Max 10MB)</span>
                </Label>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xlsx" 
                />

                {selectedFile ? (
                  <div className="flex items-center justify-between p-2 rounded-sm bg-[#d95f02]/10 border border-[#d95f02]/40 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="size-4 text-[#d95f02] shrink-0" />
                      <span className="text-white font-medium truncate text-xs">{selectedFile.name}</span>
                      <span className="text-slate-400 text-[10px] font-mono shrink-0">({formatFileSize(selectedFile.size)})</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={handleRemoveFile} 
                      className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-sm border border-dashed border-white/20 bg-slate-950/40 hover:bg-slate-900 hover:border-[#d95f02]/60 text-xs text-slate-300 hover:text-white transition-all"
                  >
                    <Paperclip className="size-3.5 text-[#d95f02]" />
                    <span>Attach document or screenshot (optional)</span>
                  </button>
                )}
              </div>

              {/* Consent checkbox */}
              <div className="flex items-start space-x-2.5 pt-1">
                <Checkbox 
                  id="consent" 
                  checked={consent} 
                  onCheckedChange={(v) => setConsent(!!v)} 
                  className="mt-0.5 border-white/30 data-[state=checked]:bg-[#d95f02] data-[state=checked]:border-[#d95f02] data-[state=checked]:text-white" 
                />
                <Label htmlFor="consent" className="text-xs text-slate-300 font-medium cursor-pointer leading-snug">
                  I have removed personal names/private data (No identifiable personal details included).
                </Label>
              </div>
            </div>

            {/* Glowing CTA Button */}
            <DialogFooter className="border-t border-white/10 pt-4 mt-2">
              <button
                type="button"
                onClick={handleTransmit}
                disabled={isSubmitting || !consent}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-sm text-sm font-black tracking-wide uppercase transition-all duration-300",
                  consent && !isSubmitting
                    ? "bg-gradient-to-r from-[#d95f02] via-[#ea580c] to-[#f97316] hover:from-[#ea580c] hover:to-[#fb923c] text-white shadow-[0_4px_24px_rgba(217,95,2,0.45)] border border-white/20 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                    : "bg-slate-800/80 text-slate-400 border border-white/10 opacity-50 cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Transmitting Intelligence...</span>
                  </>
                ) : (
                  <>
                    <Lock className="size-4" />
                    <span>Transmit Field Report</span>
                  </>
                )}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
