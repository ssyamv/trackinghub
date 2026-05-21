import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LogsData, LogsFilters } from "@/lib/logs/clickhouse-logs";
import { cn } from "@/lib/utils";
import { AlertTriangle, Search } from "lucide-react";
import type { ReactNode } from "react";

import { MetricCard } from "./metric-card";

const selectClassName =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-medium text-foreground">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function levelClassName(level: string) {
  if (level === "fatal" || level === "error") {
    return "bg-destructive/10 text-destructive";
  }

  if (level === "warn") {
    return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300";
  }

  return "bg-secondary text-secondary-foreground";
}

function buildDefaultValue(value: string | undefined) {
  return value ?? "";
}

export function LogsWorkbench({ logs }: { logs: LogsData }) {
  const filters: LogsFilters = logs.filters;

  return (
    <div className="grid gap-6">
      <form
        action="/logs"
        className="grid gap-3 rounded-lg border border-border bg-card p-4 lg:grid-cols-[repeat(6,minmax(0,1fr))_auto]"
        method="get"
      >
        <FilterField label="项目 ID">
          <Input
            defaultValue={buildDefaultValue(filters.projectId)}
            name="project_id"
            placeholder="project_x"
          />
        </FilterField>
        <FilterField label="环境">
          <select
            className={selectClassName}
            defaultValue={buildDefaultValue(filters.environment)}
            name="environment"
          >
            <option value="">全部</option>
            <option value="test">test</option>
            <option value="develop">develop</option>
            <option value="production">production</option>
            <option value="dev">dev</option>
            <option value="staging">staging</option>
            <option value="prod">prod</option>
          </select>
        </FilterField>
        <FilterField label="来源">
          <select
            className={selectClassName}
            defaultValue={buildDefaultValue(filters.source)}
            name="source"
          >
            <option value="">全部</option>
            <option value="web">Web</option>
            <option value="flutter">Flutter</option>
          </select>
        </FilterField>
        <FilterField label="级别">
          <select
            className={selectClassName}
            defaultValue={buildDefaultValue(filters.level)}
            name="level"
          >
            <option value="">全部</option>
            <option value="debug">debug</option>
            <option value="info">info</option>
            <option value="warn">warn</option>
            <option value="error">error</option>
            <option value="fatal">fatal</option>
          </select>
        </FilterField>
        <FilterField label="时间范围">
          <select className={selectClassName} defaultValue={filters.range} name="range">
            <option value="7d">最近 7 天</option>
            <option value="30d">最近 30 天</option>
          </select>
        </FilterField>
        <FilterField label="搜索">
          <Input
            defaultValue={buildDefaultValue(filters.q)}
            name="q"
            placeholder="message / logger / trace"
          />
        </FilterField>
        <button
          className="inline-flex h-9 items-center justify-center gap-2 self-end rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          type="submit"
        >
          <Search className="h-4 w-4" />
          查询
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {logs.metrics.length > 0 ? (
          logs.metrics.map((metric) => (
            <MetricCard
              detail={metric.detail}
              key={metric.label}
              label={metric.label}
              tone={metric.tone}
              value={metric.value}
            />
          ))
        ) : (
          <Card className="md:col-span-2 xl:col-span-4">
            <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              日志数据源暂不可用，配置 ClickHouse 后会显示真实日志。
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">级别分布</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {logs.levelCounts.length > 0 ? (
              logs.levelCounts.map((item) => (
                <div
                  className="flex items-center justify-between gap-3 text-sm"
                  key={item.level}
                >
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 font-semibold",
                      levelClassName(item.level),
                    )}
                  >
                    {item.level}
                  </span>
                  <span className="text-muted-foreground">
                    {item.count} 条 / {item.share}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">暂无级别分布。</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">最近日志</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>级别</TableHead>
                  <TableHead>消息</TableHead>
                  <TableHead>定位</TableHead>
                  <TableHead>异常</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.items.map((item) => (
                  <TableRow key={item.logId}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {item.timestamp}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "rounded-md px-2 py-1 text-xs font-semibold",
                          levelClassName(item.level),
                        )}
                      >
                        {item.level}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-[240px]">
                      <div className="font-medium text-foreground">{item.message}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.logger} / {item.source} / {item.environment}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[180px] text-xs text-muted-foreground">
                      <div>用户：{item.identity}</div>
                      <div>版本：{item.appVersion}</div>
                      <div>Trace：{item.traceId}</div>
                    </TableCell>
                    <TableCell className="min-w-[220px] text-xs text-muted-foreground">
                      {item.errorSummary}
                    </TableCell>
                  </TableRow>
                ))}
                {logs.items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="py-8 text-center text-sm text-muted-foreground"
                      colSpan={5}
                    >
                      当前筛选范围暂无日志。
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
