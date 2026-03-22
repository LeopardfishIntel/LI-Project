import { NextResponse } from 'next/server';
import { generateIntelBriefing } from '@/ai/flows/generate-intel-briefing';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    if (!body || !body.matchResults) {
      return NextResponse.json(
        { success: false, error: "Missing matchResults in tactical payload" },
        { status: 400 }
      );
    }

    const briefingResult = await generateIntelBriefing(JSON.stringify(body.matchResults));

    // 🛡️ TACTICAL FIX: Safe property access to satisfy TypeScript
    if (!briefingResult.success) {
      const errorMessage = (briefingResult as any).error || "Intelligence synthesis failed";
      throw new Error(errorMessage);
    }

    return NextResponse.json({ 
      success: true, 
      data: briefingResult.data 
    });

  } catch (error: any) {
    console.error("ROUTE_LOG_ANALYSIS_FIT_FAILURE:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal Tactical Link Failure" }, 
      { status: 500 }
    );
  }
}