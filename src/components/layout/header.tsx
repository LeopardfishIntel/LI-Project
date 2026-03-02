
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User, LogOut, Search, Binoculars, Menu } from "lucide-react";
import { useAuth, useUser } from "@/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navLinks = [
  { href: "/discover", label: "Discover" },
  { href: "/financial-forecaster", label: "Evaluate" },
  { href: "/compare", label: "Decide" },
  { href: "/prepare", label: "Prepare" },
  { href: "/directory", label: "Directory" },
  { href: "/partners", label: "Partners" },
];

function UserNav() {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        if (auth) {
            auth.signOut();
            router.push('/');
        }
    };

    if (isUserLoading) {
        return <div className="h-10 w-10" />
    }

    if (!user) {
        return (
             <Link href="/login">
                <Button variant="outline" size="sm" className="font-bold rounded-sm border-white/20 text-white hover:bg-white/5">
                    Login
                </Button>
            </Link>
        )
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-white/10">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                        <AvatarFallback>
                            {user.displayName ? user.displayName.charAt(0).toUpperCase() : <User />}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass">
                 <DropdownMenuItem asChild className="hover:bg-primary/10 hover:text-primary cursor-pointer">
                    <Link href="/profile">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={handleLogout} className="hover:bg-destructive/10 hover:text-destructive cursor-pointer">
                     <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

const searchSchema = z.object({
  query: z.string().min(1),
});

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const form = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      query: "",
    },
  });

  function onSubmit(data: z.infer<typeof searchSchema>) {
    router.push(`/search?q=${encodeURIComponent(data.query)}`);
    form.reset();
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <Binoculars className="size-6 text-primary group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline-block font-bold font-headline text-lg tracking-tighter">
              <span className="text-primary">Leopard</span><span className="text-accent">fish Intel</span>
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 text-sm font-bold transition-colors rounded-sm tracking-tight",
                  pathname.startsWith(link.href) 
                    ? "text-primary bg-primary/5" 
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
            <div className="hidden sm:block flex-1 sm:flex-grow-0">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <FormField
                    control={form.control}
                    name="query"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              placeholder="Tactical Search..." 
                              {...field} 
                              className="h-9 pl-9 w-full sm:w-64 bg-background/50 border-white/10 rounded-sm text-white placeholder:text-muted-foreground/50 focus:border-primary/50" 
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </div>
            
            <div className="md:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/5">
                            <Menu className="size-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="bg-background border-r border-white/5">
                        <div className="flex flex-col gap-4 mt-8">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={cn(
                                      "text-lg font-bold tracking-tighter transition-colors",
                                      pathname.startsWith(link.href) ? "text-primary" : "text-white"
                                    )}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
            
            <UserNav />
        </div>
      </div>
    </header>
  );
}
