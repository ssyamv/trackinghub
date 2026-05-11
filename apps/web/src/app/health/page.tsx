import { AppShell } from "@/components/trackinghub/app-shell";
import { PageHeader } from "@/components/trackinghub/page-header";
import { StatusBadge, type StatusBadgeTone } from "@/components/trackinghub/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  evaluateHealth,
  type HealthCheck,
  type RuntimeHealth,
} from "@/lib/runtime/health";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  ExternalLink,
  HardDrive,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HealthCheckName = HealthCheck["name"];
type HealthCheckStatus = HealthCheck["status"];

const checkMeta: Record<
  HealthCheckName,
  {
    label: string;
    description: string;
    icon: typeof Database;
  }
> = {
  postgres: {
    label: "Postgres 元数据",
    description: "项目、环境、SDK Key、事件字典和报告持久化。",
    icon: Database,
  },
  clickhouse: {
    label: "ClickHouse 事件仓储",
    description: "原始事件、验证结果、分析趋势和日报数据源。",
    icon: HardDrive,
  },
  eventPersistence: {
    label: "事件持久化保护",
    description: "生产或强制持久化模式下，防止事件静默丢失。",
    icon: ShieldCheck,
  },
};

const statusTone: Record<HealthCheckStatus, StatusBadgeTone> = {
  ok: "success",
  warning: "warning",
  error: "danger",
};

const statusLabel: Record<HealthCheckStatus, string> = {
  ok: "正常",
  warning: "需关注",
  error: "故障",
};

const statusClassName: Record<HealthCheckStatus, string> = {
  ok: "border-chart-3/30 bg-chart-3/10",
  warning: "border-chart-1/40 bg-chart-1/10",
  error: "border-destructive/30 bg-destructive/10",
};

function runtimeMode() {
  return process.env.NODE_ENV === "production" ? "生产模式" : "本地/预发模式";
}

function requiresEventPersistence() {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.TRACKINGHUB_REQUIRE_EVENT_PERSISTENCE === "true"
  );
}

function dependencyConfigured(name: HealthCheckName) {
  if (name === "postgres") {
    return Boolean(
      process.env.TRACKINGHUB_POSTGRES_URL ?? process.env.DATABASE_URL,
    );
  }

  if (name === "clickhouse") {
    return Boolean(
      process.env.TRACKINGHUB_CLICKHOUSE_URL ?? process.env.CLICKHOUSE_URL,
    );
  }

  return requiresEventPersistence();
}

function summaryTone(health: RuntimeHealth): StatusBadgeTone {
  if (health.checks.some((check) => check.status === "error")) {
    return "danger";
  }

  if (health.checks.some((check) => check.status === "warning")) {
    return "warning";
  }

  return "success";
}

function summaryCopy(health: RuntimeHealth) {
  const errorCount = health.checks.filter((check) => check.status === "error").length;
  const warningCount = health.checks.filter(
    (check) => check.status === "warning",
  ).length;

  if (errorCount > 0) {
    return {
      title: "运行链路存在阻断项",
      detail: `${errorCount} 个故障项需要先处理，避免生产事件或管理数据不可用。`,
    };
  }

  if (warningCount > 0) {
    return {
      title: "运行链路可启动，但仍有风险",
      detail: `${warningCount} 个检查项处于需关注状态，适合本地调试，不建议直接作为生产状态。`,
    };
  }

  return {
    title: "运行链路健康",
    detail: "核心依赖均已配置并连通，事件接收、治理、分析和报告链路可以正常工作。",
  };
}

function actionHint(check: HealthCheck) {
  if (check.status === "ok") {
    return "无需处理";
  }

  if (check.name === "postgres") {
    return "检查 TRACKINGHUB_POSTGRES_URL / DATABASE_URL，并确认数据库迁移已应用。";
  }

  if (check.name === "clickhouse") {
    return "检查 TRACKINGHUB_CLICKHOUSE_URL / CLICKHOUSE_URL，以及 ClickHouse /ping 是否可达。";
  }

  return "生产模式请配置 ClickHouse，或仅在本地确认是否需要关闭强制持久化。";
}

