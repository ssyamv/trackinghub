"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AnalyticsDimensionGroup,
  AnalyticsFunnelStep,
  AnalyticsPropertyValueItem,
  AnalyticsTrendItem,
  StatusCard,
} from "@/lib/trackinghub/types";
import type {
  AnalyticsData,
  AnalyticsFilters,
  AnalyticsGranularity,
  AnalyticsRange,
} from "@/lib/analytics/clickhouse-analytics";
import { cn } from "@/lib/utils";
import {
  Layers3,
  RotateCcw,
  Search,
} from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";

import {
  AnalyticsFunnelChart,
  AnalyticsTrendChart,
} from "./analytics-charts";
import { AnalyticsEventTable } from "./analytics-event-table";
import { MetricCard } from "./metric-card";

const selectClassName =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function FilterField({
  className,
  label,
  children,
}: {
  className?: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "grid min-w-0 gap-1.5 text-sm font-medium text-foreground",
        className,
      )}
    >
      <span className="text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function sumBy<T extends string>(
  items: AnalyticsTrendItem[],
  key: (item: AnalyticsTrendItem) => T,
) {
  const totals = new Map<T, number>();

  for (const item of items) {
    const group = key(item);
    totals.set(group, (totals.get(group) ?? 0) + item.eventCountValue);
  }

  return Array.from(totals.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value);
}

function formatNumber(value: number) {
  return Intl.NumberFormat("zh-CN").format(value);
}

type AnalyticsFormState = {
  dateFrom: string;
  dateTo: string;
  environment: string;
  eventName: string;
  granularity: AnalyticsGranularity;
  rangeMode: AnalyticsRange | "custom";
  source: string;
};

type AnalyticsWorkbenchData = Pick<
  AnalyticsData,
  | "source"
  | "metrics"
  | "trendItems"
  | "funnelSteps"
  | "dimensionGroups"
  | "propertyItems"
  | "propertyKeyCount"
>;

type AnalyticsApiPayload = {
  ok?: boolean;
  data?: {
    analytics: AnalyticsData | null;
    filters: AnalyticsFilters;
  };
  error?: {
    code?: string;
    message?: string;
  };
};

function filtersToFormState(filters: AnalyticsFilters): AnalyticsFormState {
  return {
    dateFrom: filters.dateFrom ?? "",
    dateTo: filters.dateTo ?? "",
    environment: filters.environment ?? "",
    eventName: filters.eventName ?? "",
    granularity: filters.granularity,
    rangeMode: filters.dateFrom && filters.dateTo ? "custom" : filters.range,
    source: filters.source ?? "",
  };
}

function parseFunnelSteps(value: string) {
  return value
    .split(",")
    .map((step) => step.trim())
    .filter(Boolean);
}

