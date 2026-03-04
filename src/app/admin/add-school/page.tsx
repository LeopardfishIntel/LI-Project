'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  useUser,
  useFirestore,
  useDoc,
  useMemoFirebase,
  setDocumentNonBlocking,
} from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { School } from '@/lib/types';
import Link from 'next/link';
import { getEnrichedSchoolData } from './actions';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  ShieldOff,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

const scoreSchema = z.enum(['good', 'neutral', 'bad']);

const schoolSchema = z.object({
  name: z.string().min(3, 'Name is required'),
  description: z.string().optional(),
  websiteUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  location: z.string().min(2, 'Location is required'),
  country: z.string().min(2, 'Country is required'),
  imageUrl: z.string().url('Must be a valid URL'),
  imageHint: z.string().min(2, 'Image hint is required'),
  videoUrl: z.string().url().optional().or(z.literal('')),
  spotlight: z.boolean().default(false).optional(),
  
  intel: z.object({
    salary: z.object({
      value: z.string().min(1, 'Salary value is required'),
      score: scoreSchema,
      isTaxFree: z.boolean().default(false).optional(),
    }),
    housing: z.object({
      value: z.string().min(1, 'Housing value is required'),
      provided: z.boolean().default(false),
    }),
    savingsPotential: z.object({
      value: z.string().min(1, 'Savings potential is required'),
      score: scoreSchema,
    }),
    curriculum: z.string().min(1, 'Curriculum is required'),
    studentTeacherRatio: z.string().min(1, 'Ratio is required'),
    classSize: z.coerce.number().positive('Must be a positive number'),
    healthInsurance: z.string().min(1, 'Health insurance is required'),
    accreditation: z.string().min(1, 'Accreditation is required'),
    jobsPortal: z.string().optional(),
    minQualifications: z.string().optional(),
    visaRestrictions: z.string().optional(),
    benefitsSummary: z.string().optional(),
    nonContactTime: z.coerce.number().min(0).optional(),
    technologyEcosystem: z.string().optional(),
  }),

  costOfLiving: z.object({
    monthlyRent1BR: z.coerce.number().min(0),
    monthlyRent2BR: z.coerce.number().min(0),
    monthlyRent3BR: z.coerce.number().min(0),
    food: z.coerce.number().min(0),
    transport: z.coerce.number().min(0),
    utilities: z.coerce.number().min(0),
    internet: z.coerce.number().min(0),
    mobile: z.coerce.number().min(0),
    diningSocial: z.coerce.number().min(0),
    vehicleInsuranceMaint: z.coerce.number().min(0),
    uncoveredMedical: z.coerce.number().min(0),
  }),
});

const curriculumOptions = ["IB", "AP", "British", "US", "Other"];

