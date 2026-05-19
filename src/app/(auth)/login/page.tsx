"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail // 🛰️ Added for reset protocol
} from "firebase/auth";
import { auth } from "@/firebase/utils/memo";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react"; // 🛡️ Added for visibility toggle

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 👁️ Visibility state
  const [loading, setLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState(""); // 📩 Feedback message
  const router = useRouter();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResetMessage("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/"); 
    } catch (error: any) {
      console.error("Login Error:", error.message);
      alert("Authorization Failed: Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push("/");
    } catch (error: any) {
      console.error("Google Auth Error:", error.message);
    }
  };

  // 🛰️ PASSWORD RESET HANDLER
  const handleResetPassword = async () => {
    if (!email) {
      alert("Please enter your email address first to receive a reset link.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage("RECOVERY LINK DISPATCHED. CHECK YOUR INBOX.");
    } catch (error: any) {
      alert("Reset Failed: " + error.message);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 bg-[#020617]">
      <div className="w-full max-w-md space-y-8 border border-white/10 p-10 bg-black/40 backdrop-blur-md">
        
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">
            <span className="text-[#d95f02]">Leopard</span>
            <span className="text-[#007FFF]">fish Access</span>
          </h2>
          <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-[0.3em] font-bold">
            Secure Intel Portal
          </p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleEmailLogin} className="mt-8 space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest ml-1">Identity</label>
            <Input 
              type="email" 
              placeholder="EMAIL ADDRESS" 
              className="bg-black/60 border-white/10 text-white rounded-none h-12 text-[10px] tracking-widest focus-visible:ring-1 focus-visible:ring-[#d95f02] transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between items-center pr-1">
              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest ml-1">Security Key</label>
              {/* 🛰️ RESET TRIGGER */}
              <button 
                type="button" 
                onClick={handleResetPassword}
                className="text-[8px] text-[#007FFF] hover:text-white uppercase font-black tracking-tighter transition-colors"
              >
                Forgot Key?
              </button>
            </div>
            <div className="relative">
              <Input 
                type={showPassword ? "text" : "password"} 
                placeholder="PASSWORD" 
                className="bg-black/60 border-white/10 text-white rounded-none h-12 text-[10px] tracking-widest focus-visible:ring-1 focus-visible:ring-[#d95f02] transition-all pr-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {/* 👁️ VISIBILITY TOGGLE */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* RESET SUCCESS FEEDBACK */}
          {resetMessage && (
            <p className="text-[8px] text-[#d95f02] font-black text-center tracking-[0.2em] animate-pulse">
              {resetMessage}
            </p>
          )}

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#d95f02] hover:bg-white hover:text-black text-white font-black uppercase text-[10px] h-12 rounded-none transition-all mt-4"
          >
            {loading ? "Verifying..." : "Authorize Entry"}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/5"></span>
          </div>
          <div className="relative flex justify-center text-[8px] uppercase font-bold tracking-widest">
            <span className="bg-[#020617] px-4 text-slate-600 italic">Global SSO Intelligence</span>
          </div>
        </div>

        {/* Google Login */}
        <Button 
          onClick={handleGoogleLogin} 
          variant="outline" 
          className="w-full border-white/10 bg-transparent hover:bg-white/5 text-white font-black uppercase text-[10px] h-12 rounded-none transition-all"
        >
          Continue with Google
        </Button>

        {/* Footer Link */}
        <p className="text-center text-slate-500 text-[9px] uppercase tracking-widest mt-8 font-bold">
          No Intel Clearance?{" "}
          <Link href="/signup" className="text-[#007FFF] hover:text-white transition-colors underline decoration-1 underline-offset-4">
            Request Account
          </Link>
        </p>
      </div>
    </div>
  );
}