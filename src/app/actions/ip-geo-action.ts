'use server';

import { headers } from 'next/headers';

export interface IpGeoResult {
  clientIp: string;
  ipCity: string;
  ipCountry: string;
  isMismatch: boolean;
  reason?: string;
}

/**
 * Server action to inspect client connection headers / IP and verify alignment with claimed city.
 */
export async function verifyIpLocationAction(claimedCity: string): Promise<IpGeoResult> {
  const headerList = await headers();
  const forwardedFor = headerList.get('x-forwarded-for');
  const realIp = headerList.get('x-real-ip');
  const cfCountry = headerList.get('cf-ipcountry');
  const vercelCountry = headerList.get('x-vercel-ip-country');
  const vercelCity = headerList.get('x-vercel-ip-city');

  const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || '127.0.0.1');

  let ipCity = vercelCity || '';
  let ipCountry = vercelCountry || cfCountry || '';

  // If running in cloud or public network, perform lightweight lookup if header metadata is empty
  if (!ipCity && clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1' && !clientIp.startsWith('192.168.') && !clientIp.startsWith('10.')) {
    try {
      const res = await fetch(`https://ipwho.is/${clientIp}`, { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          ipCity = data.city || '';
          ipCountry = data.country || '';
        }
      }
    } catch (e) {
      // Fail safely
    }
  }

  const cleanClaimed = (claimedCity || '').toLowerCase().trim();
  const cleanIpCity = (ipCity || '').toLowerCase().trim();
  const cleanIpCountry = (ipCountry || '').toLowerCase().trim();

  let isMismatch = false;
  let reason = '';

  // Check if claimed city contradicts IP city/country (ignoring localhost / internal networks)
  if (cleanClaimed && (cleanIpCity || cleanIpCountry)) {
    const isCityMatch = cleanIpCity && (cleanIpCity.includes(cleanClaimed) || cleanClaimed.includes(cleanIpCity));
    const isCountryMatch = cleanIpCountry && (cleanIpCountry.includes(cleanClaimed) || cleanClaimed.includes(cleanIpCountry));

    if (!isCityMatch && !isCountryMatch && (cleanIpCity || cleanIpCountry)) {
      isMismatch = true;
      reason = `Location mismatch: User specified employment city "${claimedCity}", but connected from IP in "${ipCity ? ipCity + ', ' : ''}${ipCountry}" (${clientIp})`;
    }
  }

  return {
    clientIp,
    ipCity,
    ipCountry,
    isMismatch,
    reason: isMismatch ? reason : undefined,
  };
}
