import { auth } from '@/firebase';
import { logTelemetryEventAction } from '@/app/telemetry/actions';

/**
 * 🛰️ Client-side Telemetry Interceptor / Wrapper
 * Prevents telemetry tracking when:
 * 1. Running on localhost / 127.0.0.1
 * 2. Logged in as Fred (email: fred@leopardfish.intel, ID: FLI007)
 */
export async function logTelemetryEvent(eventName: string, metadata: any = {}, sessionId?: string) {
  // 1. Exclude localhost client-side
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      console.log(`[Telemetry Bypass] Event '${eventName}' blocked (localhost)`);
      return { success: true };
    }
  }

  // 2. Exclude Fred FLI007 login
  const currentUser = auth.currentUser;
  const passedEmail = metadata?.user_email || metadata?.email;
  if (currentUser?.email === 'fred@leopardfish.intel' || passedEmail === 'fred@leopardfish.intel') {
    console.log(`[Telemetry Bypass] Event '${eventName}' blocked (Fred / FLI007 login)`);
    return { success: true };
  }

  // Otherwise, invoke the Server Action
  return logTelemetryEventAction(eventName, metadata, sessionId);
}
