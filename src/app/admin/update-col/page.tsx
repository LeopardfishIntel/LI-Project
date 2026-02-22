'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, RefreshCcw, ServerCrash, CheckCircle } from 'lucide-react';
import { updateLocationCostOfLivingAction, type UpdateState } from './actions';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

const initialState: UpdateState = {
  message: null,
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Updating with AI...
        </>
      ) : (
        <>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Update Data
        </>
      )}
    </Button>
  );
}

export default function UpdateCostOfLivingPage() {
  const [state, formAction] = useActionState(updateLocationCostOfLivingAction, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.message) {
      toast({
        title: 'Success',
        description: state.message,
      });
    }
    if (state.error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.error,
      });
    }
  }, [state, toast]);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-2xl mx-auto">
            <Button asChild variant="outline" className="mb-8">
                <Link href="/admin/seed-data">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Data Admin
                </Link>
            </Button>
        
            <Card className="bg-card/70 backdrop-blur-sm border-border">
                <form action={formAction}>
                <CardHeader>
                    <CardTitle>AI Cost of Living Update</CardTitle>
                    <CardDescription>
                    Enter a location to fetch the latest cost-of-living data using AI and update it in your database.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                    <Label htmlFor="locationName">Location Name (City)</Label>
                    <Input id="locationName" name="locationName" placeholder="e.g., Bangkok" required />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="countryName">Country</Label>
                    <Input
                        id="countryName"
                        name="countryName"
                        placeholder="e.g., Thailand"
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
                    {state.message && (
                        <div className="text-green-500 text-sm flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            {state.message}
                        </div>
                    )}
                     <p className="text-xs text-muted-foreground pt-2">
                        Note: This process can take up to 30 seconds. The AI will research public data sources to find the most recent cost-of-living figures.
                    </p>
                </CardFooter>
                </form>
            </Card>
        </div>
    </div>
  );
}
