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
  Home,
  Wand2,
  Calculator,
  GitCompare,
  PackageCheck,
} from 'lucide-react';
import { Binoculars } from '@/components/icons/Binoculars';

const navLinks = [
    { href: '/discover', label: 'Discover', icon: Wand2 },
    { href: '/financial-forecaster', label: 'Evaluate', icon: Calculator },
    { href: '/compare', label: 'Decide', icon: GitCompare },
    { href: '/prepare', label: 'Prepare', icon: PackageCheck },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-background">
      <SidebarContent>
        <SidebarHeader className="p-4">
          <Link href="/" className="flex items-center gap-2">
            <Binoculars className="size-6 text-primary" />
            <span className="font-bold font-headline text-lg tracking-tighter group-data-[collapsible=icon]:hidden whitespace-nowrap">
              <span className="text-[#f97316]">Leopardfish</span> <span className="text-[#007FFF]">Intel</span>
            </span>
          </Link>
        </SidebarHeader>
        <SidebarMenu className="mt-8 px-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/'}
              tooltip={{ children: 'Home' }}
              className="hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Link href="/">
                <Home />
                <span className="font-bold text-xs">Home</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {navLinks.map(link => (
            <SidebarMenuItem key={link.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(link.href)}
                tooltip={{ children: link.label }}
                className="hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Link href={link.href}>
                  <link.icon />
                  <span className="font-bold text-xs">{link.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}