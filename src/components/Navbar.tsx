"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const links = [
    { name: "DISCOVER", href: "/discover" },
    { name: "CHURN", href: "/churn-calculator" },
    { name: "TAX", href: "/tax-calculator" },
    { name: "COMPARE", href: "/compare" },
  ];

  return (
    <nav className="border-b border-white/10 bg-[#020617] px-8 py-6 flex items-center justify-between">
      <Link href="/" className="text-2xl font-black text-[#f97316] tracking-tighter italic">LEOPARDFISH</Link>
      <div className="flex gap-8">
        {links.map((link) => (
          <Link 
            key={link.href} 
            href={link.href} 
            className={`text-xs font-bold tracking-widest hover:text-[#f97316] transition-colors ${pathname === link.href ? "text-[#f97316]" : "text-slate-400"}`}
          >
            {link.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}