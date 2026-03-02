'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useAuth,
  useFirestore,
  setDocumentNonBlocking,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import type { TeacherProfile } from '@/lib/types';

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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function SignupPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !email || !password) {
      setError('Please fill out all required fields.');
      return;
    }
    if (!auth) {
      setError("Uplink failure: Authentication service is offline.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      const fullName = `${firstName} ${lastName}`.trim();

      // 2. Update their Firebase Auth profile
      await updateProfile(user, { displayName: fullName });

      // 3. Create their teacher profile document in Firestore
      if (firestore) {
        const profileRef = doc(firestore, 'users', user.uid, 'teacherProfile', user.uid);
        const newProfile: Omit<TeacherProfile, 'memberSince' | 'id'> & {memberSince: Date; id: string} = {
          id: user.uid,
          fullName: fullName,
          avatarUrl: '',
          isVerifiedTeacher: false,
          familyStatus: 'Single',
          ageGroup: '20-34',
          memberSince: new Date(),
          yearsOfExperience: 0,
          qualifications: [],
          linkedInProfileUrl: '',
          preferredRegions: [],
          preferredCountries: [],
        };
        setDocumentNonBlocking(profileRef, newProfile, { merge: true });
      }

      // 4. Redirect to the profile page
      router.push('/profile');
    } catch (err: any) {
      let message = 'Failed to create account. Please verify your details.';
      if (err.code === 'auth/email-already-in-use') {
        message = 'This email is already registered in our database.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password strength insufficient. Minimum 6 characters required.';
      } else if (err.code === 'auth/invalid-email') {
          message = 'The email address provided is not a valid format.';
      }
      setError(message);
      setLoading(false);
      // No console.error here to prevent Next.js overlay
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] py-12 px-4">
      <Card className="mx-auto max-w-sm w-full glass border-white/10 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl stamped-dossier text-primary">Register</CardTitle>
          <CardDescription className="text-muted-foreground font-medium">
            Create your agent profile to access advanced due diligence tools.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6 bg-destructive/10 border-destructive/20 text-destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle className="text-[10px] font-black uppercase tracking-widest">Protocol Error</AlertTitle>
              <AlertDescription className="text-xs font-bold leading-relaxed">{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSignup} className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">First name</Label>
                <Input
                  id="first-name"
                  placeholder="Max"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="bg-background/50 border-white/10 rounded-sm h-10"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Last name</Label>
                <Input
                  id="last-name"
                  placeholder="Robinson"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="bg-background/50 border-white/10 rounded-sm h-10"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Institutional Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-background/50 border-white/10 rounded-sm h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-background/50 border-white/10 rounded-sm h-10"
              />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest h-11 rounded-sm mt-2" disabled={loading}>
              {loading ? (
                <Loader2 className="animate-spin size-4" />
              ) : (
                'Create account'
              )}
            </Button>
          </form>
          <div className="mt-6 text-center text-xs font-medium text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-bold">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
