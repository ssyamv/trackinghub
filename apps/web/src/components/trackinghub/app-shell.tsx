import type { ReactNode } from "react";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import { AppSidebar } from "./app-sidebar";

export function AppShell({
  activeHref = "/",
  children,
}: {
  activeHref?: string;
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar activeHref={activeHref} />
      <SidebarInset>
        <div className="flex min-h-screen flex-col bg-background text-foreground">
          <div className="flex h-14 items-center border-b border-border px-4 md:hidden">
            <SidebarTrigger />
            <span className="ml-3 text-sm font-semibold">TrackingHub</span>
          </div>
          <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-8 lg:px-10 lg:py-8">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
