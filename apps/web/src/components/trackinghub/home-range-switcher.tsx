"use client";

import type { FormEvent } from "react";

type HomeRangeSwitcherProps = {
  currentRange: "7d" | "30d";
  dateFrom?: string;
  dateTo?: string;
  isLoading?: boolean;
  onRangeChange?: (selection: HomeRangeSelection) => void;
  projectId?: string;
};

export type HomeRangeSelection =
  | { range: "7d" | "30d" }
  | { dateFrom: string; dateTo: string };

const RANGE_OPTIONS = [
  { label: "近 7 天", value: "7d" },
  { label: "近 30 天", value: "30d" },
] as const;

function rangeHref(range: "7d" | "30d", projectId?: string) {
  const url = new URL("/", "http://localhost");

  if (projectId) {
    url.searchParams.set("project_id", projectId);
  }

  url.searchParams.set("range", range);

  return `${url.pathname}${url.search}`;
}

export function HomeRangeSwitcher({
  currentRange,
  dateFrom,
  dateTo,
  isLoading = false,
  onRangeChange,
  projectId,
}: HomeRangeSwitcherProps) {
  const customActive = Boolean(dateFrom && dateTo);
  const isClientControlled = Boolean(onRangeChange);

  function handleCustomSubmit(event: FormEvent<HTMLFormElement>) {
    if (!onRangeChange) {
      return;
    }

    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const nextDateFrom = String(formData.get("date_from") ?? "");
    const nextDateTo = String(formData.get("date_to") ?? "");

    if (nextDateFrom && nextDateTo) {
      onRangeChange({ dateFrom: nextDateFrom, dateTo: nextDateTo });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <nav
        aria-label="选择首页图表时间段"
        className="inline-flex rounded-lg border border-border bg-background/70 p-1"
      >
        {RANGE_OPTIONS.map((option) => {
          const active = !customActive && option.value === currentRange;
          const className = [
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            active
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          ].join(" ");

          return isClientControlled ? (
            <button
              aria-current={active ? "true" : undefined}
              className={className}
              disabled={isLoading}
              key={option.value}
              onClick={() => onRangeChange?.({ range: option.value })}
              type="button"
            >
              {option.label}
            </button>
          ) : (
            <a
              aria-current={active ? "true" : undefined}
              className={className}
              href={rangeHref(option.value, projectId)}
              key={option.value}
            >
              {option.label}
            </a>
          );
        })}
      </nav>
      <form
        action="/"
        aria-label="自定义首页图表时间段"
        className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/70 p-1"
        method="get"
        onSubmit={handleCustomSubmit}
      >
        {projectId ? (
          <input name="project_id" type="hidden" value={projectId} />
        ) : null}
        <span
          className={[
            "rounded-md px-2 py-1.5 text-xs font-medium",
            customActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground",
          ].join(" ")}
        >
          自定义
        </span>
        <label className="sr-only" htmlFor="home-date-from">
          开始日期
        </label>
        <input
          className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
          defaultValue={dateFrom}
          id="home-date-from"
          name="date_from"
          type="date"
        />
        <span className="text-xs text-muted-foreground">至</span>
        <label className="sr-only" htmlFor="home-date-to">
          结束日期
        </label>
        <input
          className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
          defaultValue={dateTo}
          id="home-date-to"
          name="date_to"
          type="date"
        />
        <button
          className="h-8 rounded-md bg-foreground px-3 text-xs font-medium text-background transition-colors hover:bg-foreground/90"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? "更新中" : "应用"}
        </button>
      </form>
    </div>
  );
}