function cleanOptional(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildAnalyticsParams(filters: AnalyticsFilters) {
  const params = new URLSearchParams();

  if (filters.projectId) {
    params.set("project_id", filters.projectId);
  }

  if (filters.environment) {
    params.set("environment", filters.environment);
  }

  if (filters.source) {
    params.set("source", filters.source);
  }

  if (filters.eventName) {
    params.set("event_name", filters.eventName);
  }

  params.set("range", filters.range);
  params.set("granularity", filters.granularity);

  if (filters.dateFrom && filters.dateTo) {
    params.set("date_from", filters.dateFrom);
    params.set("date_to", filters.dateTo);
  }

  if (filters.funnelSteps.length > 0) {
    params.set("funnel_steps", filters.funnelSteps.join(","));
  }

  return params;
}

function buildAnalyticsHref(filters: AnalyticsFilters) {
  const params = buildAnalyticsParams(filters);
  const query = params.toString();
  return query ? `/analytics?${query}` : "/analytics";
}

function largestDropoff(steps: AnalyticsFunnelStep[]) {
  if (steps.length < 2) {
    return null;
  }

  return steps.slice(1).reduce<{
    from: AnalyticsFunnelStep;
    to: AnalyticsFunnelStep;
    dropoffRate: number;
  } | null>((largest, step, index) => {
    const previous = steps[index];
    const dropoffRate = Math.max(previous.conversionRate - step.conversionRate, 0);

    if (!largest || dropoffRate > largest.dropoffRate) {
      return { from: previous, to: step, dropoffRate };
    }

    return largest;
  }, null);
}

function SegmentBreakdown({ items }: { items: AnalyticsTrendItem[] }) {
  const sourceItems = sumBy(items, (item) => item.source || "unknown").slice(0, 4);
  const environmentItems = sumBy(
    items,
    (item) => item.environment || "unknown",
  ).slice(0, 4);
  const topEventItems = sumBy(items, (item) => item.eventName || "unknown").slice(
    0,
    6,
  );
  const maxValue = Math.max(...topEventItems.map((item) => item.value), 1);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <AnalyticsTrendChart items={items} />
      <div className="grid gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Layers3 className="h-4 w-4" />
            维度拆分
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div>
              <div className="text-xs font-semibold text-muted-foreground">
                平台
              </div>
              <div className="mt-2 grid gap-2">
                {sourceItems.map((item) => (
                  <div
                    className="flex items-center justify-between gap-3 text-sm"
                    key={item.label}
                  >
                    <span className="font-mono text-xs">{item.label}</span>
                    <span className="font-medium">{formatNumber(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground">
                环境
              </div>
              <div className="mt-2 grid gap-2">
                {environmentItems.map((item) => (
                  <div
                    className="flex items-center justify-between gap-3 text-sm"
                    key={item.label}
                  >
                    <span className="font-mono text-xs">{item.label}</span>
                    <span className="font-medium">{formatNumber(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm font-semibold">高频事件</div>
          <div className="mt-4 grid gap-3">
            {topEventItems.map((item) => (
              <div className="grid gap-1.5" key={item.label}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-mono text-xs">{item.label}</span>
                  <span className="font-medium">{formatNumber(item.value)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-chart-2"
                    style={{
                      width: `${Math.max(4, (item.value / maxValue) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FunnelDiagnostics({ steps }: { steps: AnalyticsFunnelStep[] }) {
  const dropoff = largestDropoff(steps);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <AnalyticsFunnelChart steps={steps} />
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="text-sm font-semibold">掉点诊断</div>
        {dropoff ? (
          <div className="mt-4 space-y-4">
            <div>
              <div className="text-xs font-semibold text-muted-foreground">
                最大掉点
              </div>
              <div className="mt-1 text-2xl font-semibold">
                {(dropoff.dropoffRate * 100).toFixed(1)}%
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {dropoff.from.step}. {dropoff.from.eventName} 到 {dropoff.to.step}.{" "}
                {dropoff.to.eventName}
              </p>
            </div>
            <div className="grid gap-2">
              {steps.map((step) => (
                <div
                  className="rounded-md border border-border bg-muted/20 p-3"
                  key={step.step}
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-mono text-xs">
                      {step.step}. {step.eventName}
                    </span>
                    <span className="font-semibold">{step.conversion}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full rounded-full bg-chart-3"
                      style={{
                        width: `${Math.max(3, Math.min(100, step.conversionRate * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            至少配置两个漏斗步骤后，才能计算掉点。
          </p>
        )}
      </div>
    </div>
  );
}

function PropertyAnalysis({
  eventName,
  items,
  propertyKeyCount,
}: {
  eventName?: string;
  items: AnalyticsPropertyValueItem[];
  propertyKeyCount: number;
}) {
  const groups = Array.from(
    items.reduce((map, item) => {
      const group = map.get(item.propertyKey) ?? [];
      group.push(item);
      map.set(item.propertyKey, group);
      return map;
    }, new Map<string, AnalyticsPropertyValueItem[]>()),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl tracking-normal">事件参数分析</CardTitle>
      </CardHeader>
      <CardContent>
        {eventName ? (
          items.length > 0 ? (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="text-xs font-semibold text-muted-foreground">
                    当前事件
                  </div>
                  <div className="mt-2 break-all font-mono text-sm font-semibold">
                    {eventName}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="text-xs font-semibold text-muted-foreground">
                    参数数量
                  </div>
                  <div className="mt-2 text-2xl font-semibold">
                    {formatNumber(propertyKeyCount)}
                  </div>
                </div>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {groups.map(([propertyKey, propertyItems]) => (
                  <div
                    className="rounded-lg border border-border bg-card p-4"
                    key={propertyKey}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="break-all font-mono text-sm font-semibold">
                        {propertyKey}
                      </div>
                      <div className="text-xs font-semibold text-muted-foreground">
                        不同取值 {formatNumber(propertyItems[0]?.distinctValues ?? 0)}
                      </div>
                    </div>
                    <div className="mt-3 overflow-x-auto rounded-md border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>参数值</TableHead>
                            <TableHead>出现次数</TableHead>
                            <TableHead>唯一用户</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {propertyItems.map((item) => (
                            <TableRow
                              key={`${item.propertyKey}:${item.propertyValue}`}
                            >
                              <TableCell className="max-w-[360px] truncate font-mono text-xs">
                                {item.propertyValue}
                              </TableCell>
                              <TableCell>{item.eventCount}</TableCell>
                              <TableCell>{item.uniqueUsers}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              当前事件在筛选范围内暂无参数取值。
            </div>
          )
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            输入事件名后，可自动查看该事件所有参数的取值数量和出现次数。
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DimensionDistribution({
  groups,
}: {
  groups: AnalyticsDimensionGroup[];
}) {
  const visibleGroups = groups.filter((group) => group.items.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl tracking-normal">用户分布</CardTitle>
      </CardHeader>
      <CardContent>
        {visibleGroups.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {visibleGroups.map((group) => (
              <div
                className="rounded-lg border border-border bg-card p-4"
                key={group.key}
              >
                <div className="text-sm font-semibold">{group.label}</div>
                <div className="mt-4 grid gap-3">
                  {group.items.map((item) => (
                    <div className="grid gap-1.5" key={item.value}>
                      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate font-mono text-xs font-semibold">
                          {item.value}
                        </span>
                        <span className="font-semibold">{item.share}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>事件 {item.eventCount}</span>
                        <span>用户 {item.uniqueUsers}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-chart-4"
                          style={{
                            width: `${Math.max(
                              item.shareValue > 0 ? 3 : 0,
                              Math.min(100, item.shareValue * 100),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            当前筛选范围暂无用户分布数据。
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalyticsWorkbench({
  dimensionGroups = [],
  filters,
  metrics,
  funnelSteps,
  propertyKeyCount,
  propertyItems,
  trendItems,
  source,
}: {
  dimensionGroups: AnalyticsDimensionGroup[];
  filters: AnalyticsFilters;
  metrics: StatusCard[];
  funnelSteps: AnalyticsFunnelStep[];
  propertyKeyCount: number;
  propertyItems: AnalyticsPropertyValueItem[];
  trendItems: AnalyticsTrendItem[];
  source: "clickhouse" | "unavailable";
}) {
  const [activeFilters, setActiveFilters] = useState(filters);
  const [formState, setFormState] = useState(() => filtersToFormState(filters));
  const [funnelStepsText, setFunnelStepsText] = useState(() =>
    filters.funnelSteps.join(", "),
  );
  const [workbenchData, setWorkbenchData] = useState<AnalyticsWorkbenchData>({
    dimensionGroups,
    funnelSteps,
    metrics,
    propertyKeyCount,
    propertyItems,
    source,
    trendItems,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  async function refreshAnalytics(nextFilters: AnalyticsFilters) {
    setIsLoading(true);
    setRefreshError(null);

    try {
      const params = buildAnalyticsParams(nextFilters);
      const response = await fetch(`/api/analytics?${params.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json()) as AnalyticsApiPayload;
      const nextAnalytics = payload.data?.analytics;
      const normalizedFilters = payload.data?.filters;

      if (!response.ok || !payload.ok || !nextAnalytics || !normalizedFilters) {
        throw new Error(payload.error?.message ?? "分析刷新失败");
      }

      setActiveFilters(normalizedFilters);
      setFormState(filtersToFormState(normalizedFilters));
      setFunnelStepsText(normalizedFilters.funnelSteps.join(", "));
      setWorkbenchData({
        dimensionGroups: nextAnalytics.dimensionGroups,
        funnelSteps: nextAnalytics.funnelSteps,
        metrics: nextAnalytics.metrics,
        propertyKeyCount: nextAnalytics.propertyKeyCount,
        propertyItems: nextAnalytics.propertyItems,
        source: nextAnalytics.source,
        trendItems: nextAnalytics.trendItems,
      });
      window.history.pushState(null, "", buildAnalyticsHref(normalizedFilters));
    } catch (error) {
      setRefreshError(
        error instanceof Error
          ? `局部刷新失败：${error.message}`
          : "局部刷新失败，请确认已登录且分析数据源可用。",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const environment = cleanOptional(formState.environment);
    const eventName = cleanOptional(formState.eventName);
    const sourceValue = cleanOptional(formState.source);
    const nextFilters: AnalyticsFilters = {
      funnelSteps: activeFilters.funnelSteps,
      granularity: formState.granularity,
      range: formState.rangeMode === "custom" ? activeFilters.range : formState.rangeMode,
    };

    if (activeFilters.projectId) {
      nextFilters.projectId = activeFilters.projectId;
    }

    if (environment) {
      nextFilters.environment =
        environment as NonNullable<AnalyticsFilters["environment"]>;
    }

    if (eventName) {
      nextFilters.eventName = eventName;
    }

    if (sourceValue) {
      nextFilters.source =
        sourceValue as NonNullable<AnalyticsFilters["source"]>;
    }

    if (
      formState.rangeMode === "custom" &&
      formState.dateFrom &&
      formState.dateTo
    ) {
      nextFilters.dateFrom = formState.dateFrom;
      nextFilters.dateTo = formState.dateTo;
    }

    void refreshAnalytics(nextFilters);
  }

  function handleReset() {
    const nextFilters: AnalyticsFilters = {
      funnelSteps: activeFilters.funnelSteps,
      granularity: "day",
      range: "7d",
    };

    if (activeFilters.projectId) {
      nextFilters.projectId = activeFilters.projectId;
    }

    void refreshAnalytics(nextFilters);
  }

  function handleFunnelSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    void refreshAnalytics({
      ...activeFilters,
      funnelSteps: parseFunnelSteps(funnelStepsText),
    });
  }

  return (
    <div className="space-y-6">
      <form
        className="rounded-lg border border-border bg-background p-4 shadow-[0_1px_0_rgba(35,37,29,0.04)]"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
          <div>
            <div className="text-sm font-semibold">筛选条件</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit">
              <Search data-icon="inline-start" />
              {isLoading ? "刷新中" : "查询"}
            </Button>
            <Button
              disabled={isLoading}
              onClick={handleReset}
              type="button"
              variant="outline"
            >
              <RotateCcw data-icon="inline-start" />
              重置
            </Button>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-6 xl:grid-cols-10">
          <FilterField className="md:col-span-2 xl:col-span-2" label="环境">
            <select
              className={selectClassName}
              name="environment"
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  environment: event.target.value,
                }))
              }
              value={formState.environment}
            >
              <option value="">全部环境</option>
              <option value="dev">dev</option>
              <option value="staging">staging</option>
              <option value="prod">prod</option>
            </select>
          </FilterField>
          <FilterField className="md:col-span-2 xl:col-span-2" label="平台">
            <select
              className={selectClassName}
              name="source"
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  source: event.target.value,
                }))
              }
              value={formState.source}
            >
              <option value="">全部平台</option>
              <option value="web">Web</option>
              <option value="flutter">Flutter</option>
            </select>
          </FilterField>
          <FilterField className="md:col-span-2 xl:col-span-2" label="时间范围">
            <select
              className={selectClassName}
              name="range"
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  dateFrom:
                    event.target.value === "custom" ? current.dateFrom : "",
                  dateTo: event.target.value === "custom" ? current.dateTo : "",
                  rangeMode: event.target.value as AnalyticsRange | "custom",
                }))
              }
              value={formState.rangeMode}
            >
              <option value="7d">最近 7 天</option>
              <option value="30d">最近 30 天</option>
              <option value="custom">自定义</option>
            </select>
          </FilterField>
          {formState.rangeMode === "custom" ? (
            <>
              <FilterField className="md:col-span-2 xl:col-span-2" label="开始日期">
                <Input
                  className="h-9 bg-card"
                  name="date_from"
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      dateFrom: event.target.value,
                    }))
                  }
                  type="date"
                  value={formState.dateFrom}
                />
              </FilterField>
              <FilterField className="md:col-span-2 xl:col-span-2" label="结束日期">
                <Input
                  className="h-9 bg-card"
                  name="date_to"
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      dateTo: event.target.value,
                    }))
                  }
                  type="date"
                  value={formState.dateTo}
                />
              </FilterField>
            </>
          ) : null}
          <FilterField className="md:col-span-2 xl:col-span-1" label="粒度">
            <select
              className={selectClassName}
              name="granularity"
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  granularity: event.target.value as AnalyticsGranularity,
                }))
              }
              value={formState.granularity}
            >
              <option value="day">按天</option>
              <option value="hour">按小时</option>
            </select>
          </FilterField>
          <FilterField className="md:col-span-2 xl:col-span-2" label="事件名">
            <Input
              className="h-9 bg-card"
              name="event_name"
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  eventName: event.target.value,
                }))
              }
              placeholder="event_name"
              value={formState.eventName}
            />
          </FilterField>
        </div>
        {(isLoading || refreshError) && (
          <div
            className={cn(
              "mt-3 rounded-md px-3 py-2 text-xs leading-5",
              refreshError
                ? "bg-destructive/10 text-destructive"
                : "bg-muted/50 text-muted-foreground",
            )}
          >
            {refreshError ?? "正在局部刷新分析数据，页面不会重新加载。"}
          </div>
        )}
      </form>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {workbenchData.metrics.length > 0 ? (
          workbenchData.metrics.map((metric) => (
            <MetricCard
              detail={metric.detail}
              key={metric.label}
              label={metric.label}
              tone={metric.tone}
              value={metric.value}
            />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground md:col-span-2 xl:col-span-4">
            暂不能生成指标卡片。
          </div>
        )}
      </section>

      <DimensionDistribution groups={workbenchData.dimensionGroups} />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl tracking-normal">事件趋势与维度拆分</CardTitle>
        </CardHeader>
        <CardContent>
          {workbenchData.trendItems.length > 0 ? (
            <>
              <SegmentBreakdown items={workbenchData.trendItems} />
              <div className="mt-5">
                <AnalyticsEventTable items={workbenchData.trendItems} />
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              当前筛选范围暂无事件趋势数据。
            </div>
          )}
        </CardContent>
      </Card>

      <PropertyAnalysis
        eventName={activeFilters.eventName}
        items={workbenchData.propertyItems}
        propertyKeyCount={workbenchData.propertyKeyCount}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl tracking-normal">漏斗转化诊断</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"
            onSubmit={handleFunnelSubmit}
          >
            <FilterField label="分析步骤">
              <Input
                className="h-9 bg-card"
                name="funnel_steps"
                onChange={(event) => setFunnelStepsText(event.target.value)}
                placeholder="event_a, event_b"
                value={funnelStepsText}
              />
            </FilterField>
            <Button className="self-end" disabled={isLoading} type="submit">
              {isLoading ? "刷新中" : "应用漏斗"}
            </Button>
          </form>
          {workbenchData.funnelSteps.length > 0 ? (
            <>
              <FunnelDiagnostics steps={workbenchData.funnelSteps} />
              <Table className="mt-5">
                <TableHeader>
                  <TableRow>
                    <TableHead>步骤</TableHead>
                    <TableHead>事件</TableHead>
                    <TableHead>用户数</TableHead>
                    <TableHead>转化率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workbenchData.funnelSteps.map((step) => (
                    <TableRow key={step.step}>
                      <TableCell>{step.step}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {step.eventName}
                      </TableCell>
                      <TableCell>{step.users}</TableCell>
                      <TableCell>{step.conversion}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              当前筛选范围暂无漏斗数据。
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
