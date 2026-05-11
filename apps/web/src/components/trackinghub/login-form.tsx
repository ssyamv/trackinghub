"use client";

import { useState, type FormEvent } from "react";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function LoginForm({ redirectTo = "/" }: { redirectTo?: string }) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      setError(body?.message ?? "登录失败，请检查账号和密码。");
      setIsSubmitting(false);
      return;
    }

    window.location.assign(redirectTo);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl tracking-normal">
          登录 TrackingHub
        </CardTitle>
        <CardDescription>内部项目埋点治理与分析平台</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              邮箱
            </label>
            <Input
              autoComplete="email"
              id="email"
              name="email"
              placeholder="admin@example.com"
              required
              type="email"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              密码
            </label>
            <Input
              autoComplete="current-password"
              id="password"
              name="password"
              required
              type="password"
            />
          </div>
          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <Button className="w-full" disabled={isSubmitting} type="submit">
            <LogIn aria-hidden="true" />
            {isSubmitting ? "登录中" : "进入工作台"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
