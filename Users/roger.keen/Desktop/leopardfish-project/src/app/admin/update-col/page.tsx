'use client';

import { useActionState, useEffect } from 'react';
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
import { ArrowLeft, Loader2, RefreshCcw, ServerCrash, CheckCircle, DatabaseZap } from 'lucide-react';
import { updateLocationCostOfLivingAction, refreshAllCostOfLivingAction, type UpdateState, type BulkUpdateState } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

const singleInitialState: UpdateState = { message: null, error: null };
const bulkInitialState: BulkUpdateState = { message: null, error: null, summary: null };

function SingleSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Updating...
        </>
      ) : (
        <>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Update Location
        </>
      )}
    </Button>
  );
}

function BulkSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full" variant="destructive">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Refreshing All...
        </>
      ) : (
        <>
          <DatabaseZap className="mr-2 h-4 w-4" />
          Refresh All Live Data
        </>
      )}
    </Button>
  );
}

export default function UpdateCostOfLivingPage() {
  const [singleUpdateState, singleUpdateFormAction] = useActionState(updateLocationCostOfLivingAction, singleInitialState);
  const [bulkUpdateState, bulkUpdateFormAction] = useActionState(refreshAllCostOfLivingAction, bulkInitialState);
  const { toast } = useToast();

  useEffect(() => {
    if (singleUpdateState.message) {
      toast({
        title: 'Success',
        description: singleUpdateState.message,
      });
    }
    if (singleUpdateState.error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: singleUpdateState.error,
      });
    }
  }, [singleUpdateState, toast]);
  
  useEffect(() => {
    if (bulkUpdateState.message) {
      toast({
        title: 'Bulk Update Complete',
        description: bulkUpdateState.message,
        variant: bulkUpdateState.error ? 'destructive' : 'default',
        duration: 10000,
      });
    }
  }, [bulkUpdateState, toast]);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
            <Button asChild variant="outline" className="mb-8">
                <Link href="/admin/seed-data">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Data Admin
                </Link>
            </Button>
        
            <Card className="bg-card/70 backdrop-blur-sm border-border">
                <form action={singleUpdateFormAction}>
                    <CardHeader>
                        <CardTitle>Update Single Location</CardTitle>
                        <CardDescription>
                        Enter a location to fetch the latest cost-of-living data using AI.
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
                    <CardFooter>
                        <SingleSubmitButton />
                    </CardFooter>
                </form>
            </Card>

            <Separator />
            
            <Card className="border-amber-500/50 bg-amber-500/10">
                <form action={bulkUpdateFormAction}>
                    <CardHeader>
                        <CardTitle className="text-amber-400">Bulk Refresh All Live Data</CardTitle>
                        <CardDescription>
                        Use AI to refresh all cost-of-living data in your database. This will iterate through all predefined locations and fetch the latest figures.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-amber-200/80">
                        This is a long-running and resource-intensive task that may take up to 30 seconds per location. It will consume a significant amount of your AI API quota.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <BulkSubmitButton />
                    </CardFooter>
                </form>
            </Card>
        </div>
    </div>
  );
}
