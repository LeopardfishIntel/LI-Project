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
  Users,
} from 'lucide-react';

const navLinks = [
    { href: '/discover', label: 'Discover', icon: Wand2 },
    { href: '/financial-forecaster', label: 'Evaluate', icon: Calculator },
    { href: '/compare', label: 'Decide', icon: GitCompare },
    { href: '/directory', label: 'Directory', icon: BookOpen },
    { href: '/partners', label: 'Partners', icon: Users },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarHeader className="group-data-[collapsible=icon]:-ml-2">
          <Link href="/" className="flex items-center gap-2">
            <Binoculars className="size-6 text-primary" />
            <span className="font-bold font-headline group-data-[collapsible=icon]:hidden">
              Leopardfish Intel
            </span>
          </Link>
        </SidebarHeader>
        <SidebarMenu className="mt-8">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/'}
              tooltip={{ children: 'Home' }}
            >
              <Link href="/">
                <Home />
                <span>Home</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {navLinks.map(link => (
            <SidebarMenuItem key={link.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(link.href)}
                tooltip={{ children: link.label }}
              >
                <Link href={link.href}>
                  <link.icon />
                  <span>{link.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
