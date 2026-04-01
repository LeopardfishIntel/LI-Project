"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Firebase Authentication Imports
import { 
  onAuthStateChanged, 
  signOut, 
  sendPasswordResetEmail, 
  User 
} from "firebase/auth";
import { auth } from "@/firebase/utils/memo";

interface NavLink {
  name: string;
  href: string;
}

export default function Header() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // The "Brain": Subscribes to Firebase to watch for login/logout events
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // Cleanup the listener when the header unmounts
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetSent(true);
      alert("Security Link Sent: Check your email to update your password.");
      
      // Reset the "sent" status after 5 seconds
      setTimeout(() => setResetSent(false), 5000);
    } catch (error: any) {
      console.error("Password Reset Error:", error.message);
      alert("Failed to send reset link. Please try again later.");
    }
  };

  const links: NavLink[] = [
    { name: "Discover", href: "/discover" },
    { name: "Evaluate", href: "/financial-forecaster" },
    { name: "Decide", href: "/compare" },
    { name: "Prepare", href: "/prepare" },
    { name: "Directory", href: "/directory" },
    { name: "Partners", href: "/partners" },
  ];

  // standard Next.js 15 hydration guard
  if (!mounted) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#020617]/95 backdrop-blur-md px-8 py-5">
      <nav className="flex justify-between items-center max-w-7xl mx-auto">
        
        {/* 💎 BRAND UNITY: No space between Leopard and fish */}
        <Link 
          href="/" 
          className="text-xl font-bold tracking-tighter hover:opacity-80 transition-opacity flex items-center"
        >
          <span className="text-[#f97316]">Leopard</span>
          <span className="text-[#007FFF]">fish Intel</span>
        </Link>
        
        <div className="flex gap-10 items-center">
          {/* Main Navigation Links */}
          <div className="flex gap-8 items-center">
            {links.map((link: NavLink) => {
              const isActive = pathname === link.href;
              return (
                <Link 
                  key={link.href} 
                  href={link.href} 
                  className={cn(
                    "text-[11px] font-bold tracking-widest transition-all duration-200 uppercase",
                    isActive ? "text-[#f97316]" : "text-slate-400 hover:text-white"
                  )}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Authentication Section */}
          <div className="flex items-center gap-4 ml-4 border-l border-white/10 pl-8">
            {user ? (
              <div className="flex items-center gap-6">
                {/* Account Details + Change Password Trigger */}
                <div className="hidden xl:flex flex-col items-end">
                  <span className="text-slate-500 text-[8px] uppercase font-bold tracking-tighter">Authorized Intel</span>
                  <span className="text-white text-[10px] font-medium">{user.email}</span>
                  <button 
                    onClick={handlePasswordReset}
                    disabled={resetSent}
                    className="text-[#007FFF] text-[8px] uppercase font-bold tracking-widest mt-0.5 hover:text-white transition-colors disabled:text-slate-600"
                  >
                    {resetSent ? "Link Dispatched" : "Update Security Key"}
                  </button>
                </div>

                <Button 
                  onClick={handleLogout}
                  className="bg-white text-black font-black text-[10px] uppercase rounded-none h-9 px-6 hover:bg-[#f97316] hover:text-white transition-all"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button className="bg-[#f97316] text-white font-black text-[10px] uppercase rounded-none h-9 px-6 hover:bg-white hover:text-black transition-all">
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}