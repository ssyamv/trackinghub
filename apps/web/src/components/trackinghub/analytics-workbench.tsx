import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  AnalyticsFunnelStep,
  AnalyticsTemplateItem,
  AnalyticsTrendItem,
  StatusCard,
} from "@/lib/trackinghub/sample-data";
import type { AnalyticsFilters } from "@/lib/analytics/clickhouse-analytics";
import { RotateCcw, Search } from "lucide-react";
import type { ReactNode } from "react";

import { MetricCard } from "./metric-card";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function AnalyticsWorkbench({
  filters,
  metrics,
  templates,
  funnelSteps,
  trendItems,
  source,
}: {
  filters: AnalyticsFilters;
  metrics: StatusCard[];
  templates: AnalyticsTemplateItem[];
  funnelSteps: AnalyticsFunnelStep[];
  trendItems: AnalyticsTrendItem[];
  source: "clickhouse" | "sample" | "unavailable";
}) {
  const sourceLabel =
    source === "clickhouse"
      ? "已连接真实 ClickHouse 数据"
      : source === "sample"
        ? "当前显示示例数据"
        : "真实数据源不可用";
  const sourceDescription =
    source === "unavailable"
      ? "当前环境已禁止示例数据，请配置 ClickHouse 后再查看真实分析。"
      : "优先读取 ClickHouse raw_events；未配置或查询失败时回落示例数据。";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div>
          <div className="text-sm font-semibold">分析数据源</div>
          <p className="mt-1 text-sm text-muted-foreground">
            {sourceDescription}
          </p>
        </div>
        <Badge
          variant={
            source === "clickhouse"
              ? "default"
              : source === "unavailable"
                ? "destructive"
                : "outline"
          }
        >
          {sourceLabel}
        </Badge>
      </div>

      <form
        action="/analytics"
        className="rounded-lg border border-border bg-background px-4 py-4"
        method="get"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <FilterField label="项目 ID">
            <Input
              defaultValue={filters.projectId ?? ""}
              name="project_id"
              placeholder="project_x"
            />
          </FilterField>
          <FilterField label="环境">
            <select
              className={selectClassName}
              defaultValue={filters.environment ?? ""}
              name="environment"
            >
              <option value="">全部环境</option>
              <option value="dev">dev</option>
              <option value="staging">staging</option>
              <option value="prod">prod</option>
            </select>
          </FilterField>
          <FilterField label="平台">
            <select
              className={selectClassName}
              defaultValue={filters.source ?? ""}
              name="source"
            >
              <option value="">全部平台</option>
              <option value="web">Web</option>
              <option value="flutter">Flutter</option>
            </select>
          </FilterField>
          <FilterField label="事件名">
            <Input
              defaultValue={filters.eventName ?? ""}
              name="event_name"
              placeholder="pay_button_click"
            />
          </FilterField>
          <div className="md:col-span-2 xl:col-span-2">
            <FilterField label="漏斗步骤">
              <Input
                defaultValue={filters.funnelSteps.join(", ")}
                name="funnel_steps"
                placeholder="product_detail_view, pay_button_click"
              />
            </FilterField>
          </div>
          <FilterField label="时间范围">
            <select
              className={selectClassName}
              defaultValue={filters.range}
              name="range"
            >
              <option value="7d">最近 7 天</option>
              <option value="30d">最近 30 天</option>
            </select>
          </FilterField>
          <FilterField label="粒度">
            <select
              className={selectClassName}
              defaultValue={filters.granularity}
              name="granularity"
            >
              <option value="day">按天</option>
              <option value="hour">按小时</option>
            </select>
          </FilterField>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="submit">
            <Search data-icon="inline-start" />
            查询
          </Button>
          <Button asChild type="button" variant="outline">
            <a href="/analytics">
              <RotateCcw data-icon="inline-start" />
              重置
            </a>
          </Button>
        </div>
      </form>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.length > 0 ? (
          metrics.map((metric) => (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-xl tracking-normal">事件趋势</CardTitle>
          <CardDescription>
            按当前筛选范围聚合事件量与唯一用户。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trendItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>事件</TableHead>
                  <TableHead>环境</TableHead>
                  <TableHead>平台</TableHead>
                  <TableHead>事件量</TableHead>
                  <TableHead>唯一用户</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trendItems.map((item) => (
                  <TableRow
                    key={`${item.bucket}-${item.eventName}-${item.environment}-${item.source}`}
                  >
                    <TableCell className="font-mono text-xs">
                      {item.bucket}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.eventName}
                    </TableCell>
                    <TableCell>{item.environment}</TableCell>
                    <TableCell>{item.source}</TableCell>
                    <TableCell>{item.eventCount}</TableCell>
                    <TableCell>{item.uniqueUsers}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              当前筛选范围暂无事件趋势数据。
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl tracking-normal">分析模板</CardTitle>
          <CardDescription>
            MVP 优先提供固定模板，覆盖概览、事件趋势、漏斗和留存。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {templates.map((template) => (
              <div
                className="rounded-lg border border-border bg-background p-4"
                key={template.title}
              >
                <div className="text-base font-semibold">{template.title}</div>
                <p className="mt-2 min-h-16 text-sm leading-6 text-muted-foreground">
                  {template.description}
                </p>
                <div className="mt-3 font-mono text-xs text-muted-foreground">
                  {template.metric}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {template.filters.map((filter) => (
                    <span
                      className="rounded-md bg-muted px-2 py-1 text-xs"
                      key={filter}
                    >
                      {filter}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl tracking-normal">漏斗步骤</CardTitle>
          <CardDescription>
            按当前漏斗步骤和筛选范围计算逐步转化。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {funnelSteps.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>步骤</TableHead>
                  <TableHead>事件</TableHead>
                  <TableHead>用户数</TableHead>
                  <TableHead>转化率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funnelSteps.map((step) => (
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
