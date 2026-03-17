"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useState } from "react";
import { findFitAction, FitFinderState } from "./actions";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wand2, Loader2, ServerCrash, Lightbulb, Building } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { School } from '@/lib/types';
import { collection } from 'firebase/firestore';

const initialState: FitFinderState = {
  result: null,
  error: null,
  pending: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full md:w-auto bg-[#f97316] hover:bg-[#f97316]/90 text-white font-black uppercase tracking-widest h-12 px-10 rounded-sm border-0 shadow-lg shadow-[#f97316]/10">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Analyzing...
        </>
      ) : (
        "Find my fit"
      )}
    </Button>
  );
}

export default function FindYourFitPage() {
  const [state, formAction] = useActionState(findFitAction, initialState);
  const [otherLicense, setOtherLicense] = useState(false);

  const firestore = useFirestore();
  const schoolsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'schools') : null),
    [firestore]
  );
  const { data: schools } = useCollection<School>(schoolsQuery);

  return (
    <div className="container mx-auto px-4 md:px-6 py-0 bg-[#020617]">
      <div className="max-w-3xl mx-auto pt-4 pb-12">
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-center normal-case text-white mb-4 uppercase">
          1. Find your fit
        </h1>
        <p className="text-muted-foreground text-center mt-4 mb-12 max-w-2xl mx-auto font-black uppercase text-[10px] tracking-[0.3em] opacity-60">Your profile, our direction. We’ve replaced guesswork with data-driven insights.</p>

        <Card className="glass border-white/10">
          <form action={formAction}>
            <input 
                type="hidden" 
                name="availableSchools" 
                value={schools ? JSON.stringify(schools.map(({ id, name, country, curriculum }) => ({ id, name, country, curriculum }))) : '[]'}
            />
            <CardHeader>
              <CardTitle className="normal-case font-black tracking-tighter text-white text-xl">Your teacher profile</CardTitle>
              <CardDescription className="text-muted-foreground font-medium">The more detail you provide, the better the analysis.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-[#f97316]">Age range</Label>
                <RadioGroup name="age" defaultValue="35" className="flex flex-wrap gap-x-6 gap-y-4 pt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="25" id="age-25-34" className="border-white/20 text-[#f97316]" />
                    <Label htmlFor="age-25-34" className="font-bold text-white">25-34</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="35" id="age-35-49" className="border-white/20 text-[#f97316]" />
                    <Label htmlFor="age-35-49" className="font-bold text-white">35-49</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="50" id="age-50-64" className="border-white/20 text-[#f97316]" />
                    <Label htmlFor="age-50-64" className="font-bold text-white">50-64</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="65" id="age-65-plus" className="border-white/20 text-[#f97316]" />
                    <Label htmlFor="age-65-plus" className="font-bold text-white">65+</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2 pt-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-[#f97316]">Family status</Label>
                <RadioGroup name="familyStatus" defaultValue="single" className="flex flex-wrap gap-x-6 gap-y-4 pt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="single" id="fs-single" className="border-white/20 text-[#f97316]" />
                    <Label htmlFor="fs-single" className="font-bold text-white">Single</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="couple" id="fs-couple" className="border-white/20 text-[#f97316]" />
                    <Label htmlFor="fs-couple" className="font-bold text-white">Couple</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="family" id="fs-family" className="border-white/20 text-[#f97316]" />
                    <Label htmlFor="fs-family" className="font-bold text-white">Family with children</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="current-location" className="text-[10px] font-black uppercase tracking-widest text-[#f97316]">Current location</Label>
                    <Input id="current-location" name="currentLocation" placeholder="e.g., London, UK" className="bg-[#020617]/50 border-white/10 rounded-sm font-bold h-11" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="current-salary" className="text-[10px] font-black uppercase tracking-widest text-[#f97316]">Current salary (optional)</Label>
                    <Input id="current-salary" name="currentSalary" placeholder="e.g., $55,000 USD" className="bg-[#020617]/50 border-white/10 rounded-sm font-bold h-11" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-[#f97316]">Qualifications</Label>
                 <div className="space-y-2 pt-2">
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="q_pgce" name="qualifications_cb" value="PGCE/iPGCE" className="border-white/20 data-[state=checked]:bg-[#f97316]" />
                            <Label htmlFor="q_pgce" className="font-bold text-white">PGCE/iPGCE</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="q_bed" name="qualifications_cb" value="B.Ed" className="border-white/20 data-[state=checked]:bg-[#f97316]" />
                            <Label htmlFor="q_bed" className="font-bold text-white">B.Ed</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="q_bachelors" name="qualifications_cb" value="Bachelor's Degree" className="border-white/20 data-[state=checked]:bg-[#f97316]" />
                            <Label htmlFor="q_bachelors" className="font-bold text-white">Bachelor's Degree</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="q_masters" name="qualifications_cb" value="Master's Degree" className="border-white/20 data-[state=checked]:bg-[#f97316]" />
                            <Label htmlFor="q_masters" className="font-bold text-white">Master's Degree</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="q_npqsl" name="qualifications_cb" value="NPQSL" className="border-white/20 data-[state=checked]:bg-[#f97316]" />
                            <Label htmlFor="q_npqsl" className="font-bold text-white">NPQSL</Label>
                        </div>
                    </div>
                </div>
              </div>
              
              {/* Other form fields standardisation... */}
              <div className="space-y-2 pt-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-[#f97316]">Goal selection</Label>
                <RadioGroup name="goal" defaultValue="balanced" className="flex flex-col sm:flex-row sm:flex-wrap gap-4 pt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="saving" id="saving" className="border-white/20 text-[#f97316]" />
                    <Label htmlFor="saving" className="font-bold text-white">Maximize savings</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="adventure" id="adventure" className="border-white/20 text-[#f97316]" />
                    <Label htmlFor="adventure" className="font-bold text-white">Seek adventure</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="growth" id="growth" className="border-white/20 text-[#f97316]" />
                    <Label htmlFor="growth" className="font-bold text-white">Career growth</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="balanced" id="balanced" className="border-white/20 text-[#f97316]" />
                    <Label htmlFor="balanced" className="font-bold text-white">Balanced lifestyle</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
            <CardFooter className="flex-col items-start gap-4">
              <div className="w-full space-y-2">
                <SubmitButton />
                <p className="text-[9px] text-muted-foreground pt-1 font-bold uppercase tracking-widest opacity-40">
                    Leopardfish Intel operates with complete impartiality. Verify latest visa requirements with official authorities.
                </p>
              </div>
            </CardFooter>
          </form>
        </Card>

        {state.error && (
            <Card className="mt-8 border-destructive/20 bg-destructive/5 rounded-sm">
                <CardHeader className="flex-row items-center gap-4 space-y-0">
                    <ServerCrash className="h-6 w-6 text-destructive" />
                    <CardTitle className="text-destructive font-black tracking-tighter normal-case">An error occurred</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive/80 font-bold text-sm">{state.error}</p>
                </CardContent>
            </Card>
        )}

        {state.result && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl md:text-4xl font-black tracking-tighter text-center normal-case text-white mb-8 uppercase">Your recommended fits</h2>
            <div className="space-y-6">
              {state.result.recommendations.map((rec, index) => (
                <Card key={index} className="glass border-white/5 rounded-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 normal-case font-black tracking-tighter text-white text-2xl">
                        <Lightbulb className="h-6 w-6 text-[#f97316]" />
                        {rec.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-muted-foreground leading-relaxed font-medium text-sm md:text-base">{rec.reasoning}</p>
                    {rec.recommendedSchools && rec.recommendedSchools.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-white/5">
                            <h4 className="font-black mb-4 text-xs flex items-center gap-3 text-[#f97316] uppercase tracking-[0.3em]">
                                <Building className="size-4" />
                                School suggestions
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {rec.recommendedSchools.map(school => (
                                    <div key={school.id} className="p-5 bg-white/2 rounded-sm border border-white/5 hover:border-[#f97316]/30 transition-all group">
                                        <Link href={`/schools/${school.id}`} className="font-black text-white hover:text-[#f97316] transition-colors text-lg tracking-tight uppercase">
                                            {school.name}
                                        </Link>
                                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-medium opacity-80">{school.reasoning}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}