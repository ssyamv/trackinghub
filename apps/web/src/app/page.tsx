import { AppShell } from "@/components/trackinghub/app-shell";
import { HomeAnalyticsPanel } from "@/components/trackinghub/home-analytics-panel";
import { PageHeader } from "@/components/trackinghub/page-header";
import { StatusBadge } from "@/components/trackinghub/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  analyticsRangeLabel,
  createClickHouseAnalyticsClientFromEnv,
  type AnalyticsFilters,
  type AnalyticsFilterInput,
  normalizeAnalyticsFilters,
} from "@/lib/analytics/clickhouse-analytics";
import { getCurrentUserFromCookieHeader } from "@/lib/api/auth";
import { assertCanRead } from "@/lib/auth/permissions";
import { defaultMetadataStore } from "@/lib/metadata/default-metadata-store";
import { getPostgresConnectionString } from "@/lib/metadata/postgres";
import type { ProjectsOverview } from "@/lib/metadata/metadata-store";
import type { StatusCard } from "@/lib/trackinghub/types";
import {
  Activity,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams?: AnalyticsFilterInput | Promise<AnalyticsFilterInput>;
};

const HOME_DEFAULT_FUNNEL_STEPS = [
  "signup_view",
  "signup_submit",
  "signup_success",
];

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

async function loadAnalyticsData(filters: AnalyticsFilterInput) {
  const client = createClickHouseAnalyticsClientFromEnv();

  if (!client) {
    return null;
  }

  try {
    return await client.loadAnalytics(filters);
  } catch {
    return null;
  }
}

function projectScopedHref(
  href: string,
  projectId?: unknown,
  options: {
    filters?: AnalyticsFilters;
    includeDefaultFunnel?: boolean;
  } = {},
) {
  const url = new URL(href, "http://localhost");

  if (typeof projectId === "string" && projectId) {
    url.searchParams.set("project_id", projectId);
  }

  if (options.includeDefaultFunnel) {
    url.searchParams.set("funnel_steps", HOME_DEFAULT_FUNNEL_STEPS.join(","));
  }

  if (options.filters?.dateFrom && options.filters.dateTo) {
    url.searchParams.set("date_from", options.filters.dateFrom);
    url.searchParams.set("date_to", options.filters.dateTo);
  } else if (options.filters?.range) {
    url.searchParams.set("range", options.filters.range);
  }

  return `${url.pathname}${url.search}`;
}

function withHomeDefaultFunnel(filters: AnalyticsFilterInput) {
  if (filters.funnelSteps || filters.funnel_steps) {
    return filters;
  }

  return {
    ...filters,
    funnel_steps: HOME_DEFAULT_FUNNEL_STEPS.join(","),
  };
}

function selectedProjectName(
  overview: ProjectsOverview | null,
  projectId?: unknown,
) {
  if (typeof projectId !== "string" || !projectId) {
    return "全部项目";
  }

  return (
    overview?.projects.find((project) => project.id === projectId)?.name ??
    projectId
  );
}

function enabledEnvironmentCount(
  overview: ProjectsOverview | null,
  projectId: string,
) {
  return (
    overview?.environments.filter(
      (environment) =>
        environment.projectId === projectId && environment.enabled,
    ).length ?? 0
  );
}

function lastEventAt(overview: ProjectsOverview | null, projectId: string) {
  const timestamps =
    overview?.environments
      .filter((environment) => environment.projectId === projectId)
      .map((environment) => environment.lastEventAt)
      .filter((item): item is string => Boolean(item))
      .sort()
      .reverse() ?? [];

  return timestamps[0] ?? "暂无事件";
}

function activeSdkKeyCount(overview: ProjectsOverview | null) {
  return (
    overview?.sdkKeys.filter((key) => key.status === "active").length ?? 0
  );
}

function rotatingSdkKeyCount(overview: ProjectsOverview | null) {
  return (
    overview?.sdkKeys.filter((key) => key.status === "rotating").length ?? 0
  );
}

function buildHomeActiveProjectCard(
  overview: ProjectsOverview | null,
): StatusCard {
  const activeProjects = overview?.projects.filter(
    (project) => project.status === "active",
  ).length;
  const enabledEnvironments = overview?.environments.filter(
    (environment) => environment.enabled,
  ).length;

  return {
    label: "活跃项目",
    value: activeProjects === undefined ? "0" : String(activeProjects),
    detail:
      enabledEnvironments === undefined
        ? "未配置 Postgres 元数据源"
        : `${enabledEnvironments} 个环境已启用`,
    tone: "blue",
  };
}

