import { NextResponse } from 'next/server';
import { getSchoolStabilityReport } from '@/app/financial-forecaster/actions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schoolId, schoolName, city, country } = body;

    if (!schoolId || !schoolName) {
      return NextResponse.json({ error: "Missing schoolId or schoolName" }, { status: 400 });
    }

    // Fire background scrape task (concurrency and queue simulation).
    // If it fails, clear the "refreshing" flag the daily sweep switched on so the school is not left stuck.
    const clearFlag = async (message: string) => {
      try {
        const { updateDocument } = await import('@/firebase/admin');
        await updateDocument('schools', schoolId, {
          isRevalidating: false,
          revalidationStatus: 'error',
          revalidationError: String(message).slice(0, 300)
        });
      } catch (e) {
        console.error("Could not clear isRevalidating after a failed scrape:", e);
      }
    };
    getSchoolStabilityReport({
      schoolId,
      schoolName,
      estimatedStaffBase: 0,
      city: city || "",
      country: country || "",
      forceRefresh: true
    })
      .then(async (res) => { if (res && res.error) await clearFlag(res.error); })
      .catch(async (err) => {
        console.error("Cloud Task background scrape worker failed:", err);
        await clearFlag(err?.message || String(err));
      });

    return NextResponse.json({ success: true, message: "Scrape job queued successfully" }, { status: 202 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
