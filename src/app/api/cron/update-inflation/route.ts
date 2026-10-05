import { NextResponse } from 'next/server';
import { rejectUnlessCron } from "@/lib/cronAuth";
import { setDocument } from '@/firebase/admin';
import { ALL_ISO3, type InflationEntry } from '@/lib/inflation';

export const maxDuration = 60;

/**
 * Monthly job (20th): pulls the latest year-on-year CPI inflation per country
 * from the IMF CPI database and stores it at system/inflation_rates.
 * Countries the IMF has no data for are simply left out ("not reported").
 */
export async function GET(request: Request) {
  const denied = rejectUnlessCron(request);
  if (denied) return denied;
  try {
    const url =
      `https://api.imf.org/external/sdmx/2.1/data/IMF.STA,CPI/${ALL_ISO3.join('+')}` +
      `.CPI._T.YOY_PCH_PA_PT.M?startPeriod=${startPeriod()}&format=sdmx-json`;

    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(45000) });
    if (!res.ok) throw new Error(`IMF API returned ${res.status}`);
    const json = await res.json();

    const structure = json?.structure?.dimensions;
    const countries: { id: string }[] = structure?.series?.find((d: any) => d.id === 'COUNTRY')?.values || [];
    const periods: { id: string }[] = structure?.observation?.find((d: any) => d.id === 'TIME_PERIOD')?.values || [];
    const series = json?.dataSets?.[0]?.series || {};

    const byIso3: Record<string, InflationEntry> = {};
    for (const [key, s] of Object.entries<any>(series)) {
      const iso = countries[Number(key.split(':')[0])]?.id;
      const obs = s?.observations || {};
      const idxs = Object.keys(obs).map(Number).sort((a, b) => b - a);
      for (const i of idxs) {
        const val = parseFloat(obs[i]?.[0]);
        const period = periods[i]?.id;
        const pm = String(period || '').match(/^(\d{4})-M?(\d{1,2})/);
        if (iso && pm && !isNaN(val)) {
          byIso3[iso] = { rate: Math.round(val * 10) / 10, period: `${pm[1]}-${pm[2].padStart(2, '0')}` };
          break;
        }
      }
    }

    if (Object.keys(byIso3).length === 0) throw new Error('IMF returned no usable data; keeping previous figures.');

    // Merge so a country missing this month keeps its last known figure (staleness rule hides it after 12 months).
    const { getDocument } = await import('@/firebase/admin');
    const existing = await getDocument('system', 'inflation_rates');
    const previous = existing.exists() ? (existing.data() as any)?.byIso3 || {} : {};
    const merged = { ...previous, ...byIso3 };

    await setDocument('system', 'inflation_rates', {
      byIso3: merged,
      source: 'IMF CPI database',
      lastUpdated: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, countriesUpdated: Object.keys(byIso3).length, total: Object.keys(merged).length });
  } catch (error: any) {
    console.error('Inflation update failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function startPeriod(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 12);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
