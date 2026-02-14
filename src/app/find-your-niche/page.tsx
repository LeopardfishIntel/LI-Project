"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { findNicheAction, NicheFinderState } from "./actions";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wand2, Loader2, ServerCrash, Lightbulb } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

const initialState: NicheFinderState = {
  result: null,
  error: null,
  pending: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full md:w-auto">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Analyzing...
        </>
      ) : (
        <>
          <Wand2 className="mr-2 h-4 w-4" />
          Find My Niche
        </>
      )}
    </Button>
  );
}

export default function FindYourNichePage() {
  const [state, formAction] = useActionState(findNicheAction, initialState);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-center">Find Your Niche</h1>
        <p className="text-muted-foreground text-center mt-4 mb-8">
          Match your profile to the perfect teaching destinations around the globe.
        </p>

        <Card className="bg-card/70 backdrop-blur-sm border-border">
          <form action={formAction}>
            <CardHeader>
              <CardTitle>Your Teacher Profile</CardTitle>
              <CardDescription>The more detail you provide, the better the analysis.</CardDescription>
              <p className="text-xs text-muted-foreground pt-1">Please note: Recommendations only consider typical government visa and immigration regulations which are subject to change. Always verify current requirements with official sources.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Age Range</Label>
                  <RadioGroup name="age" defaultValue="35" className="flex flex-wrap gap-x-6 gap-y-4 pt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="25" id="age-25-34" />
                      <Label htmlFor="age-25-34" className="font-normal">25-34</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="35" id="age-35-49" />
                      <Label htmlFor="age-35-49" className="font-normal">35-49</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="50" id="age-50-64" />
                      <Label htmlFor="age-50-64" className="font-normal">50-64</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="65" id="age-65-plus" />
                      <Label htmlFor="age-65-plus" className="font-normal">65+</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input id="nationality" name="nationality" placeholder="e.g., Canadian" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Qualifications</Label>
                 <div className="space-y-2 pt-2">
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="q_pgce" name="qualifications_cb" value="PGCE/iPGCE" />
                            <Label htmlFor="q_pgce" className="font-normal">PGCE/iPGCE</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="q_bed" name="qualifications_cb" value="B.Ed" />
                            <Label htmlFor="q_bed" className="font-normal">B.Ed</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="q_masters" name="qualifications_cb" value="Master's Degree" />
                            <Label htmlFor="q_masters" className="font-normal">Master's Degree</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="q_npqsl" name="qualifications_cb" value="NPQSL" />
                            <Label htmlFor="q_npqsl" className="font-normal">NPQSL</Label>
                        </div>
                    </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Teaching License</Label>
                 <div className="space-y-2 pt-2">
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="l_qts" name="teaching_license_cb" value="QTS or iQTS" />
                            <Label htmlFor="l_qts" className="font-normal">QTS or iQTS</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="l_us" name="teaching_license_cb" value="US State Teaching License" />
                            <Label htmlFor="l_us" className="font-normal">US State Teaching License</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="l_sace" name="teaching_license_cb" value="SACE / OCT / VIT" />
                            <Label htmlFor="l_sace" className="font-normal">SACE / OCT / VIT</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="l_ect" name="teaching_license_cb" value="ECT Status" />
                            <Label htmlFor="l_ect" className="font-normal">ECT Status</Label>
                        </div>
                    </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="experience">Years of Teaching Experience</Label>
                  <Input id="experience" name="experience" type="number" placeholder="e.g., 5" required min="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject Taught</Label>
                  <Input id="subject" name="subject" placeholder="e.g., High School Physics" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Preferences</Label>
                 <div className="flex flex-wrap gap-x-6 gap-y-4 pt-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="p_warm" name="preferences" value="Warm climate" />
                        <Label htmlFor="p_warm" className="font-normal">Warm climate</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="p_savings" name="preferences" value="High savings potential" />
                        <Label htmlFor="p_savings" className="font-normal">High savings potential</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="p_balance" name="preferences" value="Good work-life balance" />
                        <Label htmlFor="p_balance" className="font-normal">Good work-life balance</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="p_expat" name="preferences" value="Strong expat community" />
                        <Label htmlFor="p_expat" className="font-normal">Strong expat community</Label>
                    </div>
                     <div className="flex items-center space-x-2">
                        <Checkbox id="p_urban" name="preferences" value="Urban environment" />
                        <Label htmlFor="p_urban" className="font-normal">Urban environment</Label>
                    </div>
                     <div className="flex items-center space-x-2">
                        <Checkbox id="p_adventure" name="preferences" value="Outdoor/Adventure" />
                        <Label htmlFor="p_adventure" className="font-normal">Outdoor/Adventure</Label>
                    </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>What is your primary goal?</Label>
                <RadioGroup name="goal" defaultValue="balanced" className="flex flex-col sm:flex-row sm:flex-wrap gap-4 pt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="saving" id="saving" />
                    <Label htmlFor="saving" className="font-normal">Maximize Savings</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="adventure" id="adventure" />
                    <Label htmlFor="adventure" className="font-normal">Seek Adventure</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="growth" id="growth" />
                    <Label htmlFor="growth" className="font-normal">Career Growth</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="balanced" id="balanced" />
                    <Label htmlFor="balanced" className="font-normal">Balanced Lifestyle</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
            <CardFooter>
              <SubmitButton />
            </CardFooter>
          </form>
        </Card>

        {state.error && (
            <Card className="mt-8 border-destructive bg-destructive/20">
                <CardHeader className="flex-row items-center gap-4 space-y-0">
                    <ServerCrash className="h-6 w-6 text-destructive" />
                    <CardTitle className="text-destructive">An Error Occurred</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive/80">{state.error}</p>
                </CardContent>
            </Card>
        )}

        {state.result && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-center mb-6">Your Recommended Niches</h2>
            <div className="space-y-6">
              {state.result.recommendations.map((rec, index) => (
                <Card key={index} className="bg-card/70 backdrop-blur-sm border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-6 w-6 text-amber-400" />
                        {rec.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{rec.reasoning}</p>
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
