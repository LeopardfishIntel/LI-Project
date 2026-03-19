import { NextRequest, NextResponse } from "next/server";
import { matchmaker } from "@lib/matchmaker"; 
import { generateIntelBriefing } from "@ai/flows/generate-intel-briefing";
import { db } from "@firebase/config";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, fitnessData } = body;

    if (!userId || !fitnessData) {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 });
    }

    // Process Matchmaker Logic
    const matchResults = await matchmaker(fitnessData);

    // Generate AI Briefing
    let aiBriefing;
    try {
      aiBriefing = await generateIntelBriefing(matchResults);
    } catch (e) {
      aiBriefing = "Tactical Intel Offline.";
    }

    // Save to Firestore
    const reportRef = doc(db, "analyses", `${userId}_${Date.now()}`);
    await setDoc(reportRef, {
      userId,
      matchResults,
      briefing: aiBriefing,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ status: "success", data: matchResults });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}