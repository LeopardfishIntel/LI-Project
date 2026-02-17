"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, User, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const navLinks = [
  { href: "/discover", label: "Discover" },
  { href: "/financial-forecaster", label: "Evaluate" },
  { href: "/compare", label: "Decide" },
  { href: "/directory", label: "Directory" },
  { href: "/forum", label: "Forums" },
  { href: "/enquiry", label: "Enquiry" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g transform="rotate(45 12 12)">
                    <rect x="2" y="2" width="20" height="20" rx="3" fill="hsl(var(--primary))"/>
                    <path d="M12 6C16.5 10 16.5 14 12 18C7.5 14 7.5 10 12 6Z" fill="hsl(var(--accent))"/>
                    <path d="M10.5 6C14 10 14 14 10.5 18" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M13.5 6C10 10 10 14 13.5 18" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </g>
            </svg>
            <span className="hidden font-bold sm:inline-block font-headline">
              Leopardfish Intel
            </span>
          </Link>
          <nav className="flex items-center space-x-1 text-sm font-medium">
            {navLinks.map((link) =>
              (link as any).isDropdown && (link as any).subLinks ? (
                <DropdownMenu key={link.label}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className={cn("transition-colors hover:text-foreground/80 h-auto px-4 py-2", pathname.startsWith(link.href) ? "text-foreground" : "text-foreground/60")}>
                      {link.label}
                      <ChevronDown className="relative top-[1px] ml-1 h-4 w-4 transition duration-200" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    {(link as any).subLinks.map((subLink: any) => (
                      <DropdownMenuItem key={subLink.label} asChild>
                        <Link href={subLink.href}>{subLink.label}</Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "transition-colors hover:text-foreground/80 px-4 py-2 rounded-md",
                    pathname === link.href ? "text-foreground bg-accent/50" : "text-foreground/60"
                  )}
                >
                  {link.label}
                </Link>
              )
            )}
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
              <svg viewBox="0 0 24 24" className="h-6 w-6 mr-2" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g transform="rotate(45 12 12)">
                      <rect x="2" y="2" width="20" height="20" rx="3" fill="hsl(var(--primary))"/>
                      <path d="M12 6C16.5 10 16.5 14 12 18C7.5 14 7.5 10 12 6Z" fill="hsl(var(--accent))"/>
                      <path d="M10.5 6C14 10 14 14 10.5 18" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M13.5 6C10 10 10 14 13.5 18" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </g>
              </svg>
              <span className="font-bold font-headline">Leopardfish Intel</span>
            </Link>
            <div className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
              <div className="flex flex-col space-y-3">
                {navLinks.map((link) =>
                  (link as any).isDropdown && (link as any).subLinks ? (
                    <Collapsible key={link.label}>
                        <CollapsibleTrigger className={cn("font-medium flex items-center justify-between w-full [&[data-state=open]>svg]:rotate-180",
                          "transition-colors hover:text-foreground/80",
                          pathname.startsWith(link.href) ? "text-foreground" : "text-foreground/60"
                        )}>
                          {link.label}
                          <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                        </CollapsibleTrigger>
                      <CollapsibleContent className="pl-4 flex flex-col space-y-3 pt-2">
                        {(link as any).subLinks.map((subLink: any) => (
                           <Link
                            key={subLink.href}
                            href={subLink.href}
                             className={cn(
                              "transition-colors hover:text-foreground/80 text-foreground/60"
                            )}
                          >
                            {subLink.label}
                          </Link>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "transition-colors hover:text-foreground/80",
                        pathname === link.href ? "text-foreground" : "text-foreground/60"
                      )}
                    >
                      {link.label}
                    </Link>
                  )
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <Link href="/" className="flex items-center space-x-2 md:hidden">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g transform="rotate(45 12 12)">
                    <rect x="2" y="2" width="20" height="20" rx="3" fill="hsl(var(--primary))"/>
                    <path d="M12 6C16.5 10 16.5 14 12 18C7.5 14 7.5 10 12 6Z" fill="hsl(var(--accent))"/>
                    <path d="M10.5 6C14 10 14 14 10.5 18" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M13.5 6C10 10 10 14 13.5 18" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </g>
            </svg>
        </Link>


        <div className="flex flex-1 items-center justify-end space-x-2">
            <Link href="/login">
                <Button variant="outline" size="icon" aria-label="Login or Sign Up">
                    <User className="h-5 w-5" />
                </Button>
            </Link>
        </div>
      </div>
    </header>
  );
}
