import { NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { doc, setDoc } from 'firebase/firestore';

const TIMEOUT_MS = 5000;

/**
 * Executes a fetch request with a strict timeout limit.
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Fetches exchange rates for a given currency code.
 * Implements primary endpoint query with automated Cloudflare Pages fallback.
 */
async function fetchRates(currency: 'usd' | 'gbp'): Promise<Record<string, number>> {
  const primaryUrl = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${currency}.json`;
  const fallbackUrl = `https://latest.currency-api.pages.dev/v1/currencies/${currency}.json`;

  // 1. Attempt Primary (jsDelivr CDN)
  try {
    console.log(`TACTION: Fetching primary ${currency.toUpperCase()} exchange rates...`);
    const response = await fetchWithTimeout(primaryUrl);
    if (!response.ok) {
      throw new Error(`Primary API returned status code: ${response.status}`);
    }
    const data = await response.json();
    const rates = data[currency];
    if (rates && typeof rates === 'object' && Object.keys(rates).length > 0) {
      return rates;
    }
    throw new Error("Primary API response payload was empty or malformed.");
  } catch (primaryError: any) {
    console.warn(`WARNING: Primary API failed for ${currency.toUpperCase()}. Error: ${primaryError.message || primaryError}`);
    
    // 2. Attempt Fallback (Cloudflare Pages Mirror)
    try {
      console.log(`TACTION: Fetching fallback ${currency.toUpperCase()} exchange rates...`);
      const response = await fetchWithTimeout(fallbackUrl);
      if (!response.ok) {
        throw new Error(`Fallback API returned status code: ${response.status}`);
      }
      const data = await response.json();
      const rates = data[currency];
      if (rates && typeof rates === 'object' && Object.keys(rates).length > 0) {
        return rates;
      }
      throw new Error("Fallback API response payload was empty or malformed.");
    } catch (fallbackError: any) {
      console.error(`CRITICAL: Fallback API also failed for ${currency.toUpperCase()}. Error: ${fallbackError.message || fallbackError}`);
      throw new Error(`Failed to fetch ${currency.toUpperCase()} rates from all available providers.`);
    }
  }
}

export async function GET() {
  try {
    const usdRates = await fetchRates('usd');
    const gbpRates = await fetchRates('gbp');

    // Transform currency keys to uppercase to align with UI calculations
    const processedUsdRates: Record<string, number> = {};
    for (const [key, value] of Object.entries(usdRates)) {
      processedUsdRates[key.toUpperCase()] = Number(value);
    }
    processedUsdRates['USD'] = 1.0;

    const processedGbpRates: Record<string, number> = {};
    for (const [key, value] of Object.entries(gbpRates)) {
      processedGbpRates[key.toUpperCase()] = Number(value);
    }
    processedGbpRates['GBP'] = 1.0;

    // Persist to Firestore system collection
    const docRef = doc(db, 'system', 'exchange_rates');
    await setDoc(docRef, {
      usdBase: processedUsdRates,
      gbpBase: processedGbpRates,
      lastUpdated: new Date().toISOString()
    });

    console.log("SUCCESS: Exchange rates successfully updated to Firestore.");
    return NextResponse.json({ success: true, message: "Rates updated successfully." });

  } catch (error: any) {
    console.error("CRITICAL FAILURE: Rate update aborted.", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