export default async function HealthPage() {
  const health = await evaluateHealth();
  const summary = summaryCopy(health);
  const okCount = health.checks.filter((check) => check.status === "ok").length;
  const warningCount = health.checks.filter(
    (check) => check.status === "warning",
  ).length;
  const errorCount = health.checks.filter((check) => check.status === "error").length;

  return (
    <AppShell activeHref="/health">
      <PageHeader
        eyebrow="运行健康"
        title="健康检查"
        actions={
          <>
            <Button asChild type="button" variant="outline">
              <a href="/api/health" target="_blank" rel="noreferrer">
                原始接口
                <ExternalLink aria-hidden="true" />
              </a>
            </Button>
            <Button asChild type="button">
              <a href="/health">
                刷新状态
                <RefreshCw aria-hidden="true" />
              </a>
            </Button>
          </>
        }
      />

      <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div
          className={cn(
            "rounded-xl border p-5",
            health.status === "ok"
              ? "border-chart-3/35 bg-chart-3/10"
              : "border-destructive/25 bg-destructive/5",
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <StatusBadge tone={summaryTone(health)}>
                {health.status === "ok" ? "全部正常" : "降级运行"}
              </StatusBadge>
              <h2 className="mt-4 text-2xl font-bold tracking-normal">
                {summary.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {summary.detail}
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-card px-4 py-3">
              {health.status === "ok" ? (
                <CheckCircle2
                  aria-hidden="true"
                  className="size-5 text-chart-3"
                />
              ) : (
                <AlertTriangle
                  aria-hidden="true"
                  className="size-5 text-destructive"
                />
              )}
              <div>
                <p className="text-xs text-muted-foreground">当前模式</p>
                <p className="font-semibold">{runtimeMode()}</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="justify-center">
          <CardContent className="grid grid-cols-3 gap-3 py-1">
            {[
              { label: "正常", value: okCount, className: "bg-chart-3/15" },
              { label: "关注", value: warningCount, className: "bg-chart-1/15" },
              { label: "故障", value: errorCount, className: "bg-destructive/10" },
            ].map((item) => (
              <div className="rounded-lg bg-muted/50 p-3" key={item.label}>
                <div className={cn("mb-3 h-1.5 rounded-full", item.className)} />
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-2xl font-bold">{item.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-3">
        {health.checks.map((check) => {
          const meta = checkMeta[check.name];
          const Icon = meta.icon;

          return (
            <Card
              className={cn("min-h-[260px] border", statusClassName[check.status])}
              key={check.name}
            >
              <CardHeader className="border-b border-border/70">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-lg bg-card p-2 text-foreground ring-1 ring-border/80">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <StatusBadge tone={statusTone[check.status]}>
                    {statusLabel[check.status]}
                  </StatusBadge>
                </div>
                <CardTitle className="pt-3">{meta.label}</CardTitle>
                <p className="text-sm leading-6 text-muted-foreground">
                  {meta.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-4 pt-1">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    检查结果
                  </p>
                  <p className="mt-1 text-sm leading-6">{check.message}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    配置状态
                  </p>
                  <p className="mt-1 text-sm leading-6">
                    {dependencyConfigured(check.name) ? "已启用相关配置" : "未启用相关配置"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-card/70 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    建议动作
                  </p>
                  <p className="mt-1 text-sm leading-6">{actionHint(check)}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader className="border-b border-border/80">
            <CardTitle>运行策略</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              这些开关决定健康检查对缺失依赖的容忍度。
            </p>
          </CardHeader>
          <CardContent className="divide-y divide-border/70 pt-1">
            {[
              {
                label: "事件持久化保护",
                value: requiresEventPersistence() ? "已强制" : "未强制",
                tone: requiresEventPersistence() ? "success" : "warning",
              },
              {
                label: "Node 运行环境",
                value: process.env.NODE_ENV ?? "未设置",
                tone: process.env.NODE_ENV === "production" ? "success" : "neutral",
              },
              {
                label: "健康接口状态码",
                value: health.status === "ok" ? "200" : "503",
                tone: health.status === "ok" ? "success" : "danger",
              },
            ].map((item) => (
              <div
                className="flex items-center justify-between gap-4 py-3"
                key={item.label}
              >
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <StatusBadge tone={item.tone as StatusBadgeTone}>
                  {item.value}
                </StatusBadge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border/80">
            <CardTitle>排查顺序</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pt-1 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "先看故障项",
                detail: "红色检查项会让健康接口返回 503，优先恢复连接或配置。",
              },
              {
                step: "02",
                title: "再查写入链路",
                detail: "事件持久化保护失败时，不要继续做生产上报验收。",
              },
              {
                step: "03",
                title: "最后验业务页",
                detail: "依赖恢复后再确认项目、分析和报告页是否读到真实数据。",
              },
            ].map((item) => (
              <div
                className="rounded-lg border border-border/70 bg-background/70 p-3"
                key={item.step}
              >
                <div className="mb-3 flex size-8 items-center justify-center rounded-md bg-primary/20 text-sm font-bold">
                  {item.step}
                </div>
                <p className="font-semibold">{item.title}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <a href="/projects">
            检查项目配置
            <ArrowRight aria-hidden="true" />
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href="/analytics">
            查看真实数据
            <Activity aria-hidden="true" />
          </a>
        </Button>
      </div>
    </AppShell>
  );
}
