import { db } from '@/firebase/config';
import { doc, updateDoc, increment, setDoc } from 'firebase/firestore';

export async function incrementComparisonCount() {
  const metricRef = doc(db, 'application_metrics', 'comparisons');
  
  try {
    // This will either update the existing count or create it if missing
    await updateDoc(metricRef, {
      count: increment(1)
    });
  } catch (error) {
    // Fallback if the document doesn't exist yet
    await setDoc(metricRef, { count: 1 }, { merge: true });
  }
}
