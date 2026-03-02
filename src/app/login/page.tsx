'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, initiateEmailSignIn, initiateAnonymousSignIn } from '@/firebase';
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
import { Loader2, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function LoginPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<
    false | 'email' | 'anonymous' | 'linkedin'
  >(false);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/profile');
    }
  }, [user, isUserLoading, router]);

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }
    setLoading('email');
    setError(null);

    initiateEmailSignIn(auth, email, password, (err: any) => {
        // Tactical Error Mapping: Standardise auth rejections
        let message = 'Verification failed. Please check your credentials.';
        if (err.code === 'auth/invalid-credential') {
            message = 'Invalid credentials detected. Access denied.';
        } else if (err.code === 'auth/user-disabled') {
            message = 'This agent account has been deactivated.';
        } else if (err.code === 'auth/too-many-requests') {
            message = 'Too many failed attempts. Secure lockout active. Try again later.';
        }
        
        setError(message);
        setLoading(false);
        // Do not use console.error here to avoid triggering Next.js error overlays
    });
  };

  const handleAnonymousLogin = () => {
    setLoading('anonymous');
    setError(null);
    initiateAnonymousSignIn(auth, (err: any) => {
        setError('Failed to establish anonymous session.');
        setLoading(false);
    });
  };

  if (isUserLoading || user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] py-12 px-4">
      <Card className="mx-auto max-w-sm w-full glass border-white/10 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl stamped-dossier text-primary">Login</CardTitle>
          <CardDescription className="text-muted-foreground font-medium">
            Enter your credentials to access field intel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6 bg-destructive/10 border-destructive/20 text-destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle className="text-xs font-black uppercase tracking-widest">Access Denied</AlertTitle>
              <AlertDescription className="text-xs font-bold leading-relaxed">{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleEmailLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="agent@leopardfish.intel"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-background/50 border-white/10 rounded-sm"
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Password</Label>
                <Link
                  href="#"
                  className="text-[10px] font-bold text-accent hover:underline uppercase tracking-tighter"
                >
                  Reset credentials?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-background/50 border-white/10 rounded-sm"
              />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest h-11 rounded-sm mt-2" disabled={!!loading}>
              {loading === 'email' ? <Loader2 className="animate-spin size-4" /> : 'Authorise'}
            </Button>
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/5" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                <span className="bg-card px-3 text-muted-foreground/40">Protocol</span>
              </div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              className="w-full border-white/10 hover:bg-white/5 text-xs font-bold uppercase tracking-widest h-11 rounded-sm"
              onClick={handleAnonymousLogin}
              disabled={!!loading}
            >
              {loading === 'anonymous' ? (
                <Loader2 className="animate-spin size-4" />
              ) : (
                'Continue as guest'
              )}
            </Button>
          </form>
          <div className="mt-6 text-center text-xs font-medium text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-primary hover:underline font-bold">
              Register profile
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
