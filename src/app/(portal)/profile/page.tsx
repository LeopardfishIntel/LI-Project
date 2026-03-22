 'use client';

import { useState } from 'react';
import {
  useUser,
  useDoc,
  db,
  setDocumentNonBlocking,
  useAuth,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import type { TeacherProfile } from '@/lib/types';
import { teacherProfile as mockProfile } from '@/lib/mock-data';
import { updateEmail } from 'firebase/auth';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-6">
        <Skeleton className="h-32 w-32 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const { signOut } = useAuth();
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const profileRef = user ? doc(db, 'users', user.uid, 'teacherProfile', user.uid) : null;
  const { data: teacherProfile, isLoading: isProfileLoading } = useDoc<TeacherProfile>(profileRef);

  const handleCreateProfile = async () => {
    if (!user || !profileRef) return;
    const newProfile: TeacherProfile = {
      ...mockProfile,
      uid: user.uid,
      email: user.email || "",
      fullName: user.displayName || 'New operative',
      memberSince: new Date(),
    };
    await setDocumentNonBlocking(profileRef, newProfile);
    toast({ title: "Intelligence Dossier Created" });
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newEmail) return;
    setIsUpdating(true);
    try {
      await updateEmail(user, newEmail);
      toast({ title: 'Credentials Updated' });
      signOut();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isUserLoading || isProfileLoading) return <div className="p-12"><ProfileSkeleton /></div>;
  if (!user) return <div className="p-12 text-center font-black">UNAUTHORIZED ACCESS</div>;

  if (!teacherProfile) {
    return (
      <div className="p-12 text-center">
        <Button onClick={handleCreateProfile}>INITIALIZE PROFILE</Button>
      </div>
    );
  }

  const displayProfile = {
    ...teacherProfile,
    fullName: teacherProfile.fullName || "Unknown Operative",
    qualifications: teacherProfile.qualifications || [],
    preferredRegions: teacherProfile.preferredRegions || [],
    preferredCountries: teacherProfile.preferredCountries || [],
    memberSince: teacherProfile.memberSince?.toDate ? teacherProfile.memberSince.toDate() : new Date(),
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
          <Avatar className="h-32 w-32 border-4 border-primary">
            <AvatarImage src={displayProfile.avatarUrl} alt={displayProfile.fullName} />
            <AvatarFallback className="bg-azure font-black">
              {displayProfile.fullName.split(' ').map((n: string) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-grow">
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">{displayProfile.fullName}</h1>
            {displayProfile.isVerifiedTeacher && <VerifiedBadge className="mt-2" />}
          </div>
          <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>EDIT PROFILE</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="bg-background border-border border-l-4 border-primary">
              <CardHeader><CardTitle className="font-black text-azure uppercase">Service Record</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                 <div className="flex items-center gap-4">
                  <Briefcase className="text-primary" />
                  <p className="font-bold">{displayProfile.yearsOfExperience || 0} Years Active</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Qualifications</p>
                  <div className="flex flex-wrap gap-2">
                    {displayProfile.qualifications.map((q: string) => (
                      <Badge key={q} variant="secondary" className="font-black italic">{q}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background border-border">
              <CardHeader><CardTitle className="font-black text-azure uppercase">Deployment Zones</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {displayProfile.preferredRegions.map((r: string) => (
                    <Badge key={r} variant="outline">{r}</Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {displayProfile.preferredCountries.map((c: string) => (
                    <Badge key={c} variant="outline" className="border-azure text-azure">{c}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-background border-border h-fit">
            <CardHeader><CardTitle className="font-black text-azure uppercase text-sm">Dossier</CardTitle></CardHeader>
            <CardContent className="space-y-4">
               <div className="flex items-center gap-2">
                 <Mail className="h-4 w-4 text-muted-foreground" />
                 <p className="text-xs font-bold">{user.email}</p>
               </div>
               <div className="flex items-center gap-2">
                 <Users className="h-4 w-4 text-muted-foreground" />
                 <p className="text-xs font-bold uppercase">{displayProfile.familyStatus || 'SINGLE'}</p>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black">UPDATE CREDENTIALS</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <Label>NEW EMAIL</Label>
            <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
            <Button type="submit" className="w-full font-black" disabled={isUpdating}>
              {isUpdating ? <Loader2 className="animate-spin" /> : 'CONFIRM'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}