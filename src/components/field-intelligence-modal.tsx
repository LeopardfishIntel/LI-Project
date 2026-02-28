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
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ShieldAlert, Send, Loader2, FileUp, Zap } from 'lucide-react';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { transmitIntelligence } from '@/ai/flows/transmit-intelligence-flow';
import { cn } from '@/lib/utils';

export function FieldIntelligenceModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<string>('');
  const [intel, setIntel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  
  // Mission Impossible States
  const [isDestructing, setIsDestructing] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isSmoked, setIsSmoked] = useState(false);
  
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isDestructing && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (isDestructing && countdown === 0) {
      setIsSmoked(true);
      setTimeout(() => {
        setIsOpen(false);
        // Reset state after transition
        setIsDestructing(false);
        setIsSmoked(false);
        setCountdown(5);
        setCategory('');
        setIntel('');
        setFile(null);
        setStatus('');
        setIsSubmitting(false);
      }, 800);
    }
    return () => clearTimeout(timer);
  }, [isDestructing, countdown]);

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
    if (!category || !intel) {
      toast({ variant: 'destructive', title: 'Input Required', description: 'Category and content are mandatory for transmission.' });
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
        content: intel,
        authorId: user?.uid,
        file: filePayload
      });

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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          className="fixed bottom-6 right-6 size-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-white z-50 p-0"
          aria-label="Submit Field Intel"
        >
          <ShieldAlert className="size-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className={cn(
        "sm:max-w-[500px] glass bg-background/95 border-primary/30 text-foreground transition-all duration-500",
        isSmoked && "animate-smoke"
      )}>
        {isDestructing ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
            <Zap className="size-12 text-primary animate-pulse" />
            <h2 className="text-2xl font-black stamped-dossier text-primary animate-glitch">
              TRANSMISSION COMPLETE
            </h2>
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
                <ShieldAlert className="size-5" /> Field Intelligence Report
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Submit anonymous intelligence regarding contract discrepancies or school conduct.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs uppercase tracking-widest font-black text-primary/70">Report Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category" className="bg-slate-950/50 border-white/10">
                    <SelectValue placeholder="Select high-priority category..." />
                  </SelectTrigger>
                  <SelectContent className="glass">
                    <SelectItem value="Contract Red Flag">Contract Red Flag</SelectItem>
                    <SelectItem value="Salary Discrepancy">Salary Discrepancy</SelectItem>
                    <SelectItem value="Living Cost Alert">Living Cost Alert</SelectItem>
                    <SelectItem value="Admin Conduct">Admin Conduct</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="intel" className="text-xs uppercase tracking-widest font-black text-primary/70">Intel Narrative</Label>
                <Textarea 
                  id="intel" 
                  placeholder="Provide specific, evidence-led details..." 
                  className="min-h-[120px] bg-slate-950/50 border-white/10 focus:border-primary/50"
                  value={intel}
                  onChange={(e) => setIntel(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest font-black text-primary/70">Attachments</Label>
                <div className="relative border-2 border-dashed border-white/5 rounded-lg p-4 flex flex-col items-center justify-center bg-slate-950/20 hover:bg-slate-950/40 transition-colors cursor-pointer group">
                  <FileUp className={cn("size-8 mb-2 transition-colors", file ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest text-center">
                    {file ? file.name : "Upload Dossier Evidence (JPEG/PDF)"}
                  </span>
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                </div>
              </div>

              {status && (
                <div className="flex items-center gap-2 p-3 rounded bg-primary/5 border border-primary/20">
                  <Loader2 className="size-3 animate-spin text-primary" />
                  <span className="text-[10px] font-black uppercase text-primary tracking-widest">{status}</span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button 
                onClick={handleTransmit} 
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-sm py-6"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : (
                  <Send className="size-4 mr-2" />
                )}
                Transmit Intel
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}