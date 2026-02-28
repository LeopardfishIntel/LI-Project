
'use server';
/**
 * @fileOverview A tactical intelligence transmission flow with automated security moderation.
 *
 * - transmitIntelligence - Secure archival and archival status streaming.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { moderateIntelligence } from './moderate-intelligence-flow';

const TransmitIntelligenceInputSchema = z.object({
  category: z.string().describe('The dossier classification.'),
  content: z.string().describe('The narrative payload.'),
  authorId: z.string().optional().describe('The UID of the transmitting agent.'),
  file: z.object({
    base64: z.string().describe('The encoded file payload.'),
    name: z.string().describe('The filename for the archival ref.'),
    mimeType: z.string().describe('The media type.')
  }).optional()
});
export type TransmitIntelligenceInput = z.infer<typeof TransmitIntelligenceInputSchema>;

export async function transmitIntelligence(input: TransmitIntelligenceInput) {
  return transmitIntelligenceFlow(input);
}

export const transmitIntelligenceFlow = ai.defineFlow(
  {
    name: 'transmitIntelligenceFlow',
    inputSchema: TransmitIntelligenceInputSchema,
    outputSchema: z.string().describe('Success Token'),
  },
  async (input) => {
    const { firestore, storage } = await initializeFirebase();
    let attachmentUrl = '';

    // 1. Security Moderation Stage
    console.log('Initiating Security Moderation...');
    const moderation = await moderateIntelligence({ content: input.content });

    // 2. Storage Uplink (if evidence provided)
    if (input.file && storage) {
      console.log('Archiving Intelligence Attachment...');
      const storagePath = `intelligence/${Date.now()}_${input.file.name}`;
      const storageRef = ref(storage, storagePath);
      
      await uploadString(storageRef, input.file.base64, 'data_url', {
        contentType: input.file.mimeType
      });
      
      attachmentUrl = await getDownloadURL(storageRef);
    }

    // 3. Staging Area Archival (pending_intel)
    if (firestore) {
      console.log('Finalising Dossier Submission to Staging...');
      const stagingRef = collection(firestore, 'pending_intel');
      await addDoc(stagingRef, {
        category: input.category,
        original_content: input.content,
        clean_text: moderation.clean_text,
        status: moderation.status,
        safety_flags: moderation.safety_flags,
        confidence_score: moderation.confidence_score,
        attachmentUrl,
        timestamp: serverTimestamp(),
        authorId: input.authorId || 'anonymous'
      });
    }

    return 'Success';
  }
);
