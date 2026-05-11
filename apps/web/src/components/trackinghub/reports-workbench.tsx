import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildDailyReportSavePayload,
  type DailyReportDraft,
} from "@/lib/reports/report-draft";
import type { ReportPreviewData } from "@/lib/reports/report-preview";
import type {
  ReportTaskItem,
  ReportTemplateItem,
} from "@/lib/trackinghub/sample-data";

import { MetricCard } from "./metric-card";
import { SaveReportButton } from "./save-report-button";
import { StatusBadge } from "./status-badge";

function taskTone(status: string) {
  if (status === "已排队") {
    return "success" as const;
  }

  if (status === "待确认") {
    return "warning" as const;
  }

  return "danger" as const;
}

export function ReportsWorkbench({
  dailyDraft,
  dailyDraftHref,
  preview,
  templates,
  tasks,
}: {
  dailyDraft?: DailyReportDraft | null;
  dailyDraftHref: string;
  preview: ReportPreviewData;
  templates: ReportTemplateItem[];
  tasks: ReportTaskItem[];
}) {
  const sourceLabel =
    preview.source === "clickhouse"
      ? "已连接真实 ClickHouse 数据"
      : preview.source === "sample"
        ? "当前显示占位报告数据"
        : "真实数据源不可用";
  const sourceDescription =
    preview.source === "unavailable"
      ? "当前环境未读取到真实数据，请配置 ClickHouse 后再生成报告。"
      : "复用分析查询结果，作为日报、异常解释和漏斗掉点解释的输入数据。";
  const filterLabels = [
    preview.filters.projectId ? `项目 ${preview.filters.projectId}` : "全部项目",
    preview.filters.environment ? `环境 ${preview.filters.environment}` : "全部环境",
    preview.filters.source ? `平台 ${preview.filters.source}` : "全部平台",
    preview.filters.eventName ? `事件 ${preview.filters.eventName}` : "全部事件",
    preview.rangeLabel,
  ];
  const dailyReportSavePayload = dailyDraft
    ? buildDailyReportSavePayload(preview, dailyDraft)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div>
          <div className="text-xl font-semibold tracking-normal">日报数据预览</div>
          <p className="mt-1 text-sm text-muted-foreground">
            {sourceDescription}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={
              preview.source === "clickhouse"
                ? "default"
                : preview.source === "unavailable"
                  ? "destructive"
                  : "outline"
            }
          >
            {sourceLabel}
          </Badge>
          {preview.source !== "unavailable" ? (
            <Button asChild size="sm">
              <a href={dailyDraftHref}>生成日报草稿</a>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filterLabels.map((label) => (
          <span
            className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
            key={label}
          >
            {label}
          </span>
        ))}
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {preview.metrics.length > 0 ? (
          preview.metrics.map((metric) => (
            <MetricCard
              detail={metric.detail}
              key={metric.label}
              label={metric.label}
              tone={metric.tone}
              value={metric.value}
            />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground md:col-span-3">
            暂不能生成日报指标。
          </div>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">趋势 Top 事件</CardTitle>
            <CardDescription>
              按当前范围截取最高优先级趋势记录。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {preview.trendItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>事件</TableHead>
                    <TableHead>事件量</TableHead>
                    <TableHead>唯一用户</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.trendItems.map((item) => (
                    <TableRow
                      key={`${item.bucket}-${item.eventName}-${item.environment}-${item.source}`}
                    >
                      <TableCell className="font-mono text-xs">
                        {item.bucket}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.eventName}
                      </TableCell>
                      <TableCell>{item.eventCount}</TableCell>
                      <TableCell>{item.uniqueUsers}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                当前筛选范围暂无趋势数据。
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">漏斗掉点</CardTitle>
            <CardDescription>
              先定位最大步骤流失，后续用于生成解释。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {preview.funnelDropoff ? (
              <div className="mb-4 rounded-lg bg-muted/40 p-3 text-sm">
                <div className="font-medium">
                  Step {preview.funnelDropoff.fromStep} 到 Step{" "}
                  {preview.funnelDropoff.toStep}
                </div>
                <div className="mt-1 break-all font-mono text-xs text-muted-foreground">
                  {preview.funnelDropoff.fromEventName}{" "}
                  {"->"}{" "}
                  {preview.funnelDropoff.toEventName}
                </div>
                <div className="mt-2 text-muted-foreground">
                  掉点 {preview.funnelDropoff.dropoff}，当前转化{" "}
                  {preview.funnelDropoff.conversion}
                </div>
              </div>
            ) : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>步骤</TableHead>
                  <TableHead>事件</TableHead>
                  <TableHead>转化率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.funnelSteps.map((step) => (
                  <TableRow key={step.step}>
                    <TableCell>{step.step}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {step.eventName}
                    </TableCell>
                    <TableCell>{step.conversion}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {dailyDraft ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">日报草稿</CardTitle>
            <CardDescription>{dailyDraft.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-6 text-foreground">
              {dailyDraft.summary}
            </p>
            {dailyReportSavePayload ? (
              <SaveReportButton payload={dailyReportSavePayload} />
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                保存日报需要先在筛选条件中指定项目 ID。
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-3">
              <section className="space-y-2">
                <div className="text-sm font-semibold">指标摘要</div>
                <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                  {dailyDraft.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              </section>
              <section className="space-y-2">
                <div className="text-sm font-semibold">解释草稿</div>
                <div className="space-y-2 text-sm leading-6 text-muted-foreground">
                  <p>{dailyDraft.trendExplanation}</p>
                  <p>{dailyDraft.funnelExplanation}</p>
                </div>
              </section>
              <section className="space-y-2">
                <div className="text-sm font-semibold">建议下一步</div>
                <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                  {dailyDraft.nextActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </section>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">报告模板</CardTitle>
            <CardDescription>
              报告围绕结构化查询结果生成，不进入热路径，不影响事件接收。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {templates.map((template) => (
              <div
                className="rounded-lg border border-border bg-background p-4"
                key={template.type}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold">{template.type}</div>
                  <span className="text-xs text-muted-foreground">
                    {template.cadence}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {template.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {template.inputs.map((input) => (
                    <span
                      className="rounded-md bg-muted px-2 py-1 font-mono text-xs"
                      key={input}
                    >
                      {input}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">Codex 任务队列</CardTitle>
            <CardDescription>
              管理日报、异常解释和漏斗掉点解释的生成状态。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.map((task) => (
              <div
                className="rounded-lg border border-border bg-background p-4"
                key={task.title}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{task.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {task.owner} · {task.schedule}
                    </div>
                  </div>
                  <StatusBadge tone={taskTone(task.status)}>
                    {task.status}
                  </StatusBadge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
