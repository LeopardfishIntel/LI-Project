"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { findNicheAction, NicheFinderState } from "./actions";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, Loader2, ServerCrash, Lightbulb } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
          Let our AI advisor match your profile to the perfect teaching destinations around the globe.
        </p>

        <Card className="bg-card/70 backdrop-blur-sm border-border">
          <form action={formAction}>
            <CardHeader>
              <CardTitle>Your Teacher Profile</CardTitle>
              <CardDescription>The more detail you provide, the better the recommendations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input id="age" name="age" type="number" placeholder="e.g., 32" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input id="nationality" name="nationality" placeholder="e.g., Canadian" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qualifications">Qualifications</Label>
                <Textarea id="qualifications" name="qualifications" placeholder="e.g., B.Ed, Master's in Physics, TEFL certified" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience">Teaching Experience</Label>
                <Textarea id="experience" name="experience" placeholder="e.g., 5 years teaching high school science, 2 years IB DP in Vietnam" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferences">Preferences</Label>
                <Textarea id="preferences" name="preferences" placeholder="e.g., Warm climate, high savings potential, good work-life balance, strong expat community" required />
              </div>
              <div className="space-y-2">
                <Label>What is your primary goal?</Label>
                <RadioGroup name="goal" defaultValue="balanced" className="flex flex-col sm:flex-row sm:flex-wrap gap-4 pt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="saving" id="saving" />
                    <Label htmlFor="saving">Maximize Savings</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="adventure" id="adventure" />
                    <Label htmlFor="adventure">Seek Adventure</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="growth" id="growth" />
                    <Label htmlFor="growth">Career Growth</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="balanced" id="balanced" />
                    <Label htmlFor="balanced">Balanced Lifestyle</Label>
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
