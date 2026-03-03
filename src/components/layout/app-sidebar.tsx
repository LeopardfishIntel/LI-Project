
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  Binoculars,
  Home,
  Wand2,
  Calculator,
  GitCompare,
  BookOpen,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';

const navLinks = [
    { href: '/discover', label: 'Discover', icon: Wand2 },
    { href: '/financial-forecaster', label: 'Evaluate', icon: Calculator },
    { href: '/compare', label: 'Decide', icon: GitCompare },
    { href: '/churn-calculator', label: 'Stability', icon: TrendingUp },
    { href: '/prepare', label: 'Prepare', icon: ShieldCheck },
    { href: '/directory', label: 'Directory', icon: BookOpen },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-background">
      <SidebarContent>
        <SidebarHeader className="p-4">
          <Link href="/" className="flex items-center gap-2">
            <Binoculars className="size-6 text-primary" />
            <span className="font-bold font-headline text-lg tracking-tighter uppercase group-data-[collapsible=icon]:hidden">
              <span className="text-primary">LEOPARD</span><span className="text-accent italic">FISH INTEL</span>
            </span>
          </Link>
        </SidebarHeader>
        <SidebarMenu className="mt-8 px-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/'}
              tooltip="Home"
              className="hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Link href="/">
                <Home className="size-5" />
                <span className="font-bold uppercase tracking-wider text-xs">Home</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {navLinks.map(link => (
            <SidebarMenuItem key={link.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(link.href)}
                tooltip={link.label}
                className="hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Link href={link.href}>
                  <link.icon className="size-5" />
                  <span className="font-bold uppercase tracking-wider text-xs">{link.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
