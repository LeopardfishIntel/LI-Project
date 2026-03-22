import { seedTeacher } from "@/lib/seed";
import { NextResponse } from "next/server";

export async function GET() {
  await seedTeacher();
  return NextResponse.json({ message: "Database Seeded" });
}
