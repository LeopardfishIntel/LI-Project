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
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#020617]/95 backdrop-blur print:hidden">
      <div className="container flex h-16 items-center justify-between mx-auto px-4 md:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="group">
            <BrandLogo className="group-hover:scale-105 transition-transform duration-300" />
          </Link>
          
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 text-xs font-black tracking-widest transition-colors rounded-sm",
                  pathname.startsWith(link.href) 
                    ? "text-[#f97316] bg-[#f97316]/5" 
                    : "text-gray-500 hover:text-white hover:bg-white/5"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
            {user && (
                <Button variant="ghost" onClick={() => auth.signOut()} className="text-[10px] font-black tracking-widest text-gray-500 hover:text-white">
                    <LogOut className="size-3 mr-2 text-[#f97316]" /> Log out
                </Button>
            )}
            {!user && (
                <Link href="/login">
                    <Button variant="outline" size="sm" className="border-white/10 text-white font-black text-[10px] tracking-widest rounded-sm h-9 px-4 hover:bg-white/5">Log in</Button>
                </Link>
            )}
        </div>
      </div>
    </header>
  );
}