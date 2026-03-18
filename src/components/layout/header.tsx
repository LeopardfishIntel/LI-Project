 "use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth, useUser } from "@/firebase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import BrandLogo from "@/components/branding/BrandLogo";

const navLinks = [
  { href: "/discover", label: "Discover" },
  { href: "/financial-forecaster", label: "Evaluate" },
  { href: "/compare", label: "Decide" },
  { href: "/prepare", label: "Prepare" },
];

export default function Header() {
  const pathname = usePathname();
  const { user } = useUser();
  const auth = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl print:hidden">
      <div className="container flex h-16 items-center justify-between mx-auto px-4 md:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="group" prefetch={false}>
            {/* 🛡️ MISSION CRITICAL: Check BrandLogo.tsx for font-black removal */}
            <BrandLogo className="group-hover:scale-105 transition-transform duration-300" />
          </Link>
          
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                className={cn(
                  "px-4 py-2 text-[11px] font-medium tracking-[0.2em] uppercase transition-all rounded-sm",
                  pathname.startsWith(link.href) 
                    ? "text-[#f97316] bg-[#f97316]/10 shadow-[inset_0_0_10px_rgba(249,115,22,0.1)]" 
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
            {user && (
                <Button 
                  variant="ghost" 
                  onClick={() => auth.signOut()} 
                  className="text-[10px] font-bold tracking-widest text-gray-400 hover:text-white hover:bg-white/5"
                >
                    <LogOut className="size-3 mr-2 text-[#f97316]" /> Log out
                </Button>
            )}
            {!user && (
                <Link href="/login" prefetch={false}>
                    {/* 🛡️ TACTICAL GLASS ALIGNMENT: Matching the Hero Buttons */}
                    <Button 
                      className="bg-[#E68A4D]/20 backdrop-blur-md border border-[#E68A4D]/40 text-white font-bold text-[10px] tracking-widest rounded-sm h-9 px-6 hover:bg-[#E68A4D]/40 transition-all"
                    >
                      LOG IN
                    </Button>
                </Link>
            )}
        </div>
      </div>
    </header>
  );
}