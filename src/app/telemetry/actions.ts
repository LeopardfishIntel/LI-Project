'use server';

import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/firebase/server';

/**
 * 🛰️ Action: Log Telemetry Event
 * Persists user interaction telemetry without storing PII.
 */
export async function logTelemetryEventAction(eventName: string, metadata: any, sessionId?: string) {
  try {
    await addDoc(collection(db, 'telemetry'), {
      event_name: eventName,
      timestamp: new Date().toISOString(),
      session_id: sessionId || `sess_${Math.random().toString(36).substring(2, 11)}`,
      metadata: metadata || {}
    });
    return { success: true };
  } catch (e: any) {
    console.error("Failed to log telemetry event:", e.message || e);
    return { success: false, error: e.message };
  }
}
