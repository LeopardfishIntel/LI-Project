'use client';

import { useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc, increment } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase';

/**
 * @fileOverview A stealth analytics tracker that increments global visit metrics.
 * Runs on every page open to provide real-time field engagement data.
 */
export function AnalyticsTracker() {
  const firestore = useFirestore();

  useEffect(() => {
    if (firestore) {
      const counterRef = doc(firestore, 'app_metrics', 'page_views');
      // Incrementing site_visits by 1 using Firestore atomic increment
      setDocumentNonBlocking(
        counterRef, 
        { site_visits: increment(1) }, 
        { merge: true }
      );
    }
  }, [firestore]);

  return null;
}