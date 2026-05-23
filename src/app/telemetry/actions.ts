'use server';

import { addDocument } from '@/firebase/admin';
import { headers } from 'next/headers';

/**
 * 🛰️ Action: Log Telemetry Event
 * Persists user interaction telemetry without storing PII.
 */
export async function logTelemetryEventAction(eventName: string, metadata: any, sessionId?: string) {
  try {
    const headersList = await headers();
    const clientCountry = 
      headersList.get('x-client-geo-country') || 
      headersList.get('cf-ipcountry') || 
      headersList.get('x-vercel-ip-country') || 
      'unknown';

    await addDocument('telemetry', {
      event_name: eventName,
      timestamp: new Date().toISOString(),
      session_id: sessionId || `sess_${Math.random().toString(36).substring(2, 11)}`,
      client_country: clientCountry,
      metadata: metadata || {}
    });
    return { success: true };
  } catch (e: any) {
    console.error("Failed to log telemetry event:", e.message || e);
    return { success: false, error: e.message };
  }
}

