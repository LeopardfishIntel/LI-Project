 "use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const links = [
    { name: "Discover", href: "/discover" },
    { name: "Evaluate", href: "/financial-forecaster" },
    { name: "Decide", href: "/compare" }, // 📡 Label: Decide | Route: /compare
    { name: "Prepare", href: "/prepare" },
    { name: "Directory", href: "/directory" },
    { name: "Partners", href: "/partners" },
  ];

  if (!mounted) {
    return (
      <nav className="border-b border-white/5 bg-[#020617] px-6 py-4 flex items-center justify-between opacity-0">
        <div className="text-xl font-black italic text-white">Leopardfish Intel</div>
      </nav>
    );
  }

  return (
    <nav className="border-b border-white/5 bg-[#020617]/95 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <Link href="/" className="text-xl font-black tracking-tighter italic flex items-center">
        <span className="text-[#f97316]">Leopard</span>
        <span className="text-[#007FFF]">fish Intel</span>
      </Link>

      <div className="hidden lg:flex gap-8 items-center">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link 
              key={link.href} 
              href={link.href} 
              className={`text-[11px] font-bold transition-all duration-200 uppercase tracking-widest ${
                isActive ? "text-[#f97316] border-b border-[#f97316] pb-0.5" : "text-slate-400 hover:text-white"
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-500" />
          <Input placeholder="Search Intel..." className="bg-black/40 border-white/10 h-9 w-48 pl-9 text-[10px] text-white rounded-none outline-none" />
        </div>
        <Button className="bg-[#f97316] text-white font-black text-[10px] uppercase rounded-none h-9 px-6 hover:bg-white hover:text-black transition-all">
          Login
        </Button>
      </div>
    </nav>
  );
}