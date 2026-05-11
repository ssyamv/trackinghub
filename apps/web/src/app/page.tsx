import { AppShell } from "@/components/trackinghub/app-shell";
import { MetricCard } from "@/components/trackinghub/metric-card";
import { PageHeader } from "@/components/trackinghub/page-header";
import { Button } from "@/components/ui/button";
import {
  createClickHouseAnalyticsClientFromEnv,
  type AnalyticsData,
} from "@/lib/analytics/clickhouse-analytics";
import { getCurrentUserFromCookieHeader } from "@/lib/api/auth";
import { assertCanRead } from "@/lib/auth/permissions";
import { defaultMetadataStore } from "@/lib/metadata/default-metadata-store";
import { getPostgresConnectionString } from "@/lib/metadata/postgres";
import type { ProjectsOverview } from "@/lib/metadata/metadata-store";
import type { StatusCard } from "@/lib/trackinghub/types";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function loadProjectsOverview() {
  if (!getPostgresConnectionString()) {
    return null;
  }

  const user = await getCurrentUserFromCookieHeader(
    (await headers()).get("cookie"),
  );
  if (!user) {
    redirect("/login");
  }

  assertCanRead(user);

  return defaultMetadataStore.listProjectsOverview();
}

async function loadAnalyticsData() {
  const client = createClickHouseAnalyticsClientFromEnv();

  if (!client) {
    return null;
  }

  try {
    return await client.loadAnalytics();
  } catch {
    return null;
  }
}

function metricValue(analytics: AnalyticsData | null, label: string) {
  return analytics?.metrics.find((metric) => metric.label === label)?.value;
}

function buildHomeStatusCards(
  overview: ProjectsOverview | null,
  analytics: AnalyticsData | null,
): StatusCard[] {
  const activeProjects = overview?.projects.filter(
    (project) => project.status === "active",
  ).length;
  const enabledEnvironments = overview?.environments.filter(
    (environment) => environment.enabled,
  ).length;
  const activeUsers = metricValue(analytics, "活跃用户");
  const eventCount = metricValue(analytics, "事件量");
  const anomalyRate = metricValue(analytics, "异常占比");

  return [
    {
      label: "活跃项目",
      value: activeProjects === undefined ? "0" : String(activeProjects),
      detail:
        enabledEnvironments === undefined
          ? "未配置 Postgres 元数据源"
          : `${enabledEnvironments} 个环境已启用`,
      tone: "blue",
    },
    {
      label: "活跃用户",
      value: activeUsers ?? "暂无",
      detail: analytics ? "最近 7 天去重用户" : "未连接 ClickHouse",
      tone: "green",
    },
    {
      label: "事件量",
      value: eventCount ?? "暂无",
      detail: analytics ? "最近 7 天接收事件" : "未连接 ClickHouse",
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

export default async function Home() {
  const [overview, analytics] = await Promise.all([
    loadProjectsOverview(),
    loadAnalyticsData(),
  ]);
  const statusCards = buildHomeStatusCards(overview, analytics);

  return (
    <AppShell activeHref="/">
      <PageHeader
        eyebrow="跨项目状态"
        title="把埋点定义、接入验收和产品分析放在同一张工作台。"
        description="面向产品、运营、研发的内部分析平台，以事件字典为中心同步 Web 与 Flutter 数据契约。"
        actions={
          <>
            <Button type="button" variant="outline">
              新建需求
            </Button>
            <Button type="button">接收事件</Button>
          </>
        }
      />

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      <div className="mt-6 rounded-lg border border-dashed border-border p-6 text-sm leading-6 text-muted-foreground">
        首页仅展示已连接数据源的聚合状态；项目、治理、分析和报告明细请进入对应页面查看。
      </div>
    </AppShell>
  );
}
