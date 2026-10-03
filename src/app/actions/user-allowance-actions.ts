'use server';

import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { credential } from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

let adminDb: FirebaseFirestore.Firestore | null = null;
let adminApp: ReturnType<typeof initializeApp> | null = null;

function getAdminApp() {
  if (adminApp) return adminApp;
  const appName = 'admin-user-allowance';
  const existingApp = getApps().find(app => app.name === appName);
  if (existingApp) {
    adminApp = existingApp;
    return adminApp;
  }

  const saPath = path.resolve(process.cwd(), 'service-account.json');
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    adminApp = initializeApp({ credential: credential.cert(sa) }, appName);
  } else if (fs.existsSync(saPath)) {
    adminApp = initializeApp({
      credential: credential.cert(saPath),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-2840117705-12faa'
    }, appName);
  } else {
    // Default credential fallback (e.g. GCP / App Hosting)
    adminApp = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-2840117705-12faa'
    }, appName);
  }
  return adminApp;
}

function getAdminFirestore(): FirebaseFirestore.Firestore {
  if (adminDb) return adminDb;
  adminDb = getFirestore(getAdminApp());
  try {
    adminDb.settings({ ignoreUndefinedProperties: true });
  } catch (_) {}
  return adminDb;
}

/**
 * Server actions are public endpoints: the caller's user id must come from a verified Firebase ID token,
 * never from a value the browser sends. Returns null when the token is missing, invalid or expired.
 */
async function verifyCaller(idToken: unknown): Promise<{ uid: string; isAdmin: boolean } | null> {
  if (!idToken || typeof idToken !== 'string') return null;
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(idToken);
    let isAdmin = decoded.admin === true;
    if (!isAdmin) {
      const roleSnap = await getAdminFirestore().collection('roles_admin').doc(decoded.uid).get();
      isAdmin = roleSnap.exists;
    }
    return { uid: decoded.uid, isAdmin };
  } catch {
    return null;
  }
}

export interface ConsumeQuotaInput {
  /** Firebase ID token of the signed-in user (from user.getIdToken()). */
  idToken: string;
  /** Optional; must match the token's user if given. The token decides who the caller is. */
  userId?: string;
  count?: number;
  schoolId?: string;
  surface?: 'school_briefing' | 'decide_initial_load' | 'decide_slot_swap' | 'financial_forecaster' | string;
}

export interface QuotaStatusResponse {
  success: boolean;
  reason?: 'QUOTA_EXCEEDED' | 'UNAUTHENTICATED' | 'USER_NOT_FOUND' | 'ERROR' | string;
  allowance?: number;
  used?: number;
  dailyUsed?: number;
  remaining?: number;
  isPro?: boolean;
  isAdmin?: boolean;
  message?: string;
}

/**
 * 🛡️ ATOMIC SERVER-SIDE QUOTA CONSUMPTION
 * Checks user allowance, processes daily rollover, and increments counters in a single atomic transaction.
 * Completely prevents client-side manipulation of tier, allowance, and used counters.
 */
