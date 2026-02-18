"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, ServerCrash, CheckCircle } from "lucide-react";
import { submitInquiry, type InquiryState } from "./actions";

const initialState: InquiryState = {
  message: null,
  error: null,
  success: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Submitting...
        </>
      ) : (
        <>
          <Send className="mr-2 h-4 w-4" />
          Submit Inquiry
        </>
      )}
    </Button>
  );
}


export default function PartnersPage() {
  const [inquiryType, setInquiryType] = useState("school");
  const [state, formAction] = useActionState(submitInquiry, initialState);

  const messagePlaceholder =
    inquiryType === "school"
      ? "Tell us about your campus and we'll send over the Verified Membership details."
      : "Tell us about your services and how you support teachers.";

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-center">
          Partner with Leopardfish Intel
        </h1>
        <p className="text-muted-foreground text-center mt-4 mb-12">
          Whether you’re a school looking to join our Verified Membership program or a service provider ready to support the international community, we want to hear from you.
        </p>

        <Card className="bg-card/70 backdrop-blur-sm border-border">
          <form action={formAction}>
            <CardHeader>
              <CardTitle>Inquiry Form</CardTitle>
              <CardDescription>
                Please fill out the form below and our partnerships team will get back to you shortly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>I am a...</Label>
                <RadioGroup
                  name="inquiryType"
                  value={inquiryType}
                  onValueChange={setInquiryType}
                  className="flex pt-2 gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="school" id="school" />
                    <Label htmlFor="school" className="font-normal">
                      School
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="provider" id="provider" />
                    <Label htmlFor="provider" className="font-normal">
                      Service Provider
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <Input id="name" name="name" placeholder="e.g., Jane Doe" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="e.g., jane.doe@example.com"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization">School / Organization Name</Label>
                <Input
                  id="organization"
                  name="organization"
                  placeholder="e.g., The International School of Excellence"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder={messagePlaceholder}
                  className="min-h-[120px]"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex-col items-start gap-4">
              <SubmitButton />
               {state.error && (
                <div className="text-red-500 text-sm flex items-center gap-2">
                    <ServerCrash className="h-4 w-4" />
                    {state.error}
                </div>
              )}
               {state.success && state.message && (
                <div className="text-green-500 text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    {state.message}
                </div>
              )}
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
