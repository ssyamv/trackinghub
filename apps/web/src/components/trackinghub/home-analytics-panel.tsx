"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  AnalyticsData,
  AnalyticsFilters,
  AnalyticsRange,
} from "@/lib/analytics/clickhouse-analytics";
import type { StatusCard } from "@/lib/trackinghub/types";
import { ArrowRight } from "lucide-react";

import { HomeEventTrendChart } from "./home-event-trend-chart";
import {
  HomeRangeSwitcher,
  type HomeRangeSelection,
} from "./home-range-switcher";
import { MetricCard } from "./metric-card";

type HomeAnalyticsPanelProps = {
  initialActiveProjectCard: StatusCard;
  initialAnalytics: AnalyticsData | null;
  initialDateFrom?: string;
  initialDateTo?: string;
  initialRange: AnalyticsRange;
  initialRangeLabel: string;
  projectId?: string;
};

type HomeAnalyticsState = {
  analytics: AnalyticsData | null;
  dateFrom?: string;
  dateTo?: string;
  range: AnalyticsRange;
  rangeLabel: string;
};

type AnalyticsApiPayload = {
  ok: boolean;
  data?: {
    analytics: AnalyticsData | null;
    filters: AnalyticsFilters;
    rangeLabel: string;
  };
};

const HOME_DEFAULT_FUNNEL_STEPS = [
  "signup_view",
  "signup_submit",
  "signup_success",
];

function metricValue(analytics: AnalyticsData | null, label: string) {
  return analytics?.metrics.find((metric) => metric.label === label)?.value;
}

function rangeMetricDetail(rangeLabel: string, suffix: string) {
  const separator = rangeLabel.startsWith("最近 ") ? "" : " ";

  return `${rangeLabel}${separator}${suffix}`;
}

function buildHomeStatusCards({
  activeProjectCard,
  analytics,
  rangeLabel,
}: {
  activeProjectCard: StatusCard;
  analytics: AnalyticsData | null;
  rangeLabel: string;
}): StatusCard[] {
  const activeUsers = metricValue(analytics, "活跃用户");
  const eventCount = metricValue(analytics, "事件量");
  const anomalyRate = metricValue(analytics, "异常占比");

  return [
    activeProjectCard,
    {
      label: "活跃用户",
      value: activeUsers ?? "暂无",
      detail: analytics
        ? rangeMetricDetail(rangeLabel, "去重用户")
        : "未连接 ClickHouse",
      tone: "green",
    },
    {
      label: "事件量",
      value: eventCount ?? "暂无",
      detail: analytics
        ? rangeMetricDetail(rangeLabel, "接收事件")
        : "未连接 ClickHouse",
      tone: "purple",
    },
    {
      label: "异常占比",
      value: anomalyRate ?? "暂无",
      detail: analytics ? "来自真实验证结果" : "未连接 ClickHouse",
      tone: "red",
    },
  ];
}

function homeUrlForSelection(projectId: string | undefined, selection: HomeRangeSelection) {
  const url = new URL("/", window.location.origin);

  if (projectId) {
    url.searchParams.set("project_id", projectId);
  }

  if ("range" in selection) {
    url.searchParams.set("range", selection.range);
  } else {
    url.searchParams.set("date_from", selection.dateFrom);
    url.searchParams.set("date_to", selection.dateTo);
  }

  return `${url.pathname}${url.search}`;
}

function analyticsUrlForSelection(
  projectId: string | undefined,
  selection: HomeRangeSelection,
) {
  const url = new URL("/api/analytics", window.location.origin);

  if (projectId) {
    url.searchParams.set("project_id", projectId);
  }

  url.searchParams.set("funnel_steps", HOME_DEFAULT_FUNNEL_STEPS.join(","));

  if ("range" in selection) {
    url.searchParams.set("range", selection.range);
  } else {
    url.searchParams.set("date_from", selection.dateFrom);
    url.searchParams.set("date_to", selection.dateTo);
  }

  return url;
}

function analyticsHrefForState(
  projectId: string | undefined,
  state: Pick<HomeAnalyticsState, "dateFrom" | "dateTo" | "range">,
) {
  const url = new URL("/analytics", "http://localhost");

  if (projectId) {
    url.searchParams.set("project_id", projectId);
  }

  url.searchParams.set("funnel_steps", HOME_DEFAULT_FUNNEL_STEPS.join(","));

  if (state.dateFrom && state.dateTo) {
    url.searchParams.set("date_from", state.dateFrom);
    url.searchParams.set("date_to", state.dateTo);
  } else {
    url.searchParams.set("range", state.range);
  }

  return `${url.pathname}${url.search}`;
}

export function HomeAnalyticsPanel({
  initialActiveProjectCard,
  initialAnalytics,
  initialDateFrom,
  initialDateTo,
  initialRange,
  initialRangeLabel,
  projectId,
}: HomeAnalyticsPanelProps) {
  const [state, setState] = useState<HomeAnalyticsState>({
    analytics: initialAnalytics,
    dateFrom: initialDateFrom,
    dateTo: initialDateTo,
    range: initialRange,
    rangeLabel: initialRangeLabel,
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const statusCards = useMemo(
    () =>
      buildHomeStatusCards({
        activeProjectCard: initialActiveProjectCard,
        analytics: state.analytics,
        rangeLabel: state.rangeLabel,
      }),
    [initialActiveProjectCard, state.analytics, state.rangeLabel],
  );
  const trendItems = state.analytics?.trendItems ?? [];
  const analyticsHref = analyticsHrefForState(projectId, state);

  async function refreshAnalytics(selection: HomeRangeSelection) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(analyticsUrlForSelection(projectId, selection), {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json()) as AnalyticsApiPayload;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error("analytics request failed");
      }

      window.history.replaceState(
        null,
        "",
        homeUrlForSelection(projectId, selection),
      );
      setState({
        analytics: payload.data.analytics,
        dateFrom: payload.data.filters.dateFrom,
        dateTo: payload.data.filters.dateTo,
        range: payload.data.filters.range,
        rangeLabel: payload.data.rangeLabel,
      });
    } catch {
      setError("时间段数据更新失败，请稍后重试。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statusCards.map((card) => (
          <MetricCard
            detail={card.detail}
            key={card.label}
            label={card.label}
            tone={card.tone}
            value={card.value}
          />
        ))}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-h-[356px] xl:col-span-2">
          <CardHeader className="border-b border-border/80">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>数据脉搏</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <HomeRangeSwitcher
                  currentRange={state.range}
                  dateFrom={state.dateFrom}
                  dateTo={state.dateTo}
                  isLoading={isLoading}
                  onRangeChange={refreshAnalytics}
                  projectId={projectId}
                />
                <Button asChild size="sm" variant="outline">
                  <a href={analyticsHref}>
                    细看
                    <ArrowRight aria-hidden="true" />
                  </a>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <section aria-busy={isLoading}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">事件发生数量趋势</h2>
                <span className="text-xs text-muted-foreground">
                  {trendItems.length > 0 ? state.rangeLabel : "暂无数据"}
                </span>
              </div>
              {error ? (
                <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-foreground">
                  {error}
                </div>
              ) : null}
              <div className={isLoading ? "opacity-60 transition-opacity" : undefined}>
                {trendItems.length > 0 ? (
                  <HomeEventTrendChart
                    items={trendItems}
                    rangeLabel={state.rangeLabel}
                  />
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-5 text-sm leading-6 text-muted-foreground">
                    暂无趋势数据。连接 ClickHouse 或选择有事件的项目后，这里会展示最近事件脉搏。
                  </div>
                )}
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
