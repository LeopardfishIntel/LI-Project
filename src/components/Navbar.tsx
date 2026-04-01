 "use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Firebase Imports
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/firebase/utils/memo";

export default function Navbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setMounted(true);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const links = [
    { name: "Discover", href: "/discover" },
    { name: "Evaluate", href: "/financial-forecaster" },
    { name: "Decide", href: "/compare" },
    { name: "Prepare", href: "/prepare" },
    { name: "Directory", href: "/directory" },
    { name: "Partners", href: "/partners" },
  ];

  // Keeping your original "Ghost" nav logic for smoother loading
  if (!mounted) {
    return (
      <nav className="border-b border-border bg-background px-6 py-4 flex items-center justify-between opacity-0">
        <div className="text-xl font-black italic text-white">Leopardfish Intel</div>
      </nav>
    );
  }

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      {/* 1. Logo using Theme Colors */}
      <Link href="/" className="text-xl font-black tracking-tighter italic flex items-center">
        <span className="text-primary">Leopard</span>
        <span className="text-azure">fish Intel</span>
      </Link>

      {/* 2. Navigation Links */}
      <div className="hidden lg:flex gap-8 items-center">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link 
              key={link.href} 
              href={link.href} 
              className={`text-[11px] font-bold transition-all duration-200 uppercase tracking-widest ${
                isActive ? "text-primary border-b border-primary pb-0.5" : "text-slate-400 hover:text-white"
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </div>

      {/* 3. Search & Auth Toggle */}
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-500" />
          <Input 
            placeholder="Search Intel..." 
            className="bg-black/40 border-white/10 h-9 w-48 pl-9 text-[10px] text-white rounded-none outline-none focus-visible:ring-1 focus-visible:ring-primary" 
          />
        </div>

        {user ? (
          <div className="flex items-center gap-4">
            {/* Re-adding the "Account" Label from your old code */}
            <div className="hidden xl:flex flex-col items-end">
              <span className="text-slate-500 text-[8px] uppercase font-bold tracking-tighter">Account</span>
              <span className="text-white text-[10px] font-medium">{user.email}</span>
            </div>
            <Button 
              onClick={handleLogout}
              className="bg-white text-background font-black text-[10px] uppercase rounded-none h-9 px-6 hover:bg-primary hover:text-white transition-all duration-200"
            >
              Logout
            </Button>
          </div>
        ) : (
          <Link href="/login">
            <Button className="bg-primary text-white font-black text-[10px] uppercase rounded-none h-9 px-6 hover:bg-white hover:text-black transition-all duration-200">
              Login
            </Button>
          </Link>
        )}
      </div>
    </nav>
  );
}