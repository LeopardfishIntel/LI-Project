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

    // Generate/Retrieve persistent anonymous Visitor ID from localStorage
    let visitorId = 'unknown';
    if (typeof window !== 'undefined') {
      try {
        let storedId = localStorage.getItem('lfi_visitor_id');
        if (!storedId) {
          storedId = `vis_${Math.random().toString(36).substring(2, 11)}${Date.now().toString(36)}`;
          localStorage.setItem('lfi_visitor_id', storedId);
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
      user_email: user?.email
    });
  }, [user, loading]);

  return null;
}