import { NextResponse } from "next/server";
import { rejectUnlessCron } from "@/lib/cronAuth";
import { runDirectScheduled } from "@/lib/search/direct/directRunner";

export const maxDuration = 300;

/**
 * Direct engine (schools' own careers pages). Password-protected like the other cron routes.
 * Reads up to 25 pilot schools per call, longest-ago checked first. Every job it finds goes in as PENDING (Direct is not signed off).
 */
export async function GET(request: Request) {
  const denied = await rejectUnlessCron(request);
  if (denied) return denied;
  try {
    const { picked, outcomes } = await runDirectScheduled({ limit: 25, budgetMs: 240000 });
    const results: Record<string, number> = {};
    outcomes.forEach((o) => { results[o.result.status] = (results[o.result.status] || 0) + 1; });
    return NextResponse.json({
      status: "success",
      schoolsPicked: picked.length,
      schoolsRead: outcomes.length,
      results,
      jobsFound: outcomes.reduce((a, o) => a + o.result.jobs.length, 0),
      jobsAdded: outcomes.reduce((a, o) => a + (o.ingested?.addedCount || 0), 0),
    });
  } catch (e: any) {
    return NextResponse.json({ status: "error", message: String(e?.message || e) }, { status: 500 });
  }
}