export default function AddSchoolPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isEnriching, setIsEnriching] = useState(false);

  const form = useForm<z.infer<typeof schoolSchema>>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
        name: '',
        description: '',
        websiteUrl: '',
        location: '',
        country: '',
        imageUrl: '',
        imageHint: '',
        videoUrl: '',
        spotlight: false,
        intel: {
            salary: { value: '', score: 'neutral', isTaxFree: false },
            housing: { value: '', provided: false },
            savingsPotential: { value: '', score: 'neutral' },
            curriculum: '',
            studentTeacherRatio: '',
            classSize: 20,
            healthInsurance: '',
            accreditation: '',
            jobsPortal: '',
            minQualifications: '',
            visaRestrictions: '',
            benefitsSummary: '',
            nonContactTime: 20,
            technologyEcosystem: '',
        },
        costOfLiving: {
            monthlyRent1BR: 0,
            monthlyRent2BR: 0,
            monthlyRent3BR: 0,
            food: 0,
            transport: 0,
            utilities: 0,
            internet: 0,
            mobile: 0,
            diningSocial: 0,
            vehicleInsuranceMaint: 0,
            uncoveredMedical: 0,
        },
    },
  });

  const schoolName = form.watch('name');
  const schoolLocation = form.watch('location');
  const schoolCountry = form.watch('country');
  const canEnrich = schoolName && schoolLocation && schoolCountry;

  const handleEnrich = async () => {
    if (!canEnrich) return;
    setIsEnriching(true);
    const { data, error } = await getEnrichedSchoolData({
        name: schoolName,
        location: schoolLocation,
        country: schoolCountry,
    });
    setIsEnriching(false);

    if (error) {
        toast({ variant: 'destructive', title: 'AI enrichment failed', description: error });
    }

    if (data) {
        form.setValue('description', data.description, { shouldValidate: true });
        form.setValue('websiteUrl', data.websiteUrl, { shouldValidate: true });
        form.setValue('imageUrl', data.imageUrl, { shouldValidate: true });
        form.setValue('imageHint', data.imageHint, { shouldValidate: true });
        if (data.videoUrl) form.setValue('videoUrl', data.videoUrl, { shouldValidate: true });
        form.setValue('intel.curriculum', data.curriculum, { shouldValidate: true });
        form.setValue('intel.accreditation', data.accreditation, { shouldValidate: true });
        if (data.studentTeacherRatio) form.setValue('intel.studentTeacherRatio', data.studentTeacherRatio, { shouldValidate: true });
        if (data.classSize) form.setValue('intel.classSize', data.classSize, { shouldValidate: true });
        if (data.technologyEcosystem) form.setValue('intel.technologyEcosystem', data.technologyEcosystem, { shouldValidate: true });

        if (data.costOfLiving) {
            form.setValue('costOfLiving.monthlyRent1BR', data.costOfLiving.monthlyRent1BR, { shouldValidate: true });
            form.setValue('costOfLiving.monthlyRent2BR', data.costOfLiving.monthlyRent2BR, { shouldValidate: true });
            form.setValue('costOfLiving.monthlyRent3BR', data.costOfLiving.monthlyRent3BR, { shouldValidate: true });
            form.setValue('costOfLiving.food', data.costOfLiving.food, { shouldValidate: true });
            form.setValue('costOfLiving.transport', data.costOfLiving.transport, { shouldValidate: true });
            form.setValue('costOfLiving.utilities', data.costOfLiving.utilities, { shouldValidate: true });
            form.setValue('costOfLiving.internet', data.costOfLiving.internet, { shouldValidate: true });
            form.setValue('costOfLiving.mobile', data.costOfLiving.mobile, { shouldValidate: true });
            form.setValue('costOfLiving.diningSocial', data.costOfLiving.diningSocial, { shouldValidate: true });
            if (data.costOfLiving.vehicleInsuranceMaint) form.setValue('costOfLiving.vehicleInsuranceMaint', data.costOfLiving.vehicleInsuranceMaint, { shouldValidate: true });
            if (data.costOfLiving.uncoveredMedical) form.setValue('costOfLiving.uncoveredMedical', data.costOfLiving.uncoveredMedical, { shouldValidate: true });
        }
        
        toast({ title: 'AI enrichment complete', description: 'Form fields have been populated.' });
    }
  };

  const adminRoleRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'roles_admin', user.uid) : null),
    [firestore, user]
  );
  const {
    data: adminRole,
    isLoading: isAdminLoading,
    error: adminRoleError,
  } = useDoc(adminRoleRef);
  const isAdmin = !!adminRole && !adminRoleError;

  const onSubmit = async (values: z.infer<typeof schoolSchema>) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore not available.' });
      return;
    }

    const schoolId = values.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const schoolCollectionRef = collection(firestore, 'schools');
    const schoolDocRef = doc(schoolCollectionRef, schoolId);

    const newSchool: School = {
      id: schoolId,
      ...values,
      description: values.description || '',
    };

    setDocumentNonBlocking(schoolDocRef, newSchool, { merge: false });
    toast({
      title: 'School added',
      description: `${newSchool.name} has been added to the database.`,
    });
    form.reset();
  };

  const isLoading = isUserLoading || isAdminLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-12">
        <Alert variant="destructive" className="max-w-xl mx-auto">
          <ShieldOff className="h-4 w-4" />
          <AlertTitle>Admin access required</AlertTitle>
          <AlertDescription>
            You do not have permission to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <Button asChild variant="outline" className="mb-8">
            <Link href="/admin/seed-data">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Data hub
            </Link>
        </Button>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-white">
          Add new school
        </h1>
        <p className="text-muted-foreground mb-12 font-medium">
          Fill out the form below to add a new school record.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card className="glass border-white/5">
              <CardHeader>
                <CardTitle className="text-white">Basic information</CardTitle>
                <CardDescription>Core details about the school. Enter a name, location, and country, then use AI to enrich.</CardDescription>
                 <div className="pt-2">
                    <Button type="button" variant="outline" onClick={handleEnrich} disabled={!canEnrich || isEnriching} size="sm">
                        {isEnriching ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                        Enrich with AI
                    </Button>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>School name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., International School of Excellence" {...field} className="bg-background/50 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (City)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Tokyo" {...field} className="bg-background/50 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Japan" {...field} className="bg-background/50 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="A brief description of the school..." {...field} className="bg-background/50 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="websiteUrl"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Website URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} className="bg-background/50 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} className="bg-background/50 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="imageHint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image hint</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., modern school tokyo" {...field} className="bg-background/50 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="videoUrl"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Video URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://youtube.com/embed/..." {...field} className="bg-background/50 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="spotlight"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-white/10 p-4 md:col-span-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Spotlight school</FormLabel>
                        <FormDescription>Feature this school on the homepage.</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="glass border-white/5">
              <CardHeader>
                <CardTitle className="text-white">School intel</CardTitle>
                <CardDescription>Key data points about the school's package and environment.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <FormField
                      control={form.control}
                      name="intel.salary.value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Salary range</FormLabel>
                          <FormControl>
                            <Input placeholder="$60k - $80k" {...field} className="bg-background/50 border-white/10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="intel.salary.score"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Salary score</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background/50 border-white/10">
                                <SelectValue placeholder="Select score" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="glass">
                              <SelectItem value="good">Good</SelectItem>
                              <SelectItem value="neutral">Neutral</SelectItem>
                              <SelectItem value="bad">Bad</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="intel.salary.isTaxFree"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-white/10 p-4 md:col-span-2">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Tax-free salary</FormLabel>
                            <FormDescription>Is the salary tax-free in the host country?</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                </div>

                <Separator className="bg-white/5" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <FormField
                      control={form.control}
                      name="intel.housing.value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Housing</FormLabel>
                          <FormControl>
                            <Input placeholder="Allowance" {...field} className="bg-background/50 border-white/10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="intel.housing.provided"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-8">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!mt-0">Housing provided</FormLabel>
                        </FormItem>
                      )}
                    />
                </div>

                 <Separator className="bg-white/5" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <FormField
                      control={form.control}
                      name="intel.savingsPotential.value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Savings potential</FormLabel>
                          <FormControl>
                            <Input placeholder="High" {...field} className="bg-background/50 border-white/10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="intel.savingsPotential.score"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Savings score</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background/50 border-white/10">
                                <SelectValue placeholder="Select score" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="glass">
                              <SelectItem value="good">Good</SelectItem>
                              <SelectItem value="neutral">Neutral</SelectItem>
                              <SelectItem value="bad">Bad</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>

                <Separator className="bg-white/5" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="intel.curriculum"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2 lg:col-span-3">
                          <FormLabel>Curriculum</FormLabel>
                          <FormControl>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
                              {curriculumOptions.map((item) => {
                                const selectedValues = field.value ? field.value.split(',').map(s => s.trim()).filter(Boolean) : [];
                                return (
                                  <div key={item} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`curriculum-${item}`}
                                      checked={selectedValues.includes(item)}
                                      onCheckedChange={(checked) => {
                                        const currentValues = field.value ? field.value.split(',').map(s => s.trim()).filter(Boolean) : [];
                                        let newValues;
                                        if (checked) {
                                            newValues = [...currentValues, item];
                                        } else {
                                            newValues = currentValues.filter(
                                            (value) => value !== item
                                            );
                                        }
                                        const sortedValues = curriculumOptions.filter(option => newValues.includes(option));
                                        field.onChange(sortedValues.join(', '));
                                      }}
                                    />
                                    <Label htmlFor={`curriculum-${item}`} className="font-normal">{item}</Label>
                                  </div>
                                );
                              })}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="intel.accreditation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Accreditation</FormLabel>
                          <FormControl>
                            <Input placeholder="CIS, WASC" {...field} className="bg-background/50 border-white/10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="intel.studentTeacherRatio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Student-teacher ratio</FormLabel>
                          <FormControl>
                            <Input placeholder="10:1" {...field} className="bg-background/50 border-white/10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="intel.classSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Average class size</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="bg-background/50 border-white/10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="intel.nonContactTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Non-contact time (%)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="bg-background/50 border-white/10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="intel.healthInsurance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Health insurance</FormLabel>
                          <FormControl>
                            <Input placeholder="Premium" {...field} className="bg-background/50 border-white/10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                 <FormField
                   control={form.control}
                   name="intel.technologyEcosystem"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Tech ecosystem</FormLabel>
                       <FormControl>
                         <Input placeholder="1:1 iPads, Google Workspace" {...field} className="bg-background/50 border-white/10" />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
                 <FormField
                   control={form.control}
                   name="intel.benefitsSummary"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Benefits summary</FormLabel>
                       <FormControl>
                         <Textarea placeholder="Full medical, annual flights..." {...field} className="bg-background/50 border-white/10" />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
                 <FormField
                   control={form.control}
                   name="intel.jobsPortal"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Jobs portal</FormLabel>
                       <FormControl>
                         <Input placeholder="TES, Search Associates" {...field} className="bg-background/50 border-white/10" />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
                 <FormField
                   control={form.control}
                   name="intel.minQualifications"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Min. qualifications</FormLabel>
                       <FormControl>
                         <Input placeholder="Teaching License + 2 Yrs Exp" {...field} className="bg-background/50 border-white/10" />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
                 <FormField
                   control={form.control}
                   name="intel.visaRestrictions"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Visa restrictions</FormLabel>
                       <FormControl>
                         <Input placeholder="Under 60" {...field} className="bg-background/50 border-white/10" />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
              </CardContent>
            </Card>

            <Card className="glass border-white/5">
              <CardHeader>
                <CardTitle className="text-white">Cost of living data (Monthly, in USD)</CardTitle>
                 <CardDescription>Monthly cost estimates for the school's location.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="costOfLiving.monthlyRent1BR"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rent (1BR)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-background/50 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costOfLiving.monthlyRent2BR"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rent (2BR)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-background/50 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costOfLiving.monthlyRent3BR"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rent (3BR)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-background/50 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costOfLiving.food"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Groceries</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-background/50 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costOfLiving.transport"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transport</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-background/50 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costOfLiving.utilities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Utilities</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-background/50 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costOfLiving.internet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internet</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-background/50 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costOfLiving.mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-background/50 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costOfLiving.diningSocial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dining/social</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-background/50 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costOfLiving.vehicleInsuranceMaint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle maint.</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-background/50 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costOfLiving.uncoveredMedical"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Uncovered medical</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-background/50 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Button type="submit" size="lg" disabled={form.formState.isSubmitting} className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest h-14 rounded-sm border-0">
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish school dossier
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
