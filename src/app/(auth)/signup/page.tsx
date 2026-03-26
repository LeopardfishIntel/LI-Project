 "use client";

import { useState } from "react";
import { auth, db, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { createUserWithEmailAndPassword, getIdToken } from "firebase/auth";
import { TeacherProfile } from "@/lib/types";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils"; // Assumes you have the cn helper we created

/**
 * 🛰️ SIGNUP MISSION CONTROL
 * Logic: Creates Firebase Auth user, sets the __session cookie for Middleware,
 * and initializes the Firestore TeacherProfile.
 */
export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 1. 🛡️ AUTH STRIKE: Create the Firebase User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. 🛰️ TACTICAL BRIDGE: Set the __session cookie
      // This is the "Secret Sauce" that lets your Middleware know the user is authorized.
      const token = await getIdToken(user);
      document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Lax; secure`;

      // 3. 📝 PROFILE INITIALIZATION
      const profileRef = doc(db, "teachers", user.uid);
      
      const newProfile: TeacherProfile = {
        uid: user.uid,
        email: user.email || email,
        fullName: "",
        isVerifiedTeacher: false,
        familyStatus: "single",
        ageGroup: "not-specified",
        memberSince: new Date(),
        yearsOfExperience: 0,
        qualifications: [],
        preferredRegions: [],
        preferredCountries: [],
        goal: "balanced"
      };

      // 4. 💾 PERSISTENCE: Save to Firestore using our Singleton helper
      await setDocumentNonBlocking("teachers", user.uid, newProfile);
      
      // 🚀 DEPLOYMENT: Push to profile and refresh server-side state
      router.push("/profile");
      router.refresh(); 

    } catch (err: any) {
      console.error("🎯 Signup Error:", err);
      setError(err.message || "Operational Failure: Check credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-8 border border-border bg-background/50 backdrop-blur-sm">
        
        {/* HEADER */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black tracking-tighter text-primary uppercase italic">
            Initialize Intel
          </h1>
          <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest">
            Establish your operative profile
          </p>
        </div>

        {/* ERROR FEEDBACK */}
        {error && (
          <div className="p-3 bg-red-950/30 border border-red-500/50 text-red-500 text-xs font-mono uppercase text-center">
            {error}
          </div>
        )}

        {/* SIGNUP FORM */}
        <form onSubmit={handleSignup} className="space-y-6">
          <div className="space-y-4">
            <div className="group">
              <label className="text-[10px] font-bold text-primary uppercase tracking-tighter mb-1 block">
                Agency Email
              </label>
              <input 
                type="email" 
                required
                placeholder="operative@leopardfish.intel"
                className="w-full p-3 bg-background border border-border text-white focus:border-primary outline-none transition-all placeholder:text-white/20"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>

            <div className="group">
              <label className="text-[10px] font-bold text-primary uppercase tracking-tighter mb-1 block">
                Secure Credential
              </label>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                className="w-full p-3 bg-background border border-border text-white focus:border-primary outline-none transition-all placeholder:text-white/20"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full p-4 bg-primary text-white font-black tracking-tighter uppercase italic text-lg transition-all",
              "hover:bg-orange-600 active:scale-[0.98]",
              isLoading ? "opacity-50 cursor-not-allowed animate-pulse" : "cursor-pointer"
            )}
          >
            {isLoading ? "Transmitting..." : "Deploy Operative"}
          </button>
        </form>

        <div className="text-center">
          <button 
            onClick={() => router.push('/login')}
            className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
          >
            Already have clearance? Log in.
          </button>
        </div>
      </div>
    </div>
  );
}