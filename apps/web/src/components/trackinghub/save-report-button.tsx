"use client";

import { useState } from "react";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DailyReportSavePayload } from "@/lib/reports/report-draft";

export function SaveReportButton({
  payload,
}: {
  payload: DailyReportSavePayload;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  async function saveReport() {
    setStatus("saving");

    const response = await fetch("/api/reports", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    setStatus(response.ok ? "saved" : "error");
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button disabled={status === "saving"} onClick={saveReport} type="button">
        <Save data-icon="inline-start" />
        {status === "saving" ? "保存中" : "保存日报"}
      </Button>
      {status === "saved" ? (
        <span className="text-sm text-muted-foreground">已保存到报告记录。</span>
      ) : null}
      {status === "error" ? (
        <span className="text-sm text-destructive">
          保存失败，请确认已登录且拥有写入权限。
        </span>
      ) : null}
    </div>
  );
}
