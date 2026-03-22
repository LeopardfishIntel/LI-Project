 "use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // HYDRATION GUARD: Prevents "reading 'call'" and pathname mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  const links = [
    { name: "DISCOVER", href: "/discover" },
    { name: "CHURN", href: "/churn-calculator" },
    { name: "TAX", href: "/tax-calculator" },
    { name: "COMPARE", href: "/compare" },
  ];

  // Render a "Ghost" skeleton or null to maintain layout stability during hydration
  if (!mounted) {
    return (
      <nav className="border-b border-white/10 bg-[#020617] px-8 py-6 flex items-center justify-between opacity-0">
        <div className="text-2xl font-black italic">LEOPARDFISH</div>
      </nav>
    );
  }

  return (
    <nav className="border-b border-white/10 bg-[#020617] px-8 py-6 flex items-center justify-between sticky top-0 z-50">
      {/* BRANDING: Force font-black and tracking-tighter */}
      <Link 
        href="/" 
        className="text-2xl font-black text-[#f97316] tracking-tighter italic hover:opacity-80 transition-opacity"
      >
        LEOPARDFISH
      </Link>

      <div className="flex gap-8 items-center">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link 
              key={link.href} 
              href={link.href} 
              className={`text-[10px] font-black tracking-[0.2em] transition-all duration-200 uppercase ${
                isActive 
                  ? "text-[#f97316] border-b-2 border-[#f97316] pb-1" 
                  : "text-slate-500 hover:text-white"
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}