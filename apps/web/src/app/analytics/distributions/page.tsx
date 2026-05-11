import { AppShell } from "@/components/trackinghub/app-shell";
import { PageHeader } from "@/components/trackinghub/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentUserFromCookieHeader } from "@/lib/api/auth";
import {
  type AnalyticsData,
  type AnalyticsFilterInput,
  type AnalyticsFilters,
  createClickHouseAnalyticsClientFromEnv,
  normalizeAnalyticsFilters,
} from "@/lib/analytics/clickhouse-analytics";
import { assertCanRead } from "@/lib/auth/permissions";
import { getPostgresConnectionString } from "@/lib/metadata/postgres";
import type {
  AnalyticsDimensionGroup,
  AnalyticsDimensionKey,
} from "@/lib/trackinghub/types";
import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type DistributionPageSearchParams = AnalyticsFilterInput & {
  dimension?: unknown;
};

type AnalyticsDistributionPageProps = {
  searchParams?:
    | DistributionPageSearchParams
    | Promise<DistributionPageSearchParams>;
};

const DIMENSION_KEYS: AnalyticsDimensionKey[] = [
  "app_version",
  "country",
  "channel",
  "device_os",
  "device_model",
];

const unavailableAnalytics: AnalyticsData = {
  source: "unavailable",
  metrics: [],
  trendItems: [],
  funnelSteps: [],
  retentionItems: [],
  propertyItems: [],
  propertyKeyCount: 0,
  dimensionGroups: [],
};

function firstString(value: unknown) {
  if (Array.isArray(value)) {
    return firstString(value[0]);
  }

  return typeof value === "string" ? value : undefined;
}

function normalizeDimension(value: unknown): AnalyticsDimensionKey {
  const input = firstString(value);

  return DIMENSION_KEYS.includes(input as AnalyticsDimensionKey)
    ? (input as AnalyticsDimensionKey)
    : "app_version";
}

function analyticsParams(filters: AnalyticsFilters) {
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

function analyticsHref(filters: AnalyticsFilters) {
  const params = analyticsParams(filters);
  const query = params.toString();

  return query ? `/analytics?${query}` : "/analytics";
}

function distributionHref(
  filters: AnalyticsFilters,
  dimension: AnalyticsDimensionKey,
) {
  const params = analyticsParams(filters);
  params.set("dimension", dimension);

  return `/analytics/distributions?${params.toString()}`;
}

async function assertAnalyticsPageAccess() {
  if (!getPostgresConnectionString()) {
    return;
  }

  const user = await getCurrentUserFromCookieHeader(
    (await headers()).get("cookie"),
  );

  if (!user) {
    redirect("/login");
  }

  assertCanRead(user);
}

async function loadAnalytics(filters: AnalyticsFilters) {
  const client = createClickHouseAnalyticsClientFromEnv();

  if (!client) {
    return unavailableAnalytics;
  }

  try {
    return await client.loadAnalytics(filters);
  } catch {
    return unavailableAnalytics;
  }
}

function selectedGroup(
  groups: AnalyticsDimensionGroup[],
  dimension: AnalyticsDimensionKey,
) {
  return (
    groups.find((group) => group.key === dimension) ??
    groups.find((group) => group.items.length > 0) ??
    groups[0]
  );
}

export default async function AnalyticsDistributionPage({
  searchParams,
}: AnalyticsDistributionPageProps) {
  await assertAnalyticsPageAccess();

  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const filters = normalizeAnalyticsFilters(resolvedSearchParams);
  const dimension = normalizeDimension(resolvedSearchParams.dimension);
  const analytics = await loadAnalytics(filters);
  const activeGroup = selectedGroup(analytics.dimensionGroups, dimension);

  return (
    <AppShell activeHref="/analytics">
      <PageHeader
        actions={
          <Button asChild variant="outline">
            <Link href={analyticsHref(filters)}>
              <ArrowLeft data-icon="inline-start" />
              返回分析
            </Link>
          </Button>
        }
        eyebrow="Analytics"
        title="用户分布详情"
      />

      <div className="mt-6 grid gap-6">
        <div className="flex flex-wrap gap-2">
          {analytics.dimensionGroups.map((group) => (
            <Button
              asChild
              key={group.key}
              size="sm"
              variant={group.key === activeGroup?.key ? "default" : "outline"}
            >
              <Link href={distributionHref(filters, group.key)}>
                {group.label}
              </Link>
            </Button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">
              {activeGroup?.label ?? "用户分布"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeGroup && activeGroup.items.length > 0 ? (
              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>取值</TableHead>
                      <TableHead>占比</TableHead>
                      <TableHead>事件数</TableHead>
                      <TableHead>唯一用户</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeGroup.items.map((item) => (
                      <TableRow key={item.value}>
                        <TableCell
                          className="max-w-[420px] truncate font-mono text-xs"
                          title={item.value}
                        >
                          {item.value}
                        </TableCell>
                        <TableCell>
                          <div className="grid min-w-36 gap-1.5">
                            <div className="font-semibold">{item.share}</div>
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
                        </TableCell>
                        <TableCell>{item.eventCount}</TableCell>
                        <TableCell>{item.uniqueUsers}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                当前筛选范围暂无用户分布数据。
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
