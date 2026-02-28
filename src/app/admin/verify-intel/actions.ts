'use server';

import { initializeFirebase } from '@/firebase';
import { doc, getDoc, collection, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { verifyIntelligence } from '@/ai/flows/verify-intelligence-flow';

export type PromotionResult = {
  success: boolean;
  message: string;
  intelId?: string;
};

/**
 * Promotes a report from staging (pending_intel) to live (verified_intel).
 * This involves Genkit-powered editorial polishing and database archival.
 */
export async function promoteIntelToLive(pendingReportId: string): Promise<PromotionResult> {
  try {
    const { firestore } = await initializeFirebase();
    if (!firestore) throw new Error('Firestore not initialised.');

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
      authorId: pendingData.authorId || 'anonymous'
    });

    // 4. Purge Staging Area
    await deleteDoc(pendingRef);

    return { 
      success: true, 
      message: 'Intelligence dossier promoted to live database. Staging purged.',
      intelId: newLiveDoc.id 
    };

  } catch (error: any) {
    console.error('Promotion sequence failure:', error);
    return { success: false, message: error.message || 'Transmission error.' };
  }
}
