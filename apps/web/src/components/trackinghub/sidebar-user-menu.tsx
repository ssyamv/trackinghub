"use client";

import Link from "next/link";
import { LogOutIcon, UserRoundIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { AuthenticatedUser } from "@/lib/auth/permissions";

type CurrentUser = AuthenticatedUser & {
  id?: string;
  email?: string;
  name?: string;
};

type MeResponse = {
  ok: boolean;
  data?: {
    user?: CurrentUser;
  };
};

export function SidebarUserMenu() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "same-origin",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as MeResponse;

        if (!cancelled) {
          setUser(payload.data?.user ?? null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      window.location.assign("/login");
    }
  }

  const displayName = user?.name || "未登录";
  const displayEmail = user?.email || (isLoading ? "正在读取账号" : "请重新登录");

  return (
    <div className="grid gap-2 border-t border-sidebar-border px-2 py-3">
      <Link
        className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-sidebar-foreground outline-hidden ring-sidebar-ring transition-colors hover:bg-sidebar-accent/55 focus-visible:ring-2"
        href="/settings"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-foreground">
          <UserRoundIcon className="size-4" aria-hidden="true" />
        </span>
        <span className="grid min-w-0 gap-0.5">
          <span className="truncate text-sm font-semibold">{displayName}</span>
          <span className="truncate text-[0.7rem] text-sidebar-foreground/55">
            {displayEmail}
          </span>
        </span>
      </Link>
      <Button
        className="h-9 justify-start px-2 text-sidebar-foreground hover:bg-sidebar-accent/55"
        disabled={isLoggingOut}
        onClick={handleLogout}
        type="button"
        variant="ghost"
      >
        <LogOutIcon aria-hidden="true" />
        {isLoggingOut ? "退出中" : "退出登录"}
      </Button>
    </div>
  );
}
