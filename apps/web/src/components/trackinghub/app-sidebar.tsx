"use client";

import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { navItems } from "@/lib/trackinghub/navigation";
import { ProjectSwitcher, useCurrentProjectId } from "./project-switcher";
import { SidebarUserMenu } from "./sidebar-user-menu";

function normalizeHref(href: string) {
  if (href === "/") {
    return href;
  }

  return href.replace(/\/+$/, "");
}

function isActiveHref(itemHref: string, activeHref: string) {
  const normalizedItemHref = normalizeHref(itemHref);
  const normalizedActiveHref = normalizeHref(activeHref);

  if (normalizedItemHref === "/") {
    return normalizedActiveHref === "/";
  }

  return (
    normalizedActiveHref === normalizedItemHref ||
    normalizedActiveHref.startsWith(`${normalizedItemHref}/`)
  );
}

function withProjectQuery(href: string, projectId: string) {
  if (!projectId) {
    return href;
  }

  const url = new URL(href, "http://localhost");
  url.searchParams.set("project_id", projectId);

  return `${url.pathname}${url.search}`;
}

export function AppSidebar({ activeHref = "/" }: { activeHref?: string }) {
  const projectId = useCurrentProjectId();

  return (
    <Sidebar className="border-r border-sidebar-border" collapsible="offcanvas">
      <SidebarHeader className="gap-4 px-4 py-5">
        <Link
          href="/"
          className="flex items-center justify-between gap-3 rounded-md outline-hidden ring-sidebar-ring transition-colors focus-visible:ring-2"
        >
          <span className="text-base font-bold tracking-normal text-sidebar-foreground">
            TrackingHub
          </span>
        </Link>
        <ProjectSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    className="h-10"
                    isActive={isActiveHref(item.href, activeHref)}
                    size="lg"
                  >
                    <Link href={withProjectQuery(item.href, projectId)}>
                      <span className="truncate font-medium">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarUserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
