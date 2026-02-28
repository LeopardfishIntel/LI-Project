
'use client';

import React, { useState } from 'react';
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
import { ShieldAlert, Send, Loader2, FileUp, Sparkles } from 'lucide-react';
import { analyseIntelStream } from '@/ai/flows/analyse-intel-flow';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function FieldIntelligenceModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<string>('');
  const [intel, setIntel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysis, setAnalysis] = useState('');
  
  const { firestore } = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const handleTransmit = async () => {
    if (!category || !intel) {
      toast({ variant: 'destructive', title: 'Input Required', description: 'Category and content are mandatory for transmission.' });
      return;
    }

    setIsSubmitting(true);
    setAnalysis('');

    try {
      // 1. Trigger Genkit Stream Analysis
      const { stream } = await analyseIntelStream({ category, content: intel });
      
      let fullAnalysis = '';
      for await (const chunk of stream) {
        fullAnalysis += chunk.text;
        setAnalysis(fullAnalysis);
      }

      // 2. Submit to Firestore
      if (firestore) {
        const intelRef = collection(firestore, 'field_intel');
        addDocumentNonBlocking(intelRef, {
          category,
          content: intel,
          analysis: fullAnalysis,
          timestamp: serverTimestamp(),
          authorId: user?.uid || 'anonymous',
        });
      }

      toast({ title: 'Intelligence Transmitted', description: 'Your report has been securely logged.' });
      
      // Delay closing to let the user read analysis
      setTimeout(() => {
        setIsOpen(false);
        setCategory('');
        setIntel('');
        setAnalysis('');
        setIsSubmitting(false);
      }, 3000);

    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Transmission Failed', description: 'Signal lost. Check uplink and retry.' });
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          className="fixed bottom-6 right-6 size-14 rounded-full shadow-glow animate-pulse bg-primary hover:bg-primary/90 text-white z-50 p-0"
          aria-label="Submit Field Intel"
        >
          <ShieldAlert className="size-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] glass bg-background/95 border-primary/30 text-foreground">
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
            <div className="border-2 border-dashed border-white/5 rounded-lg p-4 flex flex-col items-center justify-center bg-slate-950/20 hover:bg-slate-950/40 transition-colors cursor-pointer group">
              <FileUp className="size-8 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Upload Dossier Evidence (JPEG/PDF)</span>
              <input type="file" className="hidden" />
            </div>
          </div>

          {analysis && (
            <div className="p-4 rounded bg-primary/5 border border-primary/20 space-y-2">
              <h4 className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                <Sparkles className="size-3" /> AI Tactical Analysis
              </h4>
              <p className="text-xs leading-relaxed text-muted-foreground italic">
                {analysis}
              </p>
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
      </DialogContent>
    </Dialog>
  );
}
