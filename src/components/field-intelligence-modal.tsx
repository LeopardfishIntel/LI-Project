'use client';

import React, { useState, useEffect } from 'react';
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
import { ShieldAlert, Loader2, Zap, Binoculars, ShieldCheck, Lock } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { transmitIntelligence } from '@/ai/flows/transmit-intelligence-flow';
import { disambiguateSchool } from '@/ai/flows/disambiguate-school-flow';
import { cn } from '@/lib/utils';
import { collection } from 'firebase/firestore';
import type { School } from '@/lib/types';

export function FieldIntelligenceModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [category, setCategory] = useState<string>('');
  const [organisation, setOrganisation] = useState('');
  const [location, setLocation] = useState('');
  const [intel, setIntel] = useState('');
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Disambiguation states
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState('');

  // Success/Destruct States
  const [isDestructing, setIsDestructing] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isSmoked, setIsSmoked] = useState(false);
  
  const { user } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();

  const schoolsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'schools') : null),
    [firestore]
  );
  const { data: schoolsRegistry } = useCollection<School>(schoolsQuery);

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setIsScanning(true);
      setTimeout(() => setIsScanning(false), 1500);
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
    setCategory('');
    setOrganisation('');
    setLocation('');
    setIntel('');
    setConsent(false);
    setIsSubmitting(false);
    setValidationStatus('');
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
      console.error('Validation Error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleTransmit = async () => {
    if (!category || !organisation || !location || !intel) {
      toast({ variant: 'destructive', title: 'Input Required', description: 'Mandatory fields missing.' });
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
        authorId: user?.uid,
        authorEmail: user?.email || undefined,
      });
      setIsDestructing(true);
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
      toast({ variant: 'destructive', title: 'Transmission Error', description: 'Failed to establish uplink.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className={cn(
        "sm:max-w-[550px] glass bg-background/95 border-primary/30 text-foreground transition-all duration-500",
        isSmoked && "animate-smoke"
      )}>
        {isScanning ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-6">
            <Loader2 className="size-12 text-primary animate-spin" />
            <DialogTitle className="text-xl font-bold text-primary">Establishing Secure Uplink...</DialogTitle>
          </div>
        ) : isDestructing ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
            <Zap className="size-12 text-primary animate-pulse" />
            <DialogTitle className="text-2xl font-black stamped-dossier text-primary">TRANSMISSION COMPLETE</DialogTitle>
            <p className="text-white font-black text-xl">SELF-DESTRUCT IN {countdown}...</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-primary flex items-center gap-2 font-bold text-xl normal-case">
                Field Report
              </DialogTitle>
              <DialogDescription className="bg-primary/10 border border-primary/20 p-3 rounded-sm text-[11px] text-primary-foreground/90 font-medium leading-relaxed text-left">
                <strong className="block mb-1">Security & Anonymity Notice</strong>
                Your Anonymity is our first priority. All incoming intel is processed through a secure pipeline where it is analyzed and transformed by our team into actionable intelligence. To maintain the "blind" nature of this system, all transmissions undergo a mandatory scrub of identifying metadata immediately upon submission.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-[10px] font-bold text-primary/70 uppercase">Location</Label>
                  <Input id="location" placeholder="City/Country" className="bg-slate-950/50 border-white/10" value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-[10px] font-bold text-primary/70 uppercase">Classification</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-slate-950/50 border-white/10">
                      <SelectValue placeholder="Category..." />
                    </SelectTrigger>
                    <SelectContent className="glass">
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="Salary">Salary</SelectItem>
                      <SelectItem value="Housing">Housing</SelectItem>
                      <SelectItem value="Admin">Admin Conduct</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organisation" className="text-[10px] font-bold text-primary/70 uppercase">Organisation</Label>
                <Input id="organisation" placeholder="School or Agency..." className="bg-slate-950/50 border-white/10" value={organisation} onChange={(e) => setOrganisation(e.target.value)} onBlur={handleVerifySchool} />
                {validationStatus && <p className="text-[9px] font-bold uppercase tracking-widest text-amber-500">{validationStatus}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="intel" className="text-[10px] font-bold text-primary/70 uppercase">Narrative</Label>
                <Textarea id="intel" placeholder="Enter data here..." className="min-h-[100px] bg-slate-950/50 border-white/10" value={intel} onChange={(e) => intel === 'Enter data here...' ? setIntel('') : setIntel(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-primary/70 uppercase flex items-center gap-2">
                  <ShieldCheck className="size-3" /> Security briefing
                </Label>
                <div className="p-3 text-[10px] bg-slate-950/40 border border-white/10 rounded-sm font-mono leading-relaxed text-muted-foreground">
                  <p className="text-white font-bold mb-2">Protocols</p>
                  <p>1. Accuracy Over Emotion: Stick to verifiable facts.</p>
                  <p>2. Redaction Mandatory: Never share Personally Identifiable Information., redact where appropriate and avoid personal naming.</p>
                  <p className="mt-4 text-white font-bold mb-2">Privacy Disclaimer</p>
                  <p>We do not trade teacher data. All transmissions are scrubbed of identifying metadata on submission.</p>
                </div>
              </div>

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="mt-1" />
                <Label htmlFor="consent" className="text-[10px] text-white font-bold uppercase tracking-tighter cursor-pointer">
                  I have redacted all PII and acknowledge the Security Briefing.
                </Label>
              </div>
            </div>

            <DialogFooter className="border-t border-white/5 pt-4">
              <Button onClick={handleTransmit} disabled={isSubmitting || !consent} className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-sm py-6">
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4 mr-2" />}
                Transmit Intel
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
