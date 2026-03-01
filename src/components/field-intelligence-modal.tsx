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
import { ShieldAlert, Loader2, Zap, Binoculars, Lock } from 'lucide-react';
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
  
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState('');

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
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleTransmit = async () => {
    if (!category || !organisation || !location || !intel) {
      toast({ variant: 'destructive', title: 'Input required', description: 'Mandatory fields missing.' });
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
      toast({ variant: 'destructive', title: 'Transmission error', description: 'Failed to establish uplink.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className={cn(
        "sm:max-w-[550px] glass bg-background/95 border-primary/30 text-white transition-all duration-500",
        isSmoked && "animate-smoke"
      )}>
        {isScanning ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-6">
            <Loader2 className="size-12 text-primary animate-spin" />
            <DialogTitle className="text-xl font-bold text-primary tracking-widest">Establishing secure uplink...</DialogTitle>
          </div>
        ) : isDestructing ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
            <Zap className="size-12 text-primary animate-pulse" />
            <DialogTitle className="text-2xl font-black stamped-dossier text-primary">Transmission complete</DialogTitle>
            <p className="text-white font-bold text-xl">Self-destruct in {countdown}...</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-primary flex items-center gap-2 font-bold text-xl normal-case">
                Field report
              </DialogTitle>
              <DialogDescription asChild>
                <div className="bg-primary/10 border border-primary/20 p-4 rounded-sm text-sm text-primary-foreground/90 font-medium leading-relaxed text-left space-y-4">
                  <div>
                    <strong className="block mb-1 text-white tracking-widest text-xs font-bold">Security & anonymity notice</strong>
                    Your anonymity is our first priority. All incoming intel is processed and analyzed by our team to create verified, actionable intelligence. To maintain the &quot;blind&quot; nature of this system, all transmissions undergo a mandatory scrub of any identifying data immediately upon submission.
                  </div>
                  
                  <div>
                    <strong className="block mb-1 text-white tracking-widest text-xs font-bold">Operational protocols</strong>
                    <ul className="mt-1 space-y-2">
                      <li><span className="font-bold text-white">Accuracy over emotion:</span> Reports must stick to verifiable facts. Avoid subjective interpretations, personal grievances, or speculative motives. We want verified data not opinion.</li>
                      <li><span className="font-bold text-white">Redaction mandate:</span> Never share personally identifiable information. You are required to redact sensitive data in all attachments and text before submission.</li>
                    </ul>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4 max-h-[50vh] overflow-y-auto px-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-bold text-primary/70">Location</Label>
                  <Input id="location" placeholder="City/Country" className="bg-slate-950/50 border-white/10 text-white font-bold h-10 rounded-sm" value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-bold text-primary/70">Classification</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-slate-950/50 border-white/10 text-white font-bold h-10 rounded-sm">
                      <SelectValue placeholder="Category..." />
                    </SelectTrigger>
                    <SelectContent className="glass">
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="Salary">Salary</SelectItem>
                      <SelectItem value="Housing">Housing</SelectItem>
                      <SelectItem value="Admin">Admin conduct</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organisation" className="text-sm font-bold text-primary/70">Organisation</Label>
                <Input id="organisation" placeholder="School or Agency..." className="bg-slate-950/50 border-white/10 text-white font-bold h-10 rounded-sm" value={organisation} onChange={(e) => setOrganisation(e.target.value)} onBlur={handleVerifySchool} />
                {validationStatus && <p className="text-[11px] font-bold text-accent">{validationStatus}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="intel" className="text-sm font-bold text-primary/70">Intel narrative</Label>
                <Textarea id="intel" placeholder="Enter data here..." className="min-h-[100px] bg-slate-950/50 border-white/10 text-white text-base rounded-sm" value={intel} onChange={(e) => setIntel(e.target.value)} />
              </div>

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="mt-1 border-white/20 data-[state=checked]:bg-primary data-[state=checked]:text-white" />
                <Label htmlFor="consent" className="text-xs text-white/70 font-bold tracking-tighter cursor-pointer leading-tight">
                  I have redacted all pii and acknowledge the operational protocols.
                </Label>
              </div>
            </div>

            <DialogFooter className="border-t border-white/5 pt-4">
              <Button onClick={handleTransmit} disabled={isSubmitting || !consent} className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-sm py-6 shadow-lg shadow-primary/10">
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4 mr-2" />}
                Transmit intel
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
