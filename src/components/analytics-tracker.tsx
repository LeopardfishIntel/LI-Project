'use client';

import { useEffect } from 'react';
import { useFirestore, useAuth } from '@/firebase';
import { doc, increment } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase';
import { logTelemetryEventAction } from '@/app/admin/actions';

/**
 * @fileOverview A stealth analytics tracker that increments global visit metrics.
 * Runs on every page open to provide real-time field engagement data.
 */
export function AnalyticsTracker() {
  const firestore = useFirestore();
  const { user } = useAuth();

  useEffect(() => {
    if (firestore) {
      const counterRef = doc(firestore, 'app_metrics', 'page_views');
      // Incrementing site_visits by 1 using Firestore atomic increment
      setDocumentNonBlocking(
        counterRef, 
        { site_visits: increment(1) }, 
        { merge: true }
      );

      // 🛰️ Log page view to telemetry collection
      logTelemetryEventAction('page_view', {
        path: typeof window !== 'undefined' ? window.location.pathname : '',
        isAuthenticated: !!user,
        user_type: user ? 'authenticated' : 'guest'
      });
    }
  }, [firestore, user]);

  return null;
}