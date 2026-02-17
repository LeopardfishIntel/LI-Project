'use client';

import {
  useUser,
  useDoc,
  useFirestore,
  useMemoFirebase,
  setDocumentNonBlocking,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import type { TeacherProfile } from '@/lib/types';
import { teacherProfile as mockProfile } from '@/lib/mock-data';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VerifiedBadge } from '@/components/verified-badge';
import {
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

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const profileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: teacherProfile, isLoading: isProfileLoading } =
    useDoc<Omit<TeacherProfile, 'memberSince'> & { memberSince: any }>(
      profileRef
    );

  const handleCreateProfile = () => {
    if (!firestore || !user) return;
    const newProfile = {
      ...mockProfile,
      id: user.uid,
      fullName: user.displayName || 'New Teacher',
      memberSince: new Date(),
    };
    // The mock profile has a Date object, need to convert to Firestore Timestamp for storage
    const { memberSince, ...rest } = newProfile;
    const dataToSave = { ...rest, memberSince: memberSince };

    setDocumentNonBlocking(profileRef!, dataToSave, { merge: true });
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
    memberSince: teacherProfile.memberSince.toDate
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
          <Button variant="outline">
            <Pencil className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
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
                      className="text-sky-400 hover:underline text-lg"
                    >
                      View Profile
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