export async function consumeEvaluationQuotaAction(
  input: ConsumeQuotaInput
): Promise<QuotaStatusResponse> {
  try {
    const { count: rawCount = 1 } = input;
    const caller = await verifyCaller(input.idToken);
    if (!caller) {
      return {
        success: false,
        reason: 'UNAUTHENTICATED',
        message: 'Authentication required to evaluate schools.',
      };
    }
    if (input.userId && input.userId !== caller.uid) {
      return { success: false, reason: 'FORBIDDEN', message: 'You can only use your own evaluations.' };
    }
    const userId = caller.uid;
    // Count must be a small whole number (stops negative or huge values being sent).
    const count = Number.isInteger(rawCount) && rawCount >= 1 && rawCount <= 10 ? rawCount : 1;

    const db = getAdminFirestore();
    const userRef = db.collection('teachers').doc(userId);
    const today = new Date().toISOString().split('T')[0];

    const result = await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(userRef);

      if (!snap.exists) {
        // Initial teacher profile creation with default free quota
        const initialAllowance = 20;
        const initialDoc = {
          id: userId,
          tier: 'free',
          daily_base_quota: 20,
          evaluations_allowance: initialAllowance,
          evaluations_used: count,
          daily_evaluations_used: count,
          bonus_credits: 0,
          expedited_uplifts_count: 0,
          last_quota_reset_date: today,
          createdAt: FieldValue.serverTimestamp(),
          last_evaluation_at: FieldValue.serverTimestamp(),
        };

        transaction.set(userRef, initialDoc, { merge: true });

        return {
          success: true,
          allowance: initialAllowance,
          used: count,
          dailyUsed: count,
          remaining: Math.max(0, initialAllowance - count),
          isPro: false,
          isAdmin: false,
        };
      }

      const data = snap.data() || {};

      // 1. Level 4 Admin or explicit admin role: Unlimited evaluations
      const isAdmin =
        data.role === 'admin' ||
        data.isAdmin === true ||
        data.tier === 'admin';

      if (isAdmin) {
        const currentUsed = (data.evaluations_used || 0) + count;
        transaction.set(
          userRef,
          {
            evaluations_used: currentUsed,
            daily_evaluations_used: (data.daily_evaluations_used || 0) + count,
            last_evaluation_at: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        return {
          success: true,
          allowance: 1000,
          used: currentUsed,
          dailyUsed: (data.daily_evaluations_used || 0) + count,
          remaining: 999,
          isPro: true,
          isAdmin: true,
        };
      }

      // 2. Pro Tier or Active 14-Day Relocation Pass
      const isRelocationPassValid =
        data.relocation_pass_active &&
        (!data.relocation_pass_expires_at ||
          new Date(data.relocation_pass_expires_at).getTime() > Date.now());

      const isPro = data.tier === 'pro' || isRelocationPassValid;

      if (data.tier === 'pro') {
        const currentUsed = (data.evaluations_used || 0) + count;
        transaction.set(
          userRef,
          {
            evaluations_used: currentUsed,
            daily_evaluations_used: (data.daily_evaluations_used || 0) + count,
            last_evaluation_at: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        return {
          success: true,
          allowance: 1000,
          used: currentUsed,
          dailyUsed: (data.daily_evaluations_used || 0) + count,
          remaining: 999,
          isPro: true,
          isAdmin: false,
        };
      }

      // 3. Daily Rollover Logic (Automatic reset at midnight UTC/local)
      const lastResetDate = data.last_quota_reset_date;
      const isNewDay = !lastResetDate || lastResetDate !== today;
      const dailyBaseQuota = data.daily_base_quota ?? 20;
      const bonusCredits = data.bonus_credits ?? 0;

      let effectiveAllowance = isNewDay
        ? dailyBaseQuota + bonusCredits
        : (data.evaluations_allowance ?? (dailyBaseQuota + bonusCredits));

      let currentUsed = isNewDay ? 0 : (data.evaluations_used ?? 0);
      let currentDailyUsed = isNewDay ? 0 : (data.daily_evaluations_used ?? 0);

      // 4. Quota Enforcement Check
      if (currentUsed + count > effectiveAllowance) {
        if (isNewDay) {
          // Commit the reset day state even when rejected so client state stays synchronized
          transaction.set(
            userRef,
            {
              last_quota_reset_date: today,
              evaluations_allowance: effectiveAllowance,
              evaluations_used: currentUsed,
              daily_evaluations_used: currentDailyUsed,
            },
            { merge: true }
          );
        }

        return {
          success: false,
          reason: 'QUOTA_EXCEEDED',
          allowance: effectiveAllowance,
          used: currentUsed,
          dailyUsed: currentDailyUsed,
          remaining: Math.max(0, effectiveAllowance - currentUsed),
          message: 'Daily evaluation quota reached.',
        };
      }

      // 5. Deduct Quota Atomically
      const newUsed = currentUsed + count;
      const newDailyUsed = currentDailyUsed + count;
      const updatePayload: Record<string, any> = {
        evaluations_used: newUsed,
        daily_evaluations_used: newDailyUsed,
        last_evaluation_at: FieldValue.serverTimestamp(),
      };

      if (isNewDay) {
        updatePayload.last_quota_reset_date = today;
        updatePayload.evaluations_allowance = effectiveAllowance;
        updatePayload.daily_base_quota = dailyBaseQuota;
      }

      transaction.set(userRef, updatePayload, { merge: true });

      return {
        success: true,
        allowance: effectiveAllowance,
        used: newUsed,
        dailyUsed: newDailyUsed,
        remaining: Math.max(0, effectiveAllowance - newUsed),
        isPro: false,
        isAdmin: false,
      };
    });

    return result;
  } catch (err: any) {
    console.error('🎯 [User Allowance Action Error]:', err);
    return {
      success: false,
      reason: 'ERROR',
      message: err.message || 'Internal error processing quota deduction.',
    };
  }
}

/**
 * 🛰️ SYNC USER ALLOWANCE & DAILY ROLLOVER
 * Checks if a daily rollover is due without consuming quota, keeping client in sync.
 */
export async function syncUserAllowanceAction(idToken: string): Promise<QuotaStatusResponse> {
  try {
    const caller = await verifyCaller(idToken);
    if (!caller) {
      return { success: false, reason: 'UNAUTHENTICATED' };
    }
    const userId = caller.uid;

    const db = getAdminFirestore();
    const userRef = db.collection('teachers').doc(userId);
    const today = new Date().toISOString().split('T')[0];

    const snap = await userRef.get();
    if (!snap.exists) {
      return { success: true, allowance: 20, used: 0, dailyUsed: 0, remaining: 20, isPro: false, isAdmin: false };
    }

    const data = snap.data() || {};
    const isAdmin = data.role === 'admin' || data.isAdmin === true || data.tier === 'admin';
    const isPro = data.tier === 'pro' || (data.relocation_pass_active && (!data.relocation_pass_expires_at || new Date(data.relocation_pass_expires_at).getTime() > Date.now()));

    if (isAdmin || isPro) {
      return {
        success: true,
        allowance: 1000,
        used: data.evaluations_used || 0,
        dailyUsed: data.daily_evaluations_used || 0,
        remaining: 999,
        isPro: true,
        isAdmin: !!isAdmin,
      };
    }

    const lastResetDate = data.last_quota_reset_date;
    const isNewDay = !lastResetDate || lastResetDate !== today;
    const dailyBaseQuota = data.daily_base_quota ?? 20;
    const bonusCredits = data.bonus_credits ?? 0;

    if (isNewDay) {
      const newAllowance = dailyBaseQuota + bonusCredits;
      await userRef.set({
        last_quota_reset_date: today,
        evaluations_allowance: newAllowance,
        evaluations_used: 0,
        daily_evaluations_used: 0,
        daily_base_quota: dailyBaseQuota,
      }, { merge: true });

      return {
        success: true,
        allowance: newAllowance,
        used: 0,
        dailyUsed: 0,
        remaining: newAllowance,
        isPro: false,
        isAdmin: false,
      };
    }

    const allowance = data.evaluations_allowance ?? (dailyBaseQuota + bonusCredits);
    const used = data.evaluations_used ?? 0;

    return {
      success: true,
      allowance,
      used,
      dailyUsed: data.daily_evaluations_used ?? 0,
      remaining: Math.max(0, allowance - used),
      isPro: false,
      isAdmin: false,
    };
  } catch (err: any) {
    console.error('🎯 [Sync Allowance Error]:', err);
    return { success: false, reason: 'ERROR', message: err.message };
  }
}

/**
 * 🔒 SAFE TEACHER PROFILE UPDATE
 * Allows teachers to update non-privileged biography/qualification fields,
 * strictly stripping any attempts to overwrite tier, allowance, role, or quota fields.
 */
export async function updateTeacherProfileSafeAction(
  idToken: string,
  targetUserId: string,
  profileData: Record<string, any>
): Promise<{ success: boolean; message: string }> {
  try {
    const caller = await verifyCaller(idToken);
    if (!caller) {
      return { success: false, message: 'Authentication required.' };
    }
    // A user may only edit their own profile; admins may edit any profile.
    if (!targetUserId || typeof targetUserId !== 'string' || (targetUserId !== caller.uid && !caller.isAdmin)) {
      return { success: false, message: 'Not allowed to edit this profile.' };
    }
    const userId = targetUserId;
    if (!profileData || typeof profileData !== 'object') {
      return { success: false, message: 'Nothing to save.' };
    }

    // Strip privileged keys
    const privilegedKeys = new Set([
      'tier',
      'evaluations_allowance',
      'evaluations_used',
      'daily_evaluations_used',
      'daily_base_quota',
      'bonus_credits',
      'last_quota_reset_date',
      'role',
      'isAdmin',
      'isVerified',
      'relocation_pass_active',
      'relocation_pass_expires_at',
      'domestic_baseline_submitted',
      'expedited_uplifts_count',
      'contributions_count',
      'last_contribution_at',
      'last_uplift_at',
    ]);

    const sanitizedData: Record<string, any> = {};
    for (const [key, value] of Object.entries(profileData)) {
      if (!privilegedKeys.has(key) && value !== undefined) {
        sanitizedData[key] = value;
      }
    }

    sanitizedData.updatedAt = FieldValue.serverTimestamp();

    const db = getAdminFirestore();
    await db.collection('teachers').doc(userId).set(sanitizedData, { merge: true });

    return { success: true, message: 'Profile updated successfully.' };
  } catch (err: any) {
    console.error('🎯 [Safe Profile Update Error]:', err);
    return { success: false, message: err.message || 'Failed to update profile.' };
  }
}

export type RewardKind = 'ai_clearance' | 'intel' | 'domestic';

export interface ClaimRewardResponse {
  success: boolean;
  reason?: 'UNAUTHENTICATED' | 'UNKNOWN_REWARD' | 'DAILY_LIMIT' | 'ALREADY_CLAIMED' | 'ERROR' | string;
  added?: number;
  allowance?: number;
  message?: string;
}

const REWARD_AMOUNT = 20;
const MAX_INTEL_REWARDS_PER_DAY = 2;
// Hard ceiling on the daily allowance a reward can ever reach (stops stacking).
const MAX_REWARD_ALLOWANCE = 60;
const MAX_BONUS_CREDITS = 40;

/**
 * 🎁 SINGLE, AUTHENTICATED PLACE WHERE FREE EVALUATIONS ARE GRANTED
 * The browser can no longer write allowance, bonus or counter fields. It asks here instead.
 * Who is asking comes from the verified sign-in token. Each reward has its own server-side limit,
 * so repeating the call cannot stack credits.
 */
export async function claimRewardAction(idToken: string, kind: RewardKind): Promise<ClaimRewardResponse> {
  try {
    const caller = await verifyCaller(idToken);
    if (!caller) return { success: false, reason: 'UNAUTHENTICATED', message: 'Please sign in first.' };
    if (kind !== 'ai_clearance' && kind !== 'intel' && kind !== 'domestic') {
      return { success: false, reason: 'UNKNOWN_REWARD' };
    }

    const db = getAdminFirestore();
    const userRef = db.collection('teachers').doc(caller.uid);
    const today = new Date().toISOString().split('T')[0];

    return await db.runTransaction(async (tx): Promise<ClaimRewardResponse> => {
      const snap = await tx.get(userRef);
      const data = snap.exists ? (snap.data() || {}) : {};
      const baseQuota = data.daily_base_quota ?? 20;
      const currentAllowance = data.evaluations_allowance ?? baseQuota;
      const currentBonus = data.bonus_credits ?? 0;
      const sameContributionDay = data.last_contribution_date === today;
      const dailyContribs = sameContributionDay ? (data.daily_contributions_count ?? 0) : 0;

      if (kind === 'domestic') {
        if (data.domestic_baseline_submitted === true) {
          return { success: false, reason: 'ALREADY_CLAIMED', message: 'The relocation pass has already been used.' };
        }
        tx.set(userRef, {
          evaluations_allowance: Math.max(currentAllowance, 20),
          daily_base_quota: Math.max(baseQuota, 20),
          relocation_pass_active: true,
          relocation_pass_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          domestic_baseline_submitted: true,
          contributions_count: FieldValue.increment(1),
          daily_contributions_count: dailyContribs + 1,
          last_contribution_date: today,
        }, { merge: true });
        return { success: true, added: REWARD_AMOUNT, allowance: Math.max(currentAllowance, 20) };
      }

      if (kind === 'ai_clearance') {
        const lastUpliftDay = data.last_uplift_at?.toDate?.()?.toISOString?.().split('T')[0];
        if (lastUpliftDay === today) {
          return { success: false, reason: 'DAILY_LIMIT', message: 'The expedited clearance bonus can only be used once a day.' };
        }
      } else if (dailyContribs >= MAX_INTEL_REWARDS_PER_DAY) {
        return { success: false, reason: 'DAILY_LIMIT', message: 'Daily intel reward limit reached. Come back tomorrow.' };
      }

      const newAllowance = Math.min(currentAllowance + REWARD_AMOUNT, MAX_REWARD_ALLOWANCE);
      const added = newAllowance - currentAllowance;
      const payload: Record<string, any> = {
        evaluations_allowance: newAllowance,
        bonus_credits: Math.min(currentBonus + REWARD_AMOUNT, MAX_BONUS_CREDITS),
      };
      if (kind === 'ai_clearance') {
        payload.expedited_uplifts_count = FieldValue.increment(1);
        payload.last_uplift_at = FieldValue.serverTimestamp();
      } else {
        payload.contributions_count = FieldValue.increment(1);
        payload.daily_contributions_count = dailyContribs + 1;
        payload.last_contribution_date = today;
      }
      tx.set(userRef, payload, { merge: true });
      return { success: true, added, allowance: newAllowance };
    });
  } catch (err: any) {
    console.error('🎯 [Claim Reward Error]:', err);
    return { success: false, reason: 'ERROR', message: 'Could not apply the reward right now.' };
  }
}
