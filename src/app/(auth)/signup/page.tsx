"use client";

import { useState } from "react";
import { auth, db, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { createUserWithEmailAndPassword, getIdToken } from "firebase/auth";
import { TeacherProfile } from "@/lib/types";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { isDisposableEmail } from "@/lib/auth/emailValidation";
import { KNOWN_CITIES } from "@/lib/validation/cityCurriculumMap";
import { verifyIpLocationAction } from "@/app/actions/ip-geo-action";
import { 
  ShieldCheck, Lock, CheckCircle2, AlertCircle, 
  ArrowRight, Users, Info, MapPin
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

/**
 * 🛰️ PROGRESSIVE SIGNUP & VERIFIED EDUCATOR ONBOARDING
 */
export default function SignupPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [curriculum, setCurriculum] = useState("ib");
  const [city, setCity] = useState("");
  const [hasLicense, setHasLicense] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Check disposable email blacklist
    if (isDisposableEmail(email)) {
      setError("Disposable, temporary, or anonymized email domains are blocked. Please use your standard personal or permanent email address.");
      return;
    }

    if (!email || !email.includes("@")) {
      setError("Please enter a valid personal email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setStep(2);
  };

  const handleFinalSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // 2. Gate non-international curriculum or non-licensed teachers
    if (curriculum === "tefl" || curriculum === "domestic" || !hasLicense) {
      router.push(`/framework-mismatch?curriculum=${curriculum}&license=${hasLicense}`);
      return;
    }

    try {
      // 3. Verify IP location alignment against claimed city
      const ipResult = await verifyIpLocationAction(city.trim());

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const randomDigits = Math.floor(100 + Math.random() * 900);
      const newTeacherId = `FLI${randomDigits}`;

      // Initialize 24-Hour Rolling Quota: 25 for first 24h, 20/day thereafter
      const newProfile: TeacherProfile = {
        id: user.uid,
        email: user.email || email,
        name: email.split("@")[0].toUpperCase(),
        teacherId: newTeacherId,
        user_type: "international_teacher",
        curriculum_framework: curriculum,
        has_k12_license: hasLicense,
        current_city: city.trim() || undefined,
        integrity_flag: ipResult.isMismatch ? "ip_location_mismatch" : undefined,
        flag_reason: ipResult.isMismatch ? ipResult.reason : undefined,
        daily_base_quota: 20,
        evaluations_allowance: 25, // 25 for Day 1
        evaluations_used: 0,
        daily_evaluations_used: 0,
        bonus_credits: 0,
        expedited_uplifts_count: 0,
        last_quota_reset_date: new Date().toISOString().split("T")[0],
        tier: "free",
        createdAt: new Date().toISOString(),
      };

      await setDocumentNonBlocking(doc(db, "teachers", user.uid), newProfile, { merge: true });

      // If IP location mismatch detected, alert the admin audit queue
      if (ipResult.isMismatch) {
        await setDocumentNonBlocking(doc(db, "admin_verification_flags", `${user.uid}_${Date.now()}`), {
          teacherId: newTeacherId,
          email: user.email || email,
          claimedCity: city.trim(),
          ipCity: ipResult.ipCity,
          ipCountry: ipResult.ipCountry,
          clientIp: ipResult.clientIp,
          reason: ipResult.reason,
          status: "pending_review",
          timestamp: new Date().toISOString(),
        });
      }

      try {
        const token = await getIdToken(user, true);
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
      } catch (sessionErr) {
        console.warn("Session cookie creation warning:", sessionErr);
      }

      router.push("/featured-jobs");
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err?.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-[#d95f02]">
      <div className="w-full max-w-xl bg-[#0b1224]/90 border border-white/10 rounded-sm p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
        
        {/* HEADER */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono uppercase tracking-widest font-bold rounded-full">
              <ShieldCheck className="size-3.5" />
              Verified Educator Access
            </div>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">
              Step {step} of 2
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
            {step === 1 ? "Create Your Free Account" : "Confirm Teaching Credentials"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {step === 1 
              ? "Join international teachers using independent salary indexes, contract audits, and relocation tools." 
              : "We verify K-12 international credentials to guarantee community data accuracy and salary transparency."}
          </p>
        </div>

        {/* ERROR FEEDBACK */}
        {error && (
          <div className="p-3 bg-red-950/50 border border-red-500/50 text-red-300 text-xs font-mono flex items-start gap-2 rounded-sm">
            <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: CREDENTIALS (LOW FRICTION) */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Personal Email Address
                </label>
                <span className="text-[10px] text-sky-400 flex items-center gap-1 font-medium">
                  <Info className="size-3" /> Personal inbox recommended
                </span>
              </div>
              <input 
                type="email" 
                required
                placeholder="personal.email@domain.com"
                className="w-full p-3 bg-slate-900/90 border border-white/10 rounded-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all placeholder:text-slate-500"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                Choose Password
              </label>
              <input 
                type="password" 
                required
                placeholder="Minimum 6 characters"
                className="w-full p-3 bg-slate-900/90 border border-white/10 rounded-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all placeholder:text-slate-500"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>

            {/* PRIVACY MICRO-BADGE */}
            <div className="flex items-center gap-2 p-2.5 bg-white/[0.02] border border-white/5 rounded-sm text-[11px] text-slate-300">
              <Lock className="size-3.5 text-emerald-400 shrink-0" />
              <span>
                <strong>100% Confidential:</strong> You will be assigned an anonymous ID. Your identity is never shared.
              </span>
            </div>

            {/* STEP 1 CTA */}
            <button 
              type="submit"
              className="w-full p-3.5 bg-gradient-to-r from-primary via-orange-600 to-amber-600 text-white font-black tracking-wider uppercase text-sm rounded-sm transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continue to Verification Check</span>
              <ArrowRight className="size-4" />
            </button>
          </form>
        )}

        {/* STEP 2: VERIFICATION & FRAMEWORK */}
        {step === 2 && (
          <form onSubmit={handleFinalSignup} className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
            
            {/* PRIMARY CURRICULUM */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                Primary Curriculum Background
              </label>
              <select
                value={curriculum}
                onChange={(e) => setCurriculum(e.target.value)}
                className="w-full p-3 bg-slate-900/90 border border-white/10 rounded-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm cursor-pointer"
              >
                <option value="ib">IB (PYP / MYP / DP)</option>
                <option value="british">British National Curriculum / Cambridge / A-Levels</option>
                <option value="american">American (AP / Common Core)</option>
                <option value="australian">Australian Curriculum</option>
                <option value="tefl">Language Center / TEFL / ESL Only</option>
                <option value="domestic">Domestic / Non-International System</option>
              </select>
            </div>

            {/* CURRENT CITY OF EMPLOYMENT */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="size-3.5 text-primary" />
                Current City of Employment
              </label>
              <input 
                type="text"
                required
                list="known-cities-list"
                placeholder="e.g. Prague, Dubai, Bangkok, Singapore, Madrid"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-3 bg-slate-900/90 border border-white/10 rounded-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all placeholder:text-slate-500"
              />
              <datalist id="known-cities-list">
                {KNOWN_CITIES.map((cName) => (
                  <option key={cName} value={cName} />
                ))}
              </datalist>
              <p className="text-[11px] text-slate-400">
                Helps our system confirm your localized international placement against verified school hubs.
              </p>
            </div>

            {/* PROFESSIONAL STATUS CHECKBOX */}
            <div className="flex items-start gap-3 p-3.5 bg-white/[0.02] border border-white/10 rounded-sm">
              <Checkbox
                id="license-check"
                checked={hasLicense}
                onCheckedChange={(checked) => setHasLicense(checked === true)}
                className="mt-0.5 border-white/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label htmlFor="license-check" className="text-xs text-slate-200 font-medium leading-relaxed cursor-pointer">
                I hold a valid state/national teaching license, QTS, or recognized K-12 international certification.
              </label>
            </div>

            {/* CLARIFIED VALUE & EVALUATION DEFINITION */}
            <div className="p-3 bg-slate-900/50 border border-white/5 rounded-sm space-y-1 text-left">
              <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" />
                20 Free Evaluations / Day (Rolling Quota)
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                1 Evaluation unlocks 1 complete confidential school dossier, including real net savings calculations, housing allowances, flight caps, and leadership turnover insights. Resets daily.
              </p>
            </div>

            {/* STEP 2 CTAs */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold uppercase text-xs rounded-sm transition-all"
              >
                Back
              </button>
              <button 
                type="submit"
                disabled={isLoading}
                className={cn(
                  "flex-1 p-3.5 bg-gradient-to-r from-primary via-orange-600 to-amber-600 text-white font-black tracking-wider uppercase text-sm rounded-sm transition-all",
                  "hover:scale-[1.01] active:scale-[0.98] shadow-lg shadow-primary/20",
                  isLoading ? "opacity-50 cursor-not-allowed animate-pulse" : "cursor-pointer"
                )}
              >
                {isLoading ? "Verifying Credentials..." : "Unlock 20 Free Evaluations / Day →"}
              </button>
            </div>
          </form>
        )}

        {/* SOCIAL PROOF */}
        <div className="pt-2.5 border-t border-white/5 space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <a 
              href="https://www.facebook.com/leopardfish" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Leopardfish on Facebook"
              className="inline-flex items-center justify-center size-5 rounded hover:scale-110 transition-transform cursor-pointer shrink-0"
            >
              <svg className="size-4 fill-[#1877F2]" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <span className="font-semibold text-slate-200">
              4,000+ Facebook educators
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a 
              href="https://www.linkedin.com/company/leopardfishintel/" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Leopardfish on LinkedIn"
              className="inline-flex items-center justify-center size-5 rounded hover:scale-110 transition-transform cursor-pointer shrink-0"
            >
              <svg className="size-4 fill-[#0A66C2]" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>
            <span className="font-semibold text-slate-200">
              20,000 LinkedIn international school connections
            </span>
          </div>
        </div>

        {/* LOGIN LINK */}
        <div className="text-center pt-1">
          <button 
            type="button"
            onClick={() => router.push('/login')}
            className="text-xs text-slate-300 hover:text-white transition-colors"
          >
            Already have an account? <span className="underline underline-offset-4 text-primary font-bold">Log in here</span>
          </button>
        </div>
      </div>
    </div>
  );
}