"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navLinks = [
  { href: "/compare", label: "Compare" },
  { href: "/true-costs", label: "True Costs" },
  { href: "/find-your-niche", label: "Find Your Niche" },
  { href: "/forum", label: "Forums" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block font-headline">
              Leopardfish Intel
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === href ? "text-foreground" : "text-foreground/60"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        
        {/* Mobile Nav */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0">
            <Link
              href="/"
              className="flex items-center"
            >
              <GraduationCap className="h-6 w-6 text-primary mr-2" />
              <span className="font-bold font-headline">Leopardfish Intel</span>
            </Link>
            <div className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
              <div className="flex flex-col space-y-3">
                {navLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "transition-colors hover:text-foreground/80",
                      pathname === href ? "text-foreground" : "text-foreground/60"
                    )}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <Link href="/" className="flex items-center space-x-2 md:hidden">
            <GraduationCap className="h-6 w-6 text-primary" />
        </Link>


        <div className="flex flex-1 items-center justify-end space-x-2">
          <Link href="/login">
            <Button>Login / Sign Up</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
