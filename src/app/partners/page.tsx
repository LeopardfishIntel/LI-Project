"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, ServerCrash, CheckCircle } from "lucide-react";
import { submitInquiry, type InquiryState } from "./actions";

const initialState: InquiryState = { message: null, error: null, success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="bg-[#f97316] hover:bg-white hover:text-black transition-all font-black uppercase tracking-widest px-8 h-12 rounded-none">
      {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <><Send className="mr-2 h-4 w-4" /> Submit Request</>}
    </Button>
  );
}

export default function PartnersPage() {
  const [inquiryType, setInquiryType] = useState("teacher");
  const [state, formAction] = useActionState(submitInquiry, initialState);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 bg-[#020617] min-h-screen font-sans selection:bg-[#f97316]">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic">
            Connect with <span className="text-[#f97316]">Leopardfish Intel</span>
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Independent Intelligence for the Global Education Community.</p>
        </div>

        <Card className="bg-[#0b1224]/50 border-white/5 backdrop-blur-md rounded-none">
          <form action={formAction}>
            <CardHeader className="border-b border-white/5 mb-8">
              <CardTitle className="text-white uppercase font-black italic text-xl">Inquiry Protocol</CardTitle>
              <CardDescription className="text-slate-500 font-bold uppercase text-[10px]">Verify your identity and requirements below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <Label className="text-[#007FFF] font-black uppercase tracking-widest text-[10px]">Identify Profile</Label>
                <RadioGroup name="inquiryType" value={inquiryType} onValueChange={setInquiryType} className="flex flex-wrap gap-8 pt-2">
                  {['teacher', 'school', 'provider'].map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <RadioGroupItem value={type} id={type} className="border-[#f97316]" />
                      <Label htmlFor={type} className="text-white font-black uppercase text-[11px] cursor-pointer italic">{type === 'teacher' ? 'International Teacher' : type === 'school' ? 'School Official' : 'Service Provider'}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-600 font-black uppercase text-[9px]">Full Name</Label>
                  <Input id="name" name="name" className="bg-black/40 border-white/10 text-white font-bold h-12 uppercase rounded-none" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-600 font-black uppercase text-[9px]">Direct Email</Label>
                  <Input id="email" name="email" type="email" className="bg-black/40 border-white/10 text-white font-bold h-12 uppercase rounded-none" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organisation" className="text-slate-600 font-black uppercase text-[9px]">Organisation / Institution</Label>
                <Input id="organisation" name="organisation" className="bg-black/40 border-white/10 text-white font-bold h-12 uppercase rounded-none" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-slate-600 font-black uppercase text-[9px]">Intelligence Requirements</Label>
                <Textarea id="message" name="message" className="min-h-[150px] bg-black/40 border-white/10 text-white font-bold uppercase rounded-none" required />
              </div>
            </CardContent>
            <CardFooter className="flex-col items-start gap-6 border-t border-white/5 mt-8 pt-8">
              <SubmitButton />
              {state.error && <div className="text-red-500 text-[11px] font-black uppercase flex items-center gap-2 italic"><ServerCrash className="h-4 w-4" /> Error: {state.error}</div>}
              {state.success && <div className="text-green-400 text-[11px] font-black uppercase flex items-center gap-2 italic bg-green-400/5 p-4 border border-green-400/20 w-full"><CheckCircle className="h-4 w-4" /> {state.message}</div>}
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}