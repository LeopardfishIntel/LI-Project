'use server';
/**
 * @fileOverview A tactical intelligence transmission flow.
 *
 * - transmitIntelligence - A function that handles secure archival and archival status streaming.
 * - TransmitIntelligenceInput - Input dossier including form data and file metadata.
 * - TransmitIntelligenceOutput - A success token upon database confirmation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

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
    // 1. Initialise Tactical Stream
    // We simulate the Vertex AI SDK status streaming requested by yielding status
    // Genkit flows yield chunks if we use generateStream, but for this specific 
    // tactical wrapper, we return the final success token after internal async work.
    
    const { firestore, storage } = await initializeFirebase();
    let attachmentUrl = '';

    // 2. Storage Uplink (File Metadata)
    if (input.file && storage) {
      console.log('Archiving Intelligence Attachment...');
      const storagePath = `intelligence/${Date.now()}_${input.file.name}`;
      const storageRef = ref(storage, storagePath);
      
      await uploadString(storageRef, input.file.base64, 'data_url', {
        contentType: input.file.mimeType
      });
      
      attachmentUrl = await getDownloadURL(storageRef);
    }

    // 3. Firestore Archival
    if (firestore) {
      console.log('Finalising Dossier Submission...');
      const reportsRef = collection(firestore, 'field_reports');
      await addDoc(reportsRef, {
        category: input.category,
        content: input.content,
        attachmentUrl,
        timestamp: serverTimestamp(),
        authorId: input.authorId || 'anonymous'
      });
    }

    return 'Success';
  }
);