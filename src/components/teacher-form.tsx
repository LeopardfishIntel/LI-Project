 "use client";

import React, { useState } from "react";
import { db, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import type { TeacherProfile } from "@/lib/types";
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react";

export function TeacherForm() {
  const [status, setStatus] = useState<"IDLE" | "SYNCING" | "SUCCESS" | "FAILURE">("IDLE");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("SYNCING");

    const formData = new FormData(e.currentTarget);
    const fullName = formData.get("fullName") as string;
    const agentId = crypto.randomUUID();

    const profileData: TeacherProfile = {
      uid: agentId,
      id: agentId,
      fullName: fullName,
      email: `${agentId.substring(0, 8)}@leopardfish.intel`,
      isVerifiedTeacher: false,
      familyStatus: "Single",
      ageGroup: "30-40",
      memberSince: new Date(),
      yearsOfExperience: 0,
      qualifications: [],
      preferredRegions: [],
      preferredCountries: [],
      goal: "balanced"
    };

    try {
      const docRef = doc(db, "users", agentId, "teacherProfile", agentId);
      await setDocumentNonBlocking(docRef, profileData);
      setStatus("SUCCESS");
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error("REGISTRATION_FAILURE:", error);
      setStatus("FAILURE");
    }
  }

  return (
    <form 
      onSubmit={handleSubmit} 
      className="space-y-6 max-w-md bg-[#1f2937]/50 backdrop-blur-md p-8 border border-white/10 rounded-sm shadow-2xl"
    >
      <div className="space-y-2">
        <label className="block text-[#94a3b8] font-black tracking-widest uppercase text-[10px]">
          Operative Full Name
        </label>
        <input 
          name="fullName" 
          className="w-full bg-black/40 border border-white/10 p-3 text-white font-bold focus:border-primary outline-none transition-colors" 
          placeholder="e.g. J. Bourne"
          required 
          disabled={status === "SYNCING"}
        />
      </div>

      <button 
        type="submit" 
        disabled={status === "SYNCING"}
        className="relative w-full bg-primary text-white font-black p-4 hover:bg-orange-600 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
      >
        {status === "SYNCING" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          "REGISTER AGENT"
        )}
      </button>

      {status === "SUCCESS" && (
        <div className="flex items-center justify-center gap-2 text-green-400 font-black text-[10px] tracking-widest animate-pulse">
          <ShieldCheck className="size-4" /> TACTICAL SUCCESS: UPLINK ESTABLISHED
        </div>
      )}

      {status === "FAILURE" && (
        <div className="flex items-center justify-center gap-2 text-red-500 font-black text-[10px] tracking-widest">
          <AlertTriangle className="size-4" /> MISSION FAILURE: COMMS OFFLINE
        </div>
      )}
    </form>
  );
}