'use client';
import { Auth, signInAnonymously, signInWithEmailAndPassword, AuthError } from 'firebase/auth';

export function initiateAnonymousSignIn(auth: Auth, onError: (e: AuthError) => void) {
  signInAnonymously(auth).catch(onError);
}

export function initiateEmailSignIn(auth: Auth, email: string, pass: string, onError: (e: AuthError) => void) {
  signInWithEmailAndPassword(auth, email, pass).catch(onError);
}
