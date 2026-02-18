'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  AuthError,
} from 'firebase/auth';

type ErrorCallback = (error: AuthError) => void;

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth, onError: ErrorCallback): void {
  signInAnonymously(authInstance).catch(onError);
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(
  authInstance: Auth,
  email: string,
  password: string,
  onError: ErrorCallback
): void {
  createUserWithEmailAndPassword(authInstance, email, password).catch(onError);
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(
  authInstance: Auth,
  email: string,
  password: string,
  onError: ErrorCallback
): void {
  signInWithEmailAndPassword(authInstance, email, password).catch(onError);
}
