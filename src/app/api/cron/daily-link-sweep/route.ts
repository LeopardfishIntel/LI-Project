import { NextResponse } from 'next/server';
import { runDailyLinkSweep } from '@/lib/janitor/dailyLinkSweeper';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    console.log('🛸 [CRON API] Daily Link Sweep Route Triggered...');
    const telemetry = await runDailyLinkSweep();

    return NextResponse.json({
      status: 'success',
      message: 'Daily HTTP Link Sweep and Takedown Check Completed Successfully.',
      telemetry
    });
  } catch (err: any) {
    console.error('❌ Error in daily-link-sweep cron route:', err);
    return NextResponse.json(
      { status: 'error', error: err?.message || String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
