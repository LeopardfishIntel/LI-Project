import { NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { doc, setDoc } from 'firebase/firestore';

export async function GET() {
  try {
    console.log("TACTION: Fetching live USD exchange rates...");
    const usdResponse = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
    const usdData = await usdResponse.json();

    console.log("TACTION: Fetching live GBP exchange rates...");
    const gbpResponse = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/gbp.json');
    const gbpData = await gbpResponse.json();

    const usdRates = usdData.usd;
    const gbpRates = gbpData.gbp;

    if (!usdRates || !gbpRates) {
      throw new Error("Failed to parse rates from free CDN API.");
    }

    // Process rates so they are uppercase keys to match our codebase
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

    // Save to Firestore
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
