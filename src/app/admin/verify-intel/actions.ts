
'use server';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore/lite';
import { firebaseConfig } from '@/firebase/config';
import { verifyIntelligence } from '@/ai/flows/verify-intelligence-flow';

export type PromotionResult = {
  success: boolean;
  message: string;
  intelId?: string;
};

// Server-side initialization
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const firestore = getFirestore(app);

/**
 * Promotes a report from staging (pending_intel) to live (verified_intel).
 * This involves Genkit-powered editorial polishing, database archival, and agent notification.
 */
export async function promoteIntelToLive(pendingReportId: string): Promise<PromotionResult> {
  try {
    // 1. Fetch from Staging
    const pendingRef = doc(firestore, 'pending_intel', pendingReportId);
    const pendingSnap = await getDoc(pendingRef);

    if (!pendingSnap.exists()) {
      return { success: false, message: 'Dossier not found in staging.' };
    }

    const pendingData = pendingSnap.data();

    // 2. Editorial Polish & Tagging
    console.log(`Editor initiating final polish for dossier: ${pendingReportId}`);
    const polishedIntel = await verifyIntelligence({
      content: pendingData.clean_text || pendingData.original_content,
      category: pendingData.category
    });

    // 3. Promotion to Live Database
    const liveRef = collection(firestore, 'verified_intel');
    const newLiveDoc = await addDoc(liveRef, {
      ...polishedIntel,
      is_verified: true,
      original_report_id: pendingReportId,
      attachmentUrl: pendingData.attachmentUrl || '',
      timestamp: serverTimestamp(),
      authorId: pendingData.authorId || 'anonymous',
      authorEmail: pendingData.authorEmail || ''
    });

    // 4. Automated Signal: Intel Deployed Email
    if (pendingData.authorEmail) {
      console.log('Queuing Deployment Signal to Agent...');
      const mailRef = collection(firestore, 'mail');
      await addDoc(mailRef, {
        to: pendingData.authorEmail,
        message: {
          subject: `[INTEL LIVE] Your Report is Now Operational`,
          text: `Agent,\n\nYour intelligence regarding ${polishedIntel.organisation} has been cleared for field use. It is now live on the Leopard Fish Intel global map.\n\nYour contribution directly assists other teachers in navigating high-risk contracts and identifying institutional red flags. Your identity remains masked per your selected protocol.\n\nView Deployment: https://leopardfishintel.com/directory\n\nThank you for strengthening the network.\n\n— L.F.I. Command`,
          html: `
            <div style="font-family: monospace; background: #080c18; color: #f8fafc; padding: 20px; border: 1px solid #38bdf8;">
              <h2 style="color: #38bdf8; text-transform: uppercase; border-bottom: 1px solid #38bdf8; padding-bottom: 10px;">[INTEL LIVE] Report Operational</h2>
              <p>Agent,</p>
              <p>Your intelligence regarding <strong>${polishedIntel.organisation}</strong> has been cleared for field use. It is now live on the Leopard Fish Intel global map.</p>
              <p>Your contribution directly assists other teachers in navigating high-risk contracts and identifying institutional red flags. Your identity remains masked per your selected protocol.</p>
              <p style="margin: 20px 0;">
                <a href="https://leopardfishintel.com/directory" style="background: #38bdf8; color: #080c18; padding: 10px 20px; text-decoration: none; font-weight: bold; text-transform: uppercase;">View Deployment</a>
              </p>
              <p>Thank you for strengthening the network.</p>
              <p style="border-top: 1px solid #38bdf8; padding-top: 10px;">— L.F.I. Command</p>
            </div>
          `
        }
      });
    }

    // 5. Purge Staging Area
    await deleteDoc(pendingRef);

    return { 
      success: true, 
      message: 'Intelligence dossier promoted to live database. Staging purged. Agent signalled.',
      intelId: newLiveDoc.id 
    };

  } catch (error: any) {
    console.error('Promotion sequence failure:', error);
    return { success: false, message: error.message || 'Transmission error.' };
  }
}
