import { NextResponse } from 'next/server';
import { getSchoolStabilityReport } from '@/app/financial-forecaster/actions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schoolId, schoolName, city, country } = body;

    if (!schoolId || !schoolName) {
      return NextResponse.json({ error: "Missing schoolId or schoolName" }, { status: 400 });
    }

    // Fire background scrape task (concurrency and queue simulation)
    getSchoolStabilityReport({
      schoolId,
      schoolName,
      estimatedStaffBase: 0,
      city: city || "",
      country: country || ""
    }).catch(err => console.error("Cloud Task background scrape worker failed:", err));

    return NextResponse.json({ success: true, message: "Scrape job queued successfully" }, { status: 202 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
