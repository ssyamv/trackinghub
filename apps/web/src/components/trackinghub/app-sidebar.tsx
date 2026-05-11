import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { navItems } from "@/lib/trackinghub/navigation";

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

export function AppSidebar({ activeHref = "/" }: { activeHref?: string }) {
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
                    className="h-auto min-h-12 items-start py-2"
                    isActive={isActiveHref(item.href, activeHref)}
                    size="lg"
                  >
                    <Link href={item.href}>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate font-medium">
                          {item.label}
                        </span>
                        <span className="truncate text-xs text-sidebar-foreground/60">
                          {item.description}
                        </span>
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

    </Sidebar>
  );
}
