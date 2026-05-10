import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { cn } from "@/lib/utils";
import { navItems, timelineItems } from "@/lib/trackinghub/sample-data";

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
          <Badge variant="secondary">MVP</Badge>
        </Link>

        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/45 p-3">
          <p className="text-xs font-medium text-sidebar-foreground/70">
            当前项目
          </p>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">
                Magic Frame
              </p>
              <p className="mt-1 text-xs leading-5 text-sidebar-foreground/70">
                生产数据流正常
              </p>
            </div>
            <span className="mt-1 size-2 rounded-full bg-chart-2" />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={item.href === activeHref}>
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

      <SidebarFooter className="px-4 py-4">
        <Separator className="mb-4 bg-sidebar-border" />
        <div>
          <p className="text-xs font-semibold text-sidebar-foreground/70">
            当前批次
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {timelineItems.map((item) => (
              <div
                key={item.label}
                className={cn(
                  "rounded-md border border-sidebar-border p-2",
                  item.active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "bg-sidebar text-sidebar-foreground/70"
                )}
              >
                <p className="text-xs">{item.label}</p>
                <p className="mt-1 text-lg font-bold leading-none tracking-normal">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
