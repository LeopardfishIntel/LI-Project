 "use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLink {
  name: string;
  href: string;
}

export default function Header() {
  const pathname = usePathname();
  const links: NavLink[] = [
    { name: "Discover", href: "/discover" },
    { name: "Evaluate", href: "/financial-forecaster" },
    { name: "Decide", href: "/compare" },
    { name: "Prepare", href: "/prepare" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#020617]/95 backdrop-blur-md px-8 py-5">
      <nav className="flex justify-between items-center max-w-7xl mx-auto">
        
        {/* 💎 BRAND UNITY: No space between d and f */}
        <Link 
          href="/" 
          className="text-xl font-bold tracking-tighter hover:opacity-80 transition-opacity flex items-center"
        >
          <span className="text-[#f97316]">Leopard</span><span className="text-[#007FFF]">fish Intel</span>
        </Link>
        
        <div className="flex gap-10 items-center">
          {links.map((link: NavLink) => {
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.href} 
                href={link.href} 
                className={cn(
                  "text-[11px] font-bold tracking-widest transition-all duration-200",
                  isActive ? "text-[#f97316]" : "text-slate-400 hover:text-white"
                )}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}