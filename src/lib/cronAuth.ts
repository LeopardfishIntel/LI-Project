import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/firebase/admin";

/**
 * Password check for the scheduled (cron) endpoints.
 * The caller must send:  Authorization: Bearer <password>
 *
 * Where the password lives:
 *   1. The server setting CRON_SECRET, if it is there (the hosting did not pass it on, so this is normally empty), else
 *   2. The private database document  cron_private/auth  (field "secret").
 *      Not in the database rules, so website visitors can never read it. Only the server's admin access can.
 * If no password can be found anywhere, every call is refused (safe by default).
 */

let cached: { value: string; at: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

async function getServerPassword(): Promise<string> {
  const fromEnv = process.env.CRON_SECRET;
  if (fromEnv) return fromEnv;
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  try {
    const db = getAdminDb();
    if (!db) return "";
    const snap = await db.collection("cron_private").doc("auth").get();
    const value = snap.exists ? String((snap.data() || {}).secret || "") : "";
    cached = { value, at: Date.now() };
    return value;
  } catch (e) {
    console.error("cronAuth: could not read the password document:", e);
    return "";
  }
}

export async function isAuthorizedCron(request: Request): Promise<boolean> {
  const secret = await getServerPassword();
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Returns a 401 answer when the call is not allowed, or null when it is fine to continue. */
export async function rejectUnlessCron(request: Request): Promise<NextResponse | null> {
  if (await isAuthorizedCron(request)) return null;
  const secret = await getServerPassword();
  const header = request.headers.get("authorization") || "";
  // Temporary helper while setting up: yes/no facts and lengths only, never the password itself.
  return NextResponse.json(
    {
      status: "error",
      error: "Unauthorized",
      why: {
        serverHasPassword: !!secret,
        serverPasswordLength: secret.length,
        callHadBearerHeader: header.startsWith("Bearer "),
        callPasswordLength: header.startsWith("Bearer ") ? header.length - 7 : 0,
      },
    },
    { status: 401 }
  );
}
