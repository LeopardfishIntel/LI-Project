"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "firebase/auth";
import { auth } from "@/firebase/utils/memo";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Email/Password Login Handler
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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

  // Google SSO Login Handler
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push("/");
    } catch (error: any) {
      console.error("Google Auth Error:", error.message);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 bg-[#020617]">
      <div className="w-full max-w-md space-y-8 border border-white/10 p-10 bg-black/40 backdrop-blur-md">
        
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">
            <span className="text-[#f97316]">Leopard</span>
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
              className="bg-black/60 border-white/10 text-white rounded-none h-12 text-[10px] tracking-widest focus-visible:ring-1 focus-visible:ring-[#f97316] transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest ml-1">Security Key</label>
            <Input 
              type="password" 
              placeholder="PASSWORD" 
              className="bg-black/60 border-white/10 text-white rounded-none h-12 text-[10px] tracking-widest focus-visible:ring-1 focus-visible:ring-[#f97316] transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#f97316] hover:bg-white hover:text-black text-white font-black uppercase text-[10px] h-12 rounded-none transition-all mt-4"
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