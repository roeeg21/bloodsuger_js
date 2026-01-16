'use client';

import { usePathname } from 'next/navigation';
import { BookUser, Gauge } from 'lucide-react';

import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import Link from 'next/link';

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader>
        <Link href="/dashboard">
          <h1 className="font-headline text-2xl text-primary drop-shadow-glow-primary px-2 text-center">
            SugarCheck Pro
          </h1>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith('/dashboard')}
              tooltip="Dashboard"
            >
              <Link href="/dashboard">
                <Gauge className="text-primary drop-shadow-glow-primary" />
                <span className="truncate">Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith('/log')}
              tooltip="Manual Log"
            >
              <Link href="/log">
                <BookUser className="text-primary drop-shadow-glow-primary" />
                <span className="truncate">Manual Log</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}
