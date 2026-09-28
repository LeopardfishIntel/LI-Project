'use client';

import { useEffect } from 'react';
import { useAuth } from '@/firebase';
import { logTelemetryEvent } from '@/lib/telemetry';

/**
 * @fileOverview A stealth analytics tracker that increments global visit metrics.
 * Runs on every page open to provide real-time field engagement data.
 */
export function AnalyticsTracker() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    if (path.startsWith('/admin')) {
      return;
    }

    // Generate/Retrieve persistent anonymous Visitor ID and visit counts from localStorage
    let visitorId = 'unknown';
    let isReturnVisitor = false;
    let visitCount = 1;

    if (typeof window !== 'undefined') {
      try {
        let storedId = localStorage.getItem('lfi_visitor_id');
        let storedVisits = parseInt(localStorage.getItem('lfi_visit_count') || '0', 10);
        let lastVisitDate = localStorage.getItem('lfi_last_visit_date');
        const todayDate = new Date().toISOString().split('T')[0];

        if (!storedId) {
          storedId = `vis_${Math.random().toString(36).substring(2, 11)}${Date.now().toString(36)}`;
          localStorage.setItem('lfi_visitor_id', storedId);
          localStorage.setItem('lfi_visit_count', '1');
          localStorage.setItem('lfi_last_visit_date', todayDate);
        } else {
          isReturnVisitor = true;
          if (lastVisitDate !== todayDate) {
            visitCount = storedVisits + 1;
            localStorage.setItem('lfi_visit_count', String(visitCount));
            localStorage.setItem('lfi_last_visit_date', todayDate);
            // Log dedicated return_visit event once per new return day
            logTelemetryEvent('return_visit', {
              path,
              visitor_id: storedId,
              visit_count: visitCount,
              isAuthenticated: !!user,
              user_type: user ? 'authenticated' : 'guest',
              user_email: user?.email
            });
          } else {
            visitCount = storedVisits || 1;
          }
        }
        visitorId = storedId;
      } catch (err) {
        console.warn("Telemetry localStorage disabled, using transient tracking.");
      }
    }

    // 🛰️ Log page view to telemetry collection (server handles atomic metrics increment)
    logTelemetryEvent('page_view', {
      path,
      isAuthenticated: !!user,
      user_type: user ? 'authenticated' : 'guest',
      visitor_id: visitorId,
      is_return_visitor: isReturnVisitor,
      visit_count: visitCount,
      user_email: user?.email
    });
  }, [user, loading]);

  return null;
}