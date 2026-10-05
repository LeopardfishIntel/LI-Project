import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

/**
 * Password check for the scheduled (cron) endpoints.
 * The caller must send:  Authorization: Bearer <CRON_SECRET>
 * If CRON_SECRET is not set on the server, every call is refused (safe by default).
 */
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Returns a 401 answer when the call is not allowed, or null when it is fine to continue. */
export function rejectUnlessCron(request: Request): NextResponse | null {
  if (isAuthorizedCron(request)) return null;
  // Temporary helper while setting up: says WHY the call was refused (yes/no facts only, never the password itself).
  const header = request.headers.get("authorization") || "";
  return NextResponse.json(
    {
      status: "error",
      error: "Unauthorized",
      why: {
        serverHasPassword: !!process.env.CRON_SECRET,
        serverPasswordLength: (process.env.CRON_SECRET || "").length,
        callHadBearerHeader: header.startsWith("Bearer "),
        callPasswordLength: header.startsWith("Bearer ") ? header.length - 7 : 0,
      },
    },
    { status: 401 }
  );
}
