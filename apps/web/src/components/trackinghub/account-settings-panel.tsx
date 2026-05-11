"use client";

import { SaveIcon, ShieldCheckIcon, UserRoundIcon } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AuthenticatedUser, UserRole } from "@/lib/auth/permissions";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "管理员",
  editor: "编辑者",
  viewer: "观察者",
};

type ProfileUser = AuthenticatedUser & {
  id: string;
  email: string;
  name: string;
};

type ProfileResponse = {
  ok: boolean;
  data?: {
    user?: ProfileUser;
  };
  error?: {
    message?: string;
  };
};

export function AccountSettingsPanel({ user }: { user: ProfileUser }) {
  const [currentUser, setCurrentUser] = useState(user);
  const [name, setName] = useState(user.name);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const nextName = name.trim();

    if (!nextName) {
      setError("姓名不能为空");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ name: nextName }),
      });
      const payload = (await response.json().catch(() => null)) as
        | ProfileResponse
        | null;

      if (!response.ok || !payload?.data?.user) {
        setError(payload?.error?.message ?? "个人信息更新失败");
        return;
      }

      setCurrentUser(payload.data.user);
      setName(payload.data.user.name);
      setMessage("个人信息已更新");
    } catch {
      setError("个人信息更新失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl tracking-normal">
            <UserRoundIcon className="size-5 text-primary" aria-hidden="true" />
            个人信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="profile-name">
                姓名
              </label>
              <Input
                autoComplete="name"
                id="profile-name"
                maxLength={80}
                name="name"
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="profile-email">
                邮箱
              </label>
              <Input
                id="profile-email"
                name="email"
                readOnly
                type="email"
                value={currentUser.email}
              />
            </div>

            {error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            {message ? (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
                {message}
              </div>
            ) : null}

            <div>
              <Button disabled={isSubmitting} type="submit">
                <SaveIcon aria-hidden="true" />
                {isSubmitting ? "保存中" : "保存资料"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg tracking-normal">
            <ShieldCheckIcon className="size-5 text-primary" aria-hidden="true" />
            账号权限
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm">
          <div className="grid gap-1">
            <span className="text-muted-foreground">当前角色</span>
            <span className="font-semibold">{ROLE_LABELS[currentUser.role]}</span>
          </div>
          <div className="grid gap-1">
            <span className="text-muted-foreground">账号邮箱</span>
            <span className="break-all font-medium">{currentUser.email}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
