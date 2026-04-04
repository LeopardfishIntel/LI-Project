"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { User, LogOut, LogIn } from "lucide-react"; 
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/firebase/utils/memo";

export default function Header() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    setMounted(true);
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const links = [
    { name: "Discover", href: "/find-your-fit" },
    { name: "Evaluate", href: "/financial-forecaster" },
    { name: "Decide", href: "/compare" },
    { name: "Prepare", href: "/prepare" },
    { name: "Schools", href: "/schools" },
    { name: "Connect", href: "/enquiry" },
  ];

  if (!mounted) return <div className="h-16 bg-[#020617] border-b border-white/5" />;

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#020617]/90 backdrop-blur-md px-6 py-3">
      <nav className="flex justify-between items-center max-w-7xl mx-auto">
        
        {/* 🏔️ BRANDING: Locked Title Case */}
        <Link href="/" className="text-xl font-bold tracking-tighter hover:opacity-80 transition-opacity">
          <span className="text-[#f97316]">Leopard</span><span className="text-[#007FFF]">fish Intel</span>
        </Link>

        <div className="flex gap-6 items-center">
          <div className="hidden lg:flex gap-6 items-center border-r border-white/10 pr-6">
            {links.map((link) => (
              <Link 
                key={link.href} 
                href={link.href} 
                className={cn(
                  "text-[11px] font-bold uppercase tracking-widest transition-colors", 
                  pathname === link.href ? "text-[#f97316]" : "text-slate-400 hover:text-white"
                )}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* 🛰️ AUTH: Static Icons Only */}
          {user ? (
            <div className="flex items-center gap-4">
              <Link href="/profile" title="Profile">
                <User className="size-5 text-slate-400 hover:text-[#007FFF]" />
              </Link>
              <button onClick={() => signOut(auth)} title="Logout">
                <LogOut className="size-5 text-[#f97316]" />
              </button>
            </div>
          ) : (
            <Link href="/login" title="Login">
              <LogIn className="size-5 text-[#f97316]" />
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}