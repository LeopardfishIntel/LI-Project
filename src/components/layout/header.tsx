 "use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  
  const links = [
    { name: "DISCOVER", href: "/discover" },
    { name: "EVALUATE", href: "/financial-forecaster" }, // Reintroduced
    { name: "PREPARE", href: "/prepare" },              // Reintroduced
    { name: "COMPARE", href: "/compare" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#020617]/95 backdrop-blur-md px-8 py-5">
      <nav className="flex justify-between items-center max-w-7xl mx-auto">
        <Link href="/" className="text-[#f97316] font-black tracking-tighter text-2xl italic">
          LEOPARDFISH
        </Link>
        
        <div className="flex gap-10 items-center">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.href} 
                href={link.href} 
                className={`text-[10px] font-black tracking-[0.25em] transition-all uppercase ${
                  isActive 
                    ? "text-[#f97316] border-b border-[#f97316] pb-1" 
                    : "text-slate-400 hover:text-white"
                }`}
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