export default async function Home({ searchParams }: HomePageProps) {
  const filters = withHomeDefaultFunnel(
    await Promise.resolve(searchParams ?? {}),
  );
  const projectId =
    typeof filters.project_id === "string"
      ? filters.project_id
      : typeof filters.projectId === "string"
        ? filters.projectId
        : undefined;
  const normalizedFilters = normalizeAnalyticsFilters(filters);
  const range = normalizedFilters.range;
  const rangeLabel = analyticsRangeLabel(normalizedFilters);
  const [overview, analytics] = await Promise.all([
    loadProjectsOverview(),
    loadAnalyticsData(filters),
  ]);
  const activeProjectCard = buildHomeActiveProjectCard(overview);
  const activeProjects =
    overview?.projects.filter((project) => project.status === "active") ?? [];
  const projectRows = activeProjects.slice(0, 5);
  const selectedName = selectedProjectName(overview, projectId);
  const environmentTotal = overview?.environments.length ?? 0;
  const enabledEnvironmentTotal =
    overview?.environments.filter((environment) => environment.enabled).length ??
    0;
  const analyticsHref = projectScopedHref("/analytics", projectId, {
    filters: normalizedFilters,
    includeDefaultFunnel: true,
  });

  return (
    <AppShell activeHref="/">
      <PageHeader
        eyebrow="状态总览"
        title="项目数据概览"
        actions={
          <>
            <Button asChild type="button" variant="outline">
              <a href="/projects">
                项目管理
                <ArrowRight aria-hidden="true" />
              </a>
            </Button>
            <Button asChild type="button">
              <a href={analyticsHref}>
                查看分析
                <BarChart3 aria-hidden="true" />
              </a>
            </Button>
          </>
        }
      />

      <div className="mt-5 flex flex-wrap gap-2">
        <Badge variant="secondary">当前：{selectedName}</Badge>
        <Badge variant="outline">
          {analytics ? "ClickHouse 已连接" : "ClickHouse 未连接"}
        </Badge>
        <Badge variant="outline">
          {overview ? "Postgres 元数据已连接" : "Postgres 元数据未配置"}
        </Badge>
      </div>

      <HomeAnalyticsPanel
        initialActiveProjectCard={activeProjectCard}
        initialAnalytics={analytics}
        initialDateFrom={normalizedFilters.dateFrom}
        initialDateTo={normalizedFilters.dateTo}
        initialRange={range}
        initialRangeLabel={rangeLabel}
        projectId={projectId}
      />

      <div className="mt-5">
        <Card>
          <CardHeader className="border-b border-border/80">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>项目接入队列</CardTitle>
              </div>
              <Button asChild size="sm" variant="outline">
                <a href="/projects">
                  管理
                  <ArrowRight aria-hidden="true" />
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="divide-y divide-border/70">
              {projectRows.length > 0 ? (
                projectRows.map((project) => (
                  <div
                    className="grid gap-3 py-3 md:grid-cols-[minmax(0,1fr)_120px_150px_120px] md:items-center"
                    key={project.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{project.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {project.slug}
                      </p>
                    </div>
                    <div className="text-sm">
                      {project.platforms.join(" / ") || "未配置"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {enabledEnvironmentCount(overview, project.id)} 个环境启用
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {lastEventAt(overview, project.id)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border p-5 text-sm leading-6 text-muted-foreground">
                  暂无可展示项目。连接 Postgres 后，首页会列出正式项目的接入状态。
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-h-[356px]">
          <CardHeader className="border-b border-border/80">
            <CardTitle>接入健康</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-chart-2/10 p-3">
                <p className="text-xs text-muted-foreground">环境启用</p>
                <p className="mt-2 text-2xl font-bold">
                  {enabledEnvironmentTotal}/{environmentTotal}
                </p>
              </div>
              <div className="rounded-lg bg-chart-3/10 p-3">
                <p className="text-xs text-muted-foreground">Active Key</p>
                <p className="mt-2 text-2xl font-bold">
                  {activeSdkKeyCount(overview)}
                </p>
              </div>
            </div>
            <div className="space-y-3 rounded-lg border border-border/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">轮换中的 Key</span>
                <StatusBadge
                  tone={rotatingSdkKeyCount(overview) > 0 ? "warning" : "success"}
                >
                  {rotatingSdkKeyCount(overview)} 个
                </StatusBadge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">元数据仓储</span>
                <StatusBadge tone={overview ? "success" : "warning"}>
                  {overview ? "可读" : "未配置"}
                </StatusBadge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">事件仓储</span>
                <StatusBadge tone={analytics ? "success" : "warning"}>
                  {analytics ? "可读" : "未配置"}
                </StatusBadge>
              </div>
            </div>
            <Button asChild className="w-full" variant="outline">
              <a href="/health">
                查看健康检查
                <Activity aria-hidden="true" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
