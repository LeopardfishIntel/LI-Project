'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
// 🛰️ IMPORT THE IDENTITY HOOK
import { useUser } from '@/firebase'; 
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter, // Added Footer for logout/profile
} from '@/components/ui/sidebar';
import {
  Home,
  Wand2,
  Calculator,
  GitCompare,
  PackageCheck,
  ShieldCheck, // Admin Icon
  Fingerprint, // Agent Icon
} from 'lucide-react';
import { Binoculars } from '@/components/icons/Binoculars';
import { cn } from '@/lib/utils';

const navLinks = [
    { href: '/discover', label: 'Discover', icon: Wand2 },
    { href: '/financial-forecaster', label: 'Evaluate', icon: Calculator },
    { href: '/compare', label: 'Decide', icon: GitCompare },
    { href: '/prepare', label: 'Prepare', icon: PackageCheck },
];

export function AppSidebar() {
  const pathname = usePathname();
  // 🎯 GRAB THE 007 INTEL
  const { customId, isAdmin, loading } = useUser();

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-[#020617]">
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2 mb-4" prefetch={false}>
          <Binoculars className="size-6 text-[#f97316]" />
          <span className="font-bold font-headline text-lg tracking-tighter group-data-[collapsible=icon]:hidden whitespace-nowrap">
            <span className="text-[#f97316]">Leopardfish</span> <span className="text-[#007FFF]">Intel</span>
          </span>
        </Link>

        {/* 🕵️ AGENT IDENTIFIER BLOCK */}
        {!loading && customId && (
          <div className="px-2 py-3 border-y border-white/5 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Fingerprint className={cn(
                  "size-5",
                  isAdmin ? "text-[#f97316]" : "text-[#007FFF]"
                )} />
                {/* Pulsing Status Dot */}
                <span className={cn(
                  "absolute -top-1 -right-1 size-2 rounded-full animate-pulse",
                  isAdmin ? "bg-[#f97316]" : "bg-[#007FFF]"
                )} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 leading-none">
                  Operative ID
                </span>
                <span className="text-xs font-black text-white tracking-tighter mt-1 italic">
                  {customId}
                </span>
              </div>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu className="mt-4 px-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/'}
              tooltip={{ children: 'Home' }}
              className="hover:bg-white/5 transition-colors"
            >
              <Link href="/" prefetch={false}>
                <Home className="size-4" />
                <span className="font-bold text-[11px] uppercase tracking-wider">Home</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {navLinks.map(link => (
            <SidebarMenuItem key={link.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(link.href)}
                tooltip={{ children: link.label }}
                className="hover:bg-white/5 transition-colors"
              >
                <Link href={link.href} prefetch={false}>
                  <link.icon className="size-4" />
                  <span className="font-bold text-[11px] uppercase tracking-wider">{link.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

          {/* 🛡️ ADMIN COMMAND (Only visible to you) */}
          {isAdmin && (
            <SidebarMenuItem className="mt-10 pt-4 border-t border-white/5">
              <SidebarMenuButton
                asChild
                className="text-[#f97316] hover:bg-[#f97316]/10 hover:text-[#f97316]"
              >
                <Link href="/admin">
                  <ShieldCheck className="size-4" />
                  <span className="font-black text-[11px] uppercase tracking-widest italic">Command Center</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}