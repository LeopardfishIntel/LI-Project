
'use server';
/**
 * @fileOverview A tactical intel transmission flow with automated security moderation and agent notification.
 *
 * - transmitIntelligence - Secure archival and receipt signal queuing.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { moderateIntelligence } from './moderate-intelligence-flow';

const TransmitIntelligenceInputSchema = z.object({
  category: z.string().describe('The dossier classification.'),
  organisation: z.string().describe('The targeted school or agency.'),
  location: z.string().describe('The city or country of the intel.'),
  content: z.string().describe('The narrative payload.'),
  authorId: z.string().optional().describe('The UID of the transmitting agent.'),
  authorEmail: z.string().optional().describe('The email of the transmitting agent.'),
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
    name: 'transmitIntelFlow',
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
      console.log('Archiving Intel Attachment...');
      const storagePath = `intel/${Date.now()}_${input.file.name}`;
      const storageRef = ref(storage, storagePath);
      
      await uploadString(storageRef, input.file.base64, 'data_url', {
        contentType: input.file.mimeType
      });
      
      attachmentUrl = await getDownloadURL(storageRef);
    }

    // 3. Staging Area Archival (pending_intel)
    let reportId = '';
    if (firestore) {
      console.log('Finalising Dossier Submission to Staging...');
      const stagingRef = collection(firestore, 'pending_intel');
      const reportDoc = await addDoc(stagingRef, {
        category: input.category,
        organisation: input.organisation,
        location: input.location,
        original_content: input.content,
        clean_text: moderation.clean_text,
        status: moderation.status,
        safety_flags: moderation.safety_flags,
        confidence_score: moderation.confidence_score,
        attachmentUrl,
        timestamp: serverTimestamp(),
        authorId: input.authorId || 'anonymous',
        authorEmail: input.authorEmail || ''
      });
      reportId = reportDoc.id;

      // 4. Automated Signal: Initial Receipt Email
      if (input.authorEmail) {
        console.log('Queuing Receipt Signal to Agent...');
        const mailRef = collection(firestore, 'mail');
        await addDoc(mailRef, {
          to: input.authorEmail,
          message: {
            subject: `[INTEL SECURED] Signal Received: Case #${reportId}`,
            text: `Agent,\n\nYour field report regarding ${input.organisation} has been successfully transmitted via an encrypted channel.\n\nStatus: PENDING CLEARANCE\n\nOur analysts are currently verifying the data for operational security. To protect our network, reports containing unredacted PII (Personal Identifiable Information) or non-verifiable signatures will be scrubbed.\n\nSelf-Destruct Sequence: For your safety, we recommend clearing your browser’s cache and temporary files now that the transmission is complete.\n\nYou will receive a follow-up signal once your intel has been deployed to the live database.\n\nStay vigilant.\n\n— L.F.I. Command`,
            html: `
              <div style="font-family: monospace; background: #080c18; color: #f8fafc; padding: 20px; border: 1px solid #f97316;">
                <h2 style="color: #f97316; text-transform: uppercase; border-bottom: 1px solid #f97316; padding-bottom: 10px;">[INTEL SECURED] Signal Received</h2>
                <p><strong>Case ID:</strong> #${reportId}</p>
                <p>Agent,</p>
                <p>Your field report regarding <strong>${input.organisation}</strong> has been successfully transmitted via an encrypted channel.</p>
                <p><strong>Status:</strong> <span style="color: #fbbf24;">PENDING CLEARANCE</span></p>
                <p>Our analysts are currently verifying the data for operational security. To protect our network, reports containing unredacted PII (Personal Identifiable Information) or non-verifiable signatures will be scrubbed.</p>
                <p><strong>Self-Destruct Sequence:</strong> For your safety, we recommend clearing your browser’s cache and temporary files now that the transmission is complete.</p>
                <p>You will receive a follow-up signal once your intel has been deployed to the live database.</p>
                <p>Stay vigilant.</p>
                <p style="border-top: 1px solid #f97316; padding-top: 10px;">— L.F.I. Command</p>
              </div>
            `
          }
        });
      }
    }

    return 'Success';
  }
);
