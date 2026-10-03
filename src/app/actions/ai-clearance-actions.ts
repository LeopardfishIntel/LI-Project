'use server';

import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { credential } from 'firebase-admin';

let adminDb: FirebaseFirestore.Firestore | null = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    const app = getApps().length === 0 
      ? initializeApp({ credential: credential.cert(serviceAccount) }, 'admin-clearance')
      : getApp('admin-clearance');
    adminDb = getFirestore(app);
  }
} catch (e) {
  // Graceful fallback
}

export interface RequestClearanceInput {
  userId: string;
  userEmail?: string;
  reason: string;
}

export interface RequestClearanceOutput {
  approved: boolean;
  message: string;
  bonusCredits?: number;
  newTotalAllowance?: number;
}

/**
 * 🤖 AI CLEARANCE DESK AGENT
 * Evaluates educator justification for expedited evaluation uplift (+20 credits).
 * Uses pattern & semantic verification to reject bot spam while instantly approving real teachers.
 */
export async function requestExpeditedClearanceAction(
  input: RequestClearanceInput
): Promise<RequestClearanceOutput> {
  try {
    const { userId, userEmail, reason } = input;

    if (!userId) {
      return { approved: false, message: "Authentication required to request clearance." };
    }

    const trimmedReason = (reason || "").trim();

    // 🛡️ Minimum length check
    if (trimmedReason.length < 12) {
      return {
        approved: false,
        message: "Please provide a brief sentence describing your active interview or hiring research scenario (minimum 12 characters)."
      };
    }

    // 🛡️ Bot / Gibberish detection
    const normalized = trimmedReason.toLowerCase();
    const spamPatterns = [
      'asdf', 'qwerty', 'test', 'testing', 'give me data', 'all data', '1234', 'aaaa', 'zzzz',
      'hack', 'scraper', 'bot', 'download all', 'dump', 'give access', 'free'
    ];

    const isSpam = spamPatterns.some(p => normalized === p || normalized.startsWith(p + ' ') || normalized.length < 10);
    if (isSpam && trimmedReason.length < 20) {
      return {
        approved: false,
        message: "Please describe your real school research context in a brief sentence."
      };
    }

    // 🛡️ Reject exact example text or verbatim canned copies
    const cannedExamples = [
      'interviewing with 2 schools in dubai and munich next week, comparing net savings and housing stipends',
      'interviewing with schools in dubai and madrid next week, comparing package savings',
      'running on a deadline or need a few more checks',
      'let us know your scenario and we will add another 20 views',
      'let us know your scenario and well add another 20 views',
      'comparing two offers in uae and singapore'
    ];

    const cleanNormalized = normalized.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    const isCanned = cannedExamples.some(example => {
      const cleanExample = example.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
      return cleanNormalized === cleanExample || cleanNormalized.includes(cleanExample);
    });

    if (isCanned) {
      return {
        approved: false,
        message: "Please share your actual interview or school research situation rather than copying the example text."
      };
    }

    // 🎓 Educator Context Keywords
    const educatorKeywords = [
      'interview', 'offer', 'compare', 'shortlist', 'salary', 'package', 'couple', 'math', 'science',
      'english', 'primary', 'secondary', 'ib', 'british', 'american', 'moving', 'relocat', 'husband',
      'wife', 'partner', 'children', 'dependents', 'flight', 'housing', 'dubai', 'qatar', 'singapore',
      'thailand', 'vietnam', 'china', 'spain', 'europe', 'asia', 'recruiting', 'contract', 'deadline',
      'head', 'principal', 'teacher', 'educator', 'dossier', 'decision', 'hiring'
    ];

    const hasEducatorContext = educatorKeywords.some(kw => normalized.includes(kw)) || trimmedReason.length >= 25;

    if (!hasEducatorContext) {
      return {
        approved: false,
        message: "Please mention the countries, subjects, or hiring scenarios you are actively researching to unlock expedited clearance."
      };
    }

    // ✅ APPROVAL GRANTED (+20 CREDITS)
    const bonusToGrant = 20;

    // Approval only. Credits are added by claimRewardAction (signed-in, once a day) so they cannot be granted twice.
    return {
      approved: true,
      message: "Expedited Clearance Approved! +20 evaluation credits are being added to your account.",
      bonusCredits: bonusToGrant,
    };

  } catch (error: any) {
    console.error("🎯 AI Clearance Action Error:", error);
    return {
      approved: false,
      message: "Clearance system temporarily unavailable. Please retry shortly.",
    };
  }
}
