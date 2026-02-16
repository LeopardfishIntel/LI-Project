"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useState } from "react";
import { findNookAction, NookFinderState } from "./actions";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wand2, Loader2, ServerCrash, Lightbulb, GraduationCap } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const initialState: NookFinderState = {
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
          Find My Nook
        </>
      )}
    </Button>
  );
}

export default function FindYourNookPage() {
  const [state, formAction] = useActionState(findNookAction, initialState);
  const [otherLicense, setOtherLicense] = useState(false);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-center">Find Your Nook</h1>
        <p className="text-muted-foreground text-center mt-4 mb-12 max-w-2xl mx-auto">Our AI-powered tool analyzes your profile to recommend the best regions and schools for your next career move.</p>

        <Card className="bg-card/70 backdrop-blur-sm border-border">
          <form action={formAction}>
            <CardHeader>
              <CardTitle>Your Teacher Profile</CardTitle>
              <CardDescription>The more detail you provide, the better the analysis.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
              <div className="space-y-2 pt-4">
                <Label>Family Status</Label>
                <RadioGroup name="familyStatus" defaultValue="single" className="flex flex-wrap gap-x-6 gap-y-4 pt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="single" id="fs-single" />
                    <Label htmlFor="fs-single" className="font-normal">Single</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="couple" id="fs-couple" />
                    <Label htmlFor="fs-couple" className="font-normal">Couple</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="family" id="fs-family" />
                    <Label htmlFor="fs-family" className="font-normal">Family with Children</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="current-location">Current Location</Label>
                    <Input id="current-location" name="currentLocation" placeholder="e.g., London, UK" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="current-salary">Current Salary (Optional)</Label>
                    <Input id="current-salary" name="currentSalary" placeholder="e.g., $55,000 USD" />
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
                            <Checkbox id="q_bachelors" name="qualifications_cb" value="Bachelor's Degree" />
                            <Label htmlFor="q_bachelors" className="font-normal">Bachelor's Degree</Label>
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
                        <div className="flex items-center space-x-2">
                            <Checkbox id="l_other" onCheckedChange={(checked) => setOtherLicense(!!checked)} />
                            <Label htmlFor="l_other" className="font-normal">Other</Label>
                        </div>
                    </div>
                </div>
                 {otherLicense && (
                    <div className="space-y-2 pl-2 pt-2">
                        <Label htmlFor="teaching_license_other" className="text-xs text-muted-foreground">Please specify your license</Label>
                        <Input id="teaching_license_other" name="teaching_license_other" placeholder="e.g., Special Education Certificate" />
                    </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Curriculum Preference</Label>
                 <div className="flex flex-wrap gap-x-6 gap-y-4 pt-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="c_uk" name="curriculum" value="UK" />
                        <Label htmlFor="c_uk" className="font-normal">UK</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="c_us" name="curriculum" value="US" />
                        <Label htmlFor="c_us" className="font-normal">US</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="c_ib" name="curriculum" value="IB" />
                        <Label htmlFor="c_ib" className="font-normal">IB</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="c_other" name="curriculum" value="Other" />
                        <Label htmlFor="c_other" className="font-normal">Other</Label>
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
                  <Select name="subject" defaultValue="Primary" required>
                    <SelectTrigger id="subject">
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Early Years">Early Years</SelectItem>
                      <SelectItem value="Primary">Primary</SelectItem>
                      <SelectItem value="Other Primary">Other Primary</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Maths">Maths</SelectItem>
                      <SelectItem value="Science (General)">Science (General)</SelectItem>
                      <SelectItem value="Biology">Biology</SelectItem>
                      <SelectItem value="Chemistry">Chemistry</SelectItem>
                      <SelectItem value="Physics">Physics</SelectItem>
                      <SelectItem value="Humanities / Social Studies">Humanities / Social Studies</SelectItem>
                      <SelectItem value="History">History</SelectItem>
                      <SelectItem value="Geography">Geography</SelectItem>
                      <SelectItem value="Modern Foreign Languages (MFL)">Modern Foreign Languages (MFL)</SelectItem>
                      <SelectItem value="Art & Design">Art & Design</SelectItem>
                      <SelectItem value="Music">Music</SelectItem>
                      <SelectItem value="Drama / Theatre">Drama / Theatre</SelectItem>
                      <SelectItem value="Physical Education (PE)">Physical Education (PE)</SelectItem>
                      <SelectItem value="Design & Technology (DT)">Design & Technology (DT)</SelectItem>
                      <SelectItem value="Computer Science / IT">Computer Science / IT</SelectItem>
                      <SelectItem value="EAL/ESL">EAL / ESL</SelectItem>
                      <SelectItem value="Special Education (SEN)">Special Education (SEN)</SelectItem>
                      <SelectItem value="Leadership">Leadership</SelectItem>
                      <SelectItem value="Other Secondary">Other Secondary</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Preferred Regions</Label>
                 <div className="flex flex-wrap gap-x-6 gap-y-4 pt-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="r_sea" name="regions" value="Southeast Asia" />
                        <Label htmlFor="r_sea" className="font-normal">Southeast Asia</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="r_ea" name="regions" value="East Asia" />
                        <Label htmlFor="r_ea" className="font-normal">East Asia</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="r_me" name="regions" value="Middle East" />
                        <Label htmlFor="r_me" className="font-normal">Middle East</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="r_eu" name="regions" value="Europe" />
                        <Label htmlFor="r_eu" className="font-normal">Europe</Label>
                    </div>
                     <div className="flex items-center space-x-2">
                        <Checkbox id="r_af" name="regions" value="Africa" />
                        <Label htmlFor="r_af" className="font-normal">Africa</Label>
                    </div>
                     <div className="flex items-center space-x-2">
                        <Checkbox id="r_na" name="regions" value="North America" />
                        <Label htmlFor="r_na" className="font-normal">North America</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="r_sca" name="regions" value="South & Central America" />
                        <Label htmlFor="r_sca" className="font-normal">South & Central America</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="r_oc" name="regions" value="Oceania" />
                        <Label htmlFor="r_oc" className="font-normal">Oceania</Label>
                    </div>
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
                    <div className="flex items-center space-x-2">
                        <Checkbox id="p_culture" name="preferences" value="Cultural immersion" />
                        <Label htmlFor="p_culture" className="font-normal">Cultural Immersion</Label>
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
            <CardFooter className="flex-col items-start gap-4">
              <div className="w-full space-y-2">
                <SubmitButton />
                <p className="text-xs text-muted-foreground pt-1">
                    Leopardfish Intel operates with complete impartiality. While our suggestions are strictly aligned with current international immigration and visa regulations, we remain independent of individual country and school recruitment policies. We advise all teachers to verify the latest requirements with the relevant official authorities.
                </p>
              </div>
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
            <h2 className="text-2xl font-bold text-center mb-6">Your Recommended Nooks</h2>
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
                    {rec.recommendedSchools && rec.recommendedSchools.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-border/50">
                            <h4 className="font-semibold mb-3 text-base flex items-center gap-2">
                                <GraduationCap className="h-5 w-5 text-primary" />
                                School Suggestions
                            </h4>
                            <div className="space-y-3">
                                {rec.recommendedSchools.map(school => (
                                    <div key={school.id} className="p-3 bg-accent/40 rounded-md border border-transparent hover:border-primary/30 transition-colors">
                                        <Link href={`/schools/${school.id}`} className="font-semibold hover:text-primary transition-colors">
                                            {school.name}
                                        </Link>
                                        <p className="text-sm text-muted-foreground mt-1">{school.reasoning}</p>
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
