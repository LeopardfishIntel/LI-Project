'use client';

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldAlert, Send, Loader2, FileUp, Zap, Building2, Binoculars, MapPin, AlertCircle, CheckCircle2, Globe, ShieldCheck, Lock } from 'lucide-react';
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
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [consent, setConsent] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  
  // Disambiguation states
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState('');
  const [validationResult, setValidationResult] = useState<{
    is_ambiguous: boolean;
    is_new_entity: boolean;
    suggestions: string[];
    message_to_user: string;
    canonical_name: string;
    school_id?: string;
  } | null>(null);

  // Mission Impossible States
  const [isDestructing, setIsDestructing] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isSmoked, setIsSmoked] = useState(false);
  
  const { user } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();

  // Master Registry Cross-Reference
  const schoolsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'schools') : null),
    [firestore]
  );
  const { data: schoolsRegistry } = useCollection<School>(schoolsQuery);

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setIsScanning(true);
      setTimeout(() => {
        setIsScanning(false);
      }, 1500);
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
    setWebsiteUrl('');
    setConsent(false);
    setFile(null);
    setStatus('');
    setIsSubmitting(false);
    setValidationResult(null);
    setValidationStatus('');
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setIsOpen(true);
      setIsScanning(true);
      setTimeout(() => {
        setIsScanning(false);
      }, 1500);
    } else {
      setIsOpen(false);
    }
  };

  const handleVerifySchool = async () => {
    if (!organisation || !location) return;
    
    setIsValidating(true);
    setValidationResult(null);
    
    const statuses = [
      'Accessing Global Education Registry...',
      `Filtering signatures for ${organisation}...`,
      'Cross-referencing Ministry of Education records...',
    ];

    let statusIdx = 0;
    const interval = setInterval(() => {
      if (statusIdx < statuses.length) {
        setValidationStatus(statuses[statusIdx]);
        statusIdx++;
      } else {
        clearInterval(interval);
      }
    }, 600);

    try {
      const registry = schoolsRegistry?.map(s => ({ id: s.id, name: s.name })) || [];
      const result = await disambiguateSchool({
        user_input_school: organisation,
        user_input_city: location,
        verified_registry: registry,
      });
      
      clearInterval(interval);
      setValidationResult(result);
      setValidationStatus(result.message_to_user);
      
      if (!result.is_ambiguous && !result.is_new_entity && result.canonical_name !== organisation) {
        setOrganisation(result.canonical_name);
      }
    } catch (error) {
      console.error('Validation Error:', error);
      setValidationStatus('Registry uplink timed out.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleTransmit = async () => {
    if (!category || !organisation || !location || !intel) {
      toast({ variant: 'destructive', title: 'Input Required', description: 'Organisation, Location, Category, and Content are mandatory for transmission.' });
      return;
    }

    if (!consent) {
      toast({ variant: 'destructive', title: 'Consent Required', description: 'You must acknowledge the Security Briefing to transmit intel.' });
      return;
    }

    if (validationResult?.is_new_entity && !websiteUrl) {
      toast({ variant: 'destructive', title: 'URL Required', description: 'Please provide the school\'s official website URL for agent verification.' });
      return;
    }

    setIsSubmitting(true);
    setStatus('De-encrypting and Uploading...');

    try {
      let filePayload = undefined;
      if (file) {
        const base64 = await readFileAsBase64(file);
        filePayload = {
          base64,
          name: file.name,
          mimeType: file.type
        };
      }

      const token = await transmitIntelligence({
        category,
        organisation,
        location,
        content: intel,
        authorId: user?.uid,
        authorEmail: user?.email || undefined,
        file: filePayload
      } as any);

      if (token === 'Success') {
        setIsDestructing(true);
      }

    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Transmission Failed', description: 'Uplink lost. Check system logs.' });
      setIsSubmitting(false);
      setStatus('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          className="fixed bottom-6 right-6 h-14 w-14 hover:w-44 rounded-full shadow-2xl bg-primary hover:bg-primary/90 text-white z-50 p-0 transition-all duration-300 group overflow-hidden border-2 border-white/10 flex items-center justify-center"
          aria-label="File Field Intel"
        >
          <div className="flex items-center justify-center">
            <Binoculars className="size-8 shrink-0 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            <span className="max-w-0 group-hover:max-w-xs group-hover:ml-3 opacity-0 group-hover:opacity-100 transition-all duration-500 overflow-hidden whitespace-nowrap font-black uppercase tracking-widest text-[10px]">
              File Intel
            </span>
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className={cn(
        "sm:max-w-[550px] glass bg-background/95 border-primary/30 text-foreground transition-all duration-500",
        isSmoked && "animate-smoke"
      )}>
        {isScanning ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-6">
            <Loader2 className="size-12 text-primary animate-spin" />
            <div className="space-y-2">
              <DialogTitle className="text-xl font-black stamped-dossier text-primary animate-pulse">
                Scanning for Secure Uplink...
              </DialogTitle>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                Establishing Encrypted Tunnel
              </p>
            </div>
          </div>
        ) : isDestructing ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
            <Zap className="size-12 text-primary animate-pulse" />
            <DialogTitle className="text-2xl font-black stamped-dossier text-primary animate-glitch">
              TRANSMISSION COMPLETE
            </DialogTitle>
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-mono tracking-tighter">
                SECURE ARCHIVAL VERIFIED.
              </p>
              <p className="text-white font-black text-xl animate-glitch">
                THIS CONFIRMATION WILL SELF-DESTRUCT IN {countdown}...
              </p>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000 ease-linear" 
                style={{ width: `${(countdown / 5) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-primary flex items-center gap-2 stamped-dossier">
                <ShieldAlert className="size-5" /> Field Intel Report
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                Transmission Mode: Secure & Encrypted
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-sm">
                <p className="text-[9px] font-black uppercase text-destructive tracking-widest">Security Notice</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-1">Agent Anonymity is our first priority. Note: All intel is analysed and checked for transformation into actionable intelligence.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-[10px] uppercase tracking-widest font-black text-primary/70">Intel Location (City/Country)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input 
                    id="location" 
                    placeholder="e.g., Dubai, UAE" 
                    className="pl-10 bg-slate-950/50 border-white/10 focus:border-primary/50"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organisation" className="text-[10px] uppercase tracking-widest font-black text-primary/70">Target Organisation</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input 
                      id="organisation" 
                      placeholder="School or Agency Name..." 
                      className={cn(
                        "pl-10 bg-slate-950/50 border-white/10 focus:border-primary/50",
                        validationResult?.is_ambiguous && "border-amber-500/50"
                      )}
                      value={organisation}
                      onChange={(e) => setOrganisation(e.target.value)}
                      onBlur={handleVerifySchool}
                    />
                  </div>
                  {isValidating && <Loader2 className="size-4 animate-spin self-center text-primary" />}
                </div>
                
                {validationStatus && (
                  <div className={cn(
                    "flex items-center gap-2 p-2 rounded text-[9px] font-bold uppercase tracking-widest border",
                    isValidating ? "bg-primary/5 border-primary/20 text-primary" : 
                    validationResult?.is_ambiguous || validationResult?.is_new_entity ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                    "bg-green-500/5 border-green-500/20 text-green-500"
                  )}>
                    {isValidating ? <Loader2 className="size-3 animate-spin" /> : 
                     validationResult?.is_ambiguous || validationResult?.is_new_entity ? <AlertCircle className="size-3" /> : 
                     <CheckCircle2 className="size-3" />}
                    <span>{validationStatus}</span>
                  </div>
                )}

                {validationResult?.is_ambiguous && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {validationResult.suggestions.map((s, i) => (
                      <Button 
                        key={i} 
                        variant="outline" 
                        size="sm" 
                        className="h-6 text-[9px] py-0 px-2 border-amber-500/30 hover:bg-amber-500/20"
                        onClick={() => {
                          setOrganisation(s);
                          setValidationResult(null);
                          setValidationStatus(`Signature confirmed: ${s}`);
                        }}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                )}

                {validationResult?.is_new_entity && (
                  <div className="space-y-2 pt-2 animate-in slide-in-from-top-2 duration-300">
                    <Label htmlFor="websiteUrl" className="text-[10px] uppercase tracking-widest font-black text-amber-500/70">Official Website URL</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input 
                        id="websiteUrl" 
                        placeholder="https://www.schoolname.com" 
                        className="pl-10 bg-slate-950/50 border-amber-500/20 focus:border-amber-500/50"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-[10px] uppercase tracking-widest font-black text-primary/70">Report Classification</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category" className="bg-slate-950/50 border-white/10">
                    <SelectValue placeholder="Select high-priority category..." />
                  </SelectTrigger>
                  <SelectContent className="glass">
                    <SelectItem value="Contract Red Flag">Contract Red Flag</SelectItem>
                    <SelectItem value="Salary Discrepancy">Salary Discrepancy</SelectItem>
                    <SelectItem value="Living Cost Alert">Living Cost Alert</SelectItem>
                    <SelectItem value="Admin Conduct">Admin Conduct</SelectItem>
                    <SelectItem value="Housing Standards">Housing Standards</SelectItem>
                    <SelectItem value="Recruitment Transparency">Recruitment Transparency</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="intel" className="text-[10px] uppercase tracking-widest font-black text-primary/70">Intel Narrative</Label>
                <Textarea 
                  id="intel" 
                  placeholder="Provide specific, evidence-led details regarding your experience..." 
                  className="min-h-[100px] bg-slate-950/50 border-white/10 focus:border-primary/50 text-sm"
                  value={intel}
                  onChange={(e) => setIntel(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest font-black text-primary/70">Evidence (Attachments)</Label>
                <div className="relative border-2 border-dashed border-white/5 rounded p-3 flex flex-col items-center justify-center bg-slate-950/20 hover:bg-slate-950/40 transition-colors cursor-pointer group">
                  <FileUp className={cn("size-6 mb-1 transition-colors", file ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest text-center">
                    {file ? file.name : "Upload Dossier Evidence (JPEG/PDF)"}
                  </span>
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest font-black text-primary/70 flex items-center gap-2">
                  <ShieldCheck className="size-3" /> Security Briefing & Protocol
                </Label>
                <div className="border border-white/10 rounded-sm bg-slate-950/40 overflow-hidden">
                  <ScrollArea className="h-40 p-3 text-[10px] leading-relaxed text-muted-foreground font-mono">
                    <div className="space-y-4">
                      <section>
                        <h4 className="text-white font-bold uppercase mb-1 underline decoration-primary">1. Submission Guidelines</h4>
                        <p className="text-white/80 font-bold mb-2">Protocol for Field Intel (L.F.I. Reporting)</p>
                        <ul className="list-disc list-inside space-y-1 pl-1">
                          <li><strong>Accuracy Over Emotion</strong>: Stick to verifiable facts regarding contracts, housing, and management. Specific data points (e.g., "Salary delayed by 10 days in Oct/Nov") are prioritized.</li>
                          <li><strong>The "GEMS" Specificity Rule</strong>: When reporting on large groups, you must identify the specific branch. Ambiguous reports will be returned for clarification.</li>
                          <li><strong>Redaction Mandatory</strong>: Before uploading any "Evidence" (contracts, emails, handbooks), you must black out your name, passport number, and bank details.</li>
                          <li><strong>No Defamation</strong>: Avoid naming specific individual colleagues or mid-level staff. Focus on Institutional Conduct.</li>
                          <li><strong>Verification Status</strong>: Reports accompanied by a redacted contract or benefit summary will receive a "Verified Intel" badge.</li>
                        </ul>
                      </section>
                      <section>
                        <h4 className="text-white font-bold uppercase mb-1 underline decoration-primary">2. Privacy Disclaimer</h4>
                        <p className="text-white/80 font-bold mb-2">Data Security & Identity Protection Notice</p>
                        <ul className="list-disc list-inside space-y-1 pl-1">
                          <li><strong>Identity Masking</strong>: By default, all transmissions are stripped of metadata. System usernames are never linked to public reports.</li>
                          <li><strong>Zero-Trace Storage</strong>: We do not sell, lease, or trade teacher data to any external bodies. Information is used solely to alert the community.</li>
                          <li><strong>Encrypted Uplink</strong>: All file uploads are stored in an isolated, encrypted bucket accessible only to L.F.I. Command analysts.</li>
                          <li><strong>Right to Extraction</strong>: You maintain ownership of your intel. You may request a "Signal Wipe" (deletion) at any time.</li>
                          <li><strong>Metadata Scrubbing</strong>: Our system automatically attempts to scrub EXIF data from uploaded images to prevent identification.</li>
                        </ul>
                      </section>
                    </div>
                  </ScrollArea>
                </div>
              </div>

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox 
                  id="consent" 
                  checked={consent} 
                  onCheckedChange={(checked) => setConsent(!!checked)} 
                  className="mt-1 border-white/20 data-[state=checked]:bg-primary" 
                />
                <Label htmlFor="consent" className="text-[10px] text-white font-bold uppercase tracking-tighter leading-tight cursor-pointer">
                  I have redacted all PII and acknowledge the Security Briefing.
                </Label>
              </div>

              {status && (
                <div className="flex items-center gap-2 p-2 rounded bg-primary/5 border border-primary/20">
                  <Loader2 className="size-3 animate-spin text-primary" />
                  <span className="text-[9px] font-black uppercase text-primary tracking-widest">{status}</span>
                </div>
              )}
            </div>

            <DialogFooter className="border-t border-white/5 pt-4">
              <Button 
                onClick={handleTransmit} 
                disabled={isSubmitting || validationResult?.is_ambiguous || !consent}
                className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-sm py-6 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Lock className="size-4" />
                )}
                Initialize Transmission
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
