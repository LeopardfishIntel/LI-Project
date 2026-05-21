
'use server';
/**
 * @fileOverview A tactical intel transmission flow with automated security moderation and agent notification.
 *
 * - transmitIntelligence - Secure archival and receipt signal queuing in the staging area.
 */

import { getAI } from '@/ai/genkit';
import { z } from 'zod';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore/lite';
import { firebaseConfig } from '@/firebase/config';
import { moderateIntelligence } from './moderate-intelligence-flow';

const TransmitIntelligenceInputSchema = z.object({
  category: z.string().describe('The dossier classification.'),
  organisation: z.string().describe('The targeted school or agency.'),
  location: z.string().describe('The city or country of the intel.'),
  content: z.string().describe('The narrative payload.'),
  authorId: z.string().optional().describe('The UID of the transmitting agent.'),
  authorEmail: z.string().optional().describe('The email of the transmitting agent.'),
});
export type TransmitIntelligenceInput = z.infer<typeof TransmitIntelligenceInputSchema>;

export async function transmitIntelligence(input: TransmitIntelligenceInput) {
  return transmitIntelligenceFlow(input);
}

// Server-side initialization
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const firestore = getFirestore(app);

export const transmitIntelligenceFlow = getAI().defineFlow(
  {
    name: 'transmitIntelFlow',
    inputSchema: TransmitIntelligenceInputSchema,
    outputSchema: z.string().describe('Success Token'),
  },
  async (input: TransmitIntelligenceInput) => {
    // 1. Security Moderation Stage (AI Filter & Bias Check)
    console.log('Initiating AI Security & Editorial Filter...');
    const moderation = await moderateIntelligence({ content: input.content });

    // 2. Staging Area Archival (pending_intel)
    console.log('Archiving Dossier to Staging Area for Human Review...');
    const stagingRef = collection(firestore, 'pending_intel');
    await addDoc(stagingRef, {
      category: input.category,
      organisation: input.organisation,
      location: input.location,
      original_content: input.content,
      clean_text: moderation.clean_text,
      status: moderation.status,
      safety_flags: moderation.safety_flags,
      confidence_score: moderation.confidence_score,
      suspect_bias: moderation.suspect_bias,
      ratified_data_points: moderation.ratified_data_points,
      timestamp: serverTimestamp(),
      authorId: input.authorId || 'anonymous',
      authorEmail: input.authorEmail || ''
    });

    return 'Success';
  }
);
