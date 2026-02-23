'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  useUser,
  useDoc,
  useFirestore,
  useMemoFirebase,
  setDocumentNonBlocking,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import type { TeacherProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VerifiedBadge } from '@/components/verified-badge';
import {
  Mail,
  MapPin,
  Users,
  Calendar,
  Briefcase,
  Linkedin,
  Pencil,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
        <Skeleton className="h-32 w-32 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-5/6" />
              <Skeleton className="h-5 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-5/6" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

const profileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required.'),
  avatarUrl: z.string().url("Must be a valid URL.").or(z.literal('')),
  familyStatus: z.string(),
  ageGroup: z.string(),
  yearsOfExperience: z.coerce.number().min(0, "Years of experience must be positive."),
  qualifications: z.string().describe("Comma-separated values"),
  linkedInProfileUrl: z.string().url("Must be a valid URL.").or(z.literal('')),
  preferredRegions: z.string().describe("Comma-separated values"),
  preferredCountries: z.string().describe("Comma-separated values"),
});


export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const profileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid, 'teacherProfile', user.uid) : null),
    [firestore, user]
  );
  const { data: teacherProfile, isLoading: isProfileLoading } =
    useDoc<Omit<TeacherProfile, 'memberSince'> & { memberSince: any }>(
      profileRef
    );
    
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
        fullName: '',
        avatarUrl: '',
        familyStatus: 'Single',
        ageGroup: '25-34',
        yearsOfExperience: 0,
        qualifications: '',
        linkedInProfileUrl: '',
        preferredRegions: '',
        preferredCountries: '',
    },
  });

  useEffect(() => {
    if (teacherProfile) {
        form.reset({
            fullName: teacherProfile.fullName || '',
            avatarUrl: teacherProfile.avatarUrl || '',
            familyStatus: teacherProfile.familyStatus || 'Single',
            ageGroup: teacherProfile.ageGroup || '25-34',
            yearsOfExperience: teacherProfile.yearsOfExperience || 0,
            qualifications: (teacherProfile.qualifications || []).join(', '),
            linkedInProfileUrl: teacherProfile.linkedInProfileUrl || '',
            preferredRegions: (teacherProfile.preferredRegions || []).join(', '),
            preferredCountries: (teacherProfile.preferredCountries || []).join(', '),
        });
    }
  }, [teacherProfile, form]);


  const handleCreateProfile = () => {
    if (!firestore || !user || !profileRef) return;
    const newProfile: Omit<TeacherProfile, 'memberSince' | 'id'> & {memberSince: Date; id: string} = {
      id: user.uid,
      fullName: user.displayName || 'New Teacher',
      avatarUrl: '',
      isVerifiedTeacher: false,
      familyStatus: 'Single',
      ageGroup: '25-34',
      memberSince: new Date(),
      yearsOfExperience: 0,
      qualifications: [],
      linkedInProfileUrl: '',
      preferredRegions: [],
      preferredCountries: [],
    };
    setDocumentNonBlocking(profileRef, newProfile, { merge: true });
  };

 const onSubmit = (values: z.infer<typeof profileSchema>) => {
    if (!firestore || !user || !profileRef) return;

    setIsUpdating(true);
    try {
        const updatedProfile = {
            ...values,
            qualifications: values.qualifications.split(',').map(s => s.trim()).filter(Boolean),
            preferredRegions: values.preferredRegions.split(',').map(s => s.trim()).filter(Boolean),
            preferredCountries: values.preferredCountries.split(',').map(s => s.trim()).filter(Boolean),
        };
        
        setDocumentNonBlocking(profileRef, updatedProfile, { merge: true });

        toast({
            title: 'Profile Updated',
            description: 'Your profile has been successfully updated.',
        });
        setIsEditDialogOpen(false);
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: 'There was a problem updating your profile.',
        });
        console.error(error);
    } finally {
        setIsUpdating(false);
    }
  };


  const isLoading = isUserLoading || isProfileLoading;
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-12">
        <ProfileSkeleton />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-12 text-center">
        <h2 className="text-2xl font-bold">Please log in</h2>
        <p className="text-muted-foreground">
          You need to be logged in to view your profile.
        </p>
      </div>
    );
  }

  if (!teacherProfile) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-12 text-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Welcome!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Create your teacher profile to get started.
            </p>
            <Button onClick={handleCreateProfile}>Create My Profile</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Convert Firestore Timestamp to Date for display
  const displayProfile = {
    ...teacherProfile,
    memberSince: teacherProfile.memberSince?.toDate
      ? teacherProfile.memberSince.toDate()
      : new Date(),
  };

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
          <Avatar className="h-32 w-32 border-4 border-primary">
            <AvatarImage
              src={displayProfile.avatarUrl}
              alt={displayProfile.fullName}
            />
            <AvatarFallback>
              {displayProfile.fullName
                .split(' ')
                .map(n => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
          <div className="text-center md:text-left flex-grow">
            <h1 className="text-4xl font-bold tracking-tight">
              {displayProfile.fullName}
            </h1>
            {displayProfile.isVerifiedTeacher && (
              <VerifiedBadge className="mt-2 text-base px-3 py-1" />
            )}
            <p className="text-muted-foreground mt-2">
              Member since{' '}
              {displayProfile.memberSince.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Pencil className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Your Profile</DialogTitle>
                <DialogDescription>
                  Make changes to your profile here. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  id="update-profile-form"
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-2"
                >
                    <FormField control={form.control} name="fullName" render={({ field }) => (
                        <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="avatarUrl" render={({ field }) => (
                        <FormItem><FormLabel>Avatar URL</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="familyStatus" render={({ field }) => (
                            <FormItem><FormLabel>Family Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger></FormControl>
                                <SelectContent><SelectItem value="Single">Single</SelectItem><SelectItem value="Couple">Couple</SelectItem><SelectItem value="Family (2+1)">Family (2+1)</SelectItem><SelectItem value="Family (2+2)">Family (2+2)</SelectItem></SelectContent>
                            </Select><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="ageGroup" render={({ field }) => (
                            <FormItem><FormLabel>Age Group</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select age group..." /></SelectTrigger></FormControl>
                                <SelectContent><SelectItem value="20-34">20-34</SelectItem><SelectItem value="35-49">35-49</SelectItem><SelectItem value="50-64">50-64</SelectItem><SelectItem value="65+">65+</SelectItem></SelectContent>
                            </Select><FormMessage /></FormItem>
                        )} />
                    </div>
                    <FormField control={form.control} name="yearsOfExperience" render={({ field }) => (
                        <FormItem><FormLabel>Years of Experience</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="linkedInProfileUrl" render={({ field }) => (
                        <FormItem><FormLabel>LinkedIn Profile URL</FormLabel><FormControl><Input {...field} placeholder="https://linkedin.com/in/..." /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="qualifications" render={({ field }) => (
                        <FormItem><FormLabel>Qualifications</FormLabel><FormControl><Textarea {...field} placeholder="PGCE, M.Ed, QTS..." /></FormControl><FormDescription>Comma-separated list of your qualifications.</FormDescription><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="preferredRegions" render={({ field }) => (
                        <FormItem><FormLabel>Preferred Regions</FormLabel><FormControl><Textarea {...field} placeholder="Southeast Asia, Europe..." /></FormControl><FormDescription>Comma-separated list of regions.</FormDescription><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="preferredCountries" render={({ field }) => (
                        <FormItem><FormLabel>Preferred Countries</FormLabel><FormControl><Textarea {...field} placeholder="Thailand, Spain..." /></FormControl><FormDescription>Comma-separated list of countries.</FormDescription><FormMessage /></FormItem>
                    )} />
                </form>
              </Form>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  form="update-profile-form"
                  disabled={isUpdating}
                >
                  {isUpdating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="bg-card/70 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle>Professional Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                  <Briefcase className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-muted-foreground">
                      Years of Experience
                    </h3>
                    <p className="text-lg">
                      {displayProfile.yearsOfExperience} years
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6 mt-1 flex-shrink-0"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g transform="rotate(45 12 12)">
                      <rect
                        x="2"
                        y="2"
                        width="20"
                        height="20"
                        rx="3"
                        fill="hsl(var(--primary))"
                      />
                      <path
                        d="M12 6C16.5 10 16.5 14 12 18C7.5 14 7.5 10 12 6Z"
                        fill="hsl(var(--accent))"
                      />
                      <path
                        d="M10.5 6C14 10 14 14 10.5 18"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M13.5 6C10 10 10 14 13.5 18"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </g>
                  </svg>
                  <div>
                    <h3 className="font-semibold text-muted-foreground">
                      Qualifications
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {displayProfile.qualifications.map(q => (
                        <Badge
                          key={q}
                          variant="secondary"
                          className="text-sm"
                        >
                          {q}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Linkedin className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-muted-foreground">
                      LinkedIn Profile
                    </h3>
                    <a
                      href={displayProfile.linkedInProfileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:underline text-lg break-all"
                    >
                      {displayProfile.linkedInProfileUrl ? 'View Profile' : 'Not Provided'}
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle>Job Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                  <MapPin className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-muted-foreground">
                      Preferred Regions
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {displayProfile.preferredRegions.map(r => (
                        <Badge key={r} variant="outline" className="text-sm">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <MapPin className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-muted-foreground">
                      Preferred Countries
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {displayProfile.preferredCountries.map(c => (
                        <Badge key={c} variant="outline" className="text-sm">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="bg-card/70 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="break-all">
                    <span className="font-semibold text-muted-foreground">
                      Email:
                    </span>{' '}
                    {user.email}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Users className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <p>
                    <span className="font-semibold text-muted-foreground">
                      Family Status:
                    </span>{' '}
                    {displayProfile.familyStatus}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <p>
                    <span className="font-semibold text-muted-foreground">
                      Age Group:
                    </span>{' '}
                    {displayProfile.ageGroup}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
