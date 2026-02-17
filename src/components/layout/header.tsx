"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, User, ChevronDown, Binoculars, LogOut, DatabaseZap } from "lucide-react";
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
  { href: "/enquiry", label: "Enquiry" },
];

function UserNav() {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const firestore = useFirestore();

    const adminRoleRef = useMemoFirebase(
        () => (firestore && user ? doc(firestore, 'roles_admin', user.uid) : null),
        [firestore, user]
    );
    const { data: adminRole, isLoading: isAdminLoading } = useDoc(adminRoleRef);
    const isAdmin = adminRole?.exists ? adminRole.exists() : false;


    const handleLogout = () => {
        auth.signOut();
    };

    if (isUserLoading || (user && isAdminLoading)) {
        return <div className="h-10 w-10" />
    }

    if (!user) {
        return (
             <Link href="/login">
                <Button variant="outline" size="icon" aria-label="Login or Sign Up">
                    <User className="h-5 w-5" />
                </Button>
            </Link>
        )
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                        <AvatarFallback>
                            {user.displayName ? user.displayName.charAt(0).toUpperCase() : <User />}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                 <DropdownMenuItem asChild>
                    <Link href="/profile">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                    </Link>
                </DropdownMenuItem>
                {isAdmin && (
                    <DropdownMenuItem asChild>
                        <Link href="/admin/seed-data">
                            <DatabaseZap className="mr-2 h-4 w-4" />
                            <span>Data Admin</span>
                        </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                     <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center gap-2">
            <Binoculars className="h-6 w-6 text-primary" />
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
              className="flex items-center gap-2"
            >
              <Binoculars className="h-6 w-6 text-primary" />
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
        <Link href="/" className="flex items-center gap-2 md:hidden">
            <Binoculars className="h-5 w-5 text-primary" />
            <span className="font-bold font-headline">Leopardfish Intel</span>
        </Link>


        <div className="flex flex-1 items-center justify-end space-x-2">
            <UserNav />
        </div>
      </div>
    </header>
  );
}
