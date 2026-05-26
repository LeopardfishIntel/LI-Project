'use server';

import { addDocument, incrementField } from '@/firebase/admin';
import { headers } from 'next/headers';

// 🛰️ COUNTRY CODE TO FULL NAME DICTIONARY
const LANGUAGE_COUNTRY_MAP: Record<string, string> = {
  'GB': 'United Kingdom',
  'US': 'United States',
  'DE': 'Germany',
  'FR': 'France',
  'CZ': 'Czech Republic',
  'TH': 'Thailand',
  'SG': 'Singapore',
  'HK': 'Hong Kong',
  'AE': 'UAE',
  'ES': 'Spain',
  'IT': 'Italy',
  'NL': 'Netherlands',
  'CH': 'Switzerland',
  'CA': 'Canada',
  'AU': 'Australia',
  'JP': 'Japan',
  'IN': 'India',
  'MY': 'Malaysia',
  'VN': 'Vietnam',
  'KR': 'South Korea',
  'CN': 'China',
  'BR': 'Brazil',
  'ZA': 'South Africa',
  'NZ': 'New Zealand',
  'IE': 'Ireland',
  'BE': 'Belgium',
  'SE': 'Sweden',
  'NO': 'Norway',
  'DK': 'Denmark',
  'FI': 'Finland',
  'AT': 'Austria',
  'PT': 'Portugal'
};

/**
 * 🛰️ Action: Log Telemetry Event
 * Persists user interaction telemetry without storing PII.
 */
export async function logTelemetryEventAction(eventName: string, metadata: any, sessionId?: string) {
  try {
    const headersList = await headers();
    
    // 🌍 ADVANCED GEOLOCATION & LOCALHOST PARSING RESOLVER
    let clientCountry = 
      headersList.get('x-client-geo-country') || 
      headersList.get('cf-ipcountry') || 
      headersList.get('x-vercel-ip-country');

    const forwardedFor = headersList.get('x-forwarded-for') || '';
    const host = headersList.get('host') || '';
    const isLocalhost = 
      forwardedFor.includes('::1') || 
      forwardedFor.includes('127.0.0.1') || 
      host.includes('localhost') || 
      host.includes('127.0.0.1');

    if (!clientCountry || clientCountry.toLowerCase() === 'unknown') {
      // Fallback: Parse accept-language header to extract browser country/locale
      const acceptLanguage = headersList.get('accept-language') || '';
      const match = acceptLanguage.match(/[a-zA-Z]{2}-([a-zA-Z]{2})/);
      const countryCode = match ? match[1].toUpperCase() : null;

      if (countryCode && LANGUAGE_COUNTRY_MAP[countryCode]) {
        clientCountry = LANGUAGE_COUNTRY_MAP[countryCode];
      } else {
        // Sub-fallback: Parse primary two-letter language code prefix
        const langMatch = acceptLanguage.match(/^([a-zA-Z]{2})/);
        const langCode = langMatch ? langMatch[1].toLowerCase() : null;
        if (langCode === 'ja') clientCountry = 'Japan';
        else if (langCode === 'cs') clientCountry = 'Czech Republic';
        else if (langCode === 'ko') clientCountry = 'South Korea';
        else if (langCode === 'th') clientCountry = 'Thailand';
        else if (langCode === 'zh') clientCountry = 'China';
        else if (langCode === 'de') clientCountry = 'Germany';
        else if (langCode === 'fr') clientCountry = 'France';
        else if (langCode === 'es') clientCountry = 'Spain';
        else if (langCode === 'it') clientCountry = 'Italy';
        else if (langCode === 'nl') clientCountry = 'Netherlands';
        else clientCountry = 'unknown';
      }
    }

    if (isLocalhost) {
      if (clientCountry && clientCountry !== 'unknown') {
        clientCountry = `Localhost (${clientCountry})`;
      } else {
        clientCountry = 'Localhost (Dev)';
      }
    }

    // 🛰️ DIAGNOSTIC: Log headers to see what geolocation info is passed
    try {
      const allHeaders: Record<string, string> = {};
      headersList.forEach((value, key) => {
        allHeaders[key] = value;
      });
      await addDocument('diagnostics_headers', {
        timestamp: new Date().toISOString(),
        headers: allHeaders
      });
    } catch (diagErr) {
      console.error("Diagnostics header logging failed:", diagErr);
    }

    const visitorId = (metadata && metadata.visitor_id) ? metadata.visitor_id : 'unknown';
    if (metadata && metadata.visitor_id) {
      delete metadata.visitor_id;
    }

    await addDocument('telemetry', {
      event_name: eventName,
      timestamp: new Date().toISOString(),
      session_id: sessionId || `sess_${Math.random().toString(36).substring(2, 11)}`,
      visitor_id: visitorId,
      client_country: clientCountry,
      metadata: metadata || {}
    });

    // Securely update global counter increments on the server side
    if (eventName === 'page_view') {
      await incrementField('app_metrics', 'page_views', 'site_visits', 1);
    } else if (eventName === 'comparison_made') {
      await incrementField('app_metrics', 'page_views', 'comparisons_made', 1);
    }

    return { success: true };
  } catch (e: any) {
    console.error("Failed to log telemetry event:", e.message || e);
    return { success: false, error: e.message };
  }
}

