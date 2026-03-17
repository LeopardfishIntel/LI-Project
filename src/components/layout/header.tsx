"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, User, Menu } from "lucide-react";
import { useAuth, useUser } from "@/firebase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Binoculars } from "@/components/icons/Binoculars";

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
          <Link href="/" className="flex items-center gap-2 group">
            <Binoculars className="size-6 text-[#f97316] group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline-block font-bold text-lg tracking-tighter text-white uppercase">
              <span className="text-[#f97316]">Leopard</span><span className="text-[#007FFF]">fish Intel</span>
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors rounded-sm",
                  pathname.startsWith(link.href) 
                    ? "text-[#f97316] bg-[#f97316]/5" 
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
            {user && (
                <Button variant="ghost" onClick={() => auth.signOut()} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white">
                    <LogOut className="size-3 mr-2" /> Log out
                </Button>
            )}
            {!user && (
                <Link href="/login">
                    <Button variant="outline" size="sm" className="border-white/10 text-white font-bold text-xs rounded-sm">Log in</Button>
                </Link>
            )}
        </div>
      </div>
    </header>
  );
}
