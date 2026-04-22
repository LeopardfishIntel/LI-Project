"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { User as UserIcon, LogOut, LogIn, Search } from "lucide-react"; 
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "@/firebase"; 
import { doc, getDoc } from "firebase/firestore";
import { Input } from "@/components/ui/input";

export default function Header() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [operativeName, setOperativeName] = useState<string>("FRED");
  const [teacherId, setTeacherId] = useState<string>("FLI007");

  useEffect(() => {
    setMounted(true);
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const docRef = doc(db, "teachers", u.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            // Pulling Fred and FLI007 from your Firestore 'teachers' collection
            setOperativeName(data.firstName || "FRED"); 
            setTeacherId(data.teacherId || data.id || "FLI007");
          }
        } catch (error) {
          console.error("Intelligence Retrieval Failed:", error);
        }
      }
    });
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
        
        {/* 🏔️ BRANDING */}
        <Link href="/" className="text-xl font-bold tracking-tighter hover:opacity-80 transition-opacity">
          <span className="text-[#f97316]">Leopard</span><span className="text-[#007FFF]">fish Intel</span>
        </Link>

        {/* 🧭 NAVIGATION */}
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

        {/* 🛰️ SEARCH & ELITE ACCOUNT MAN */}
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-500" />
            <Input 
              placeholder="Search Intel..." 
              className="bg-black/40 border-white/10 h-8 w-40 pl-8 text-[10px] text-white rounded-none outline-none focus-visible:ring-1 focus-visible:ring-[#f97316]" 
            />
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              {/* THE CLICKABLE DOSSIER LINK */}
              <Link 
                href="/profile" 
                className="flex items-center gap-3 bg-white/5 p-1 pr-4 rounded-full border border-white/10 group hover:bg-white/10 hover:border-[#f97316]/50 transition-all cursor-pointer"
              >
                <div className="size-8 bg-gradient-to-br from-[#0b1224] to-[#1f2937] border border-[#f97316]/30 rounded-full flex items-center justify-center">
                  <UserIcon className="size-4 text-[#f97316]" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-[10px] font-black uppercase text-white leading-none">{operativeName}</p>
                  <p className="text-[9px] font-bold text-[#007FFF] leading-none mt-1 tracking-widest uppercase">
                    {teacherId}
                  </p>
                </div>
              </Link>

              {/* LOGOUT */}
              <button 
                onClick={() => signOut(auth)} 
                title="Abort Mission"
                className="p-2 hover:bg-rose-500/10 rounded-full group transition-colors"
              >
                <LogOut className="size-4 text-slate-500 group-hover:text-rose-500" />
              </button>
            </div>
          ) : (
            <Link href="/login" className="flex items-center gap-2 bg-[#f97316] text-white px-4 py-2 rounded-none text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
              <LogIn className="size-4" />
              Secure Access
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}