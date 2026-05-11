"use client";

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
import {
  DAILY_REPORT_DRAFT_ACTION,
  buildDailyReportDraftHref,
  buildDailyReportSavePayload,
  generateDailyReportDraft,
  type DailyReportDraft,
} from "@/lib/reports/report-draft";
import type { ReportPreviewData } from "@/lib/reports/report-preview";
import type {
  AnalyticsProjectOption,
} from "@/lib/trackinghub/types";
import {
  Activity,
  FileText,
  RotateCcw,
  Search,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";

import { MetricCard } from "./metric-card";
import { ReportsFunnelChart, ReportsTrendChart } from "./reports-charts";
import { SaveReportButton } from "./save-report-button";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type ReportPreviewApiPayload = {
  ok?: boolean;
  data?: {
    dailyDraft?: DailyReportDraft | null;
    preview?: ReportPreviewData | null;
  };
};

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

function insightToneClass(tone: string) {
  if (tone === "danger") {
    return "border-destructive/25 bg-destructive/5";
  }

  if (tone === "warning") {
    return "border-amber-500/25 bg-amber-500/10";
  }

  if (tone === "success") {
    return "border-emerald-600/25 bg-emerald-600/10";
  }

  return "border-border bg-muted/25";
}

function projectScopeLabel(
  projectId: string | undefined,
  projectOptions: AnalyticsProjectOption[],
) {
  if (!projectId) {
    return "全部项目";
  }

  const project = projectOptions.find((item) => item.id === projectId);

  return project ? `${project.name}（${project.slug}）` : projectId;
}

function buildReportParams(filters: ReportPreviewData["filters"]) {
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

function buildReportHref(
  preview: ReportPreviewData,
  dailyDraft: DailyReportDraft | null,
) {
  if (dailyDraft) {
    return buildDailyReportDraftHref(preview);
  }

  const params = buildReportParams(preview.filters);
  const query = params.toString();

  return query ? `/reports?${query}` : "/reports";
}

function paramsFromForm(form: HTMLFormElement) {
  const params = new URLSearchParams();
  const formData = new FormData(form);

  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();

    if (trimmed) {
      params.set(
        key,
        key === "funnel_steps"
          ? trimmed
              .split(",")
              .map((step) => step.trim())
              .filter(Boolean)
              .join(",")
          : trimmed,
      );
    }
  }

  return params;
}

export function ReportsWorkbench({
  dailyDraft: initialDailyDraft,
  preview: initialPreview,
  projectOptions = [],
}: {
  dailyDraft?: DailyReportDraft | null;
  preview: ReportPreviewData;
  projectOptions?: AnalyticsProjectOption[];
}) {
  const [preview, setPreview] = useState(initialPreview);
  const [dailyDraft, setDailyDraft] = useState<DailyReportDraft | null>(
    initialDailyDraft ?? null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const sourceLabel =
    preview.source === "clickhouse"
      ? "已连接真实 ClickHouse 数据"
      : "真实数据源不可用";
  const dailyReportSavePayload = dailyDraft
    ? buildDailyReportSavePayload(preview, dailyDraft)
    : null;
  const dataHealthBadgeVariant =
    preview.dataHealth.tone === "danger" ? "destructive" : "outline";
  const currentProjectLabel = projectScopeLabel(
    preview.filters.projectId,
    projectOptions,
  );
  const funnelStepsValue = preview.filters.funnelSteps.join(", ");

  async function refreshReportPreview(
    params: URLSearchParams,
    options: { keepDailyDraft?: boolean } = {},
  ) {
    setIsLoading(true);
    setRefreshError(null);

    if (options.keepDailyDraft) {
      params.set("report_action", DAILY_REPORT_DRAFT_ACTION);
    } else {
      params.delete("report_action");
    }

    try {
      const response = await fetch(`/api/reports/preview?${params.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json()) as ReportPreviewApiPayload;
      const nextPreview = payload.data?.preview;

      if (!response.ok || !payload.ok || !nextPreview) {
        throw new Error("report preview refresh failed");
      }

      const nextDailyDraft = payload.data?.dailyDraft ?? null;
      setPreview(nextPreview);
      setDailyDraft(nextDailyDraft);
      window.history.pushState(
        null,
        "",
        buildReportHref(nextPreview, nextDailyDraft),
      );
    } catch {
      setRefreshError("局部刷新失败，请确认已登录且报告数据源可用。");
    } finally {
      setIsLoading(false);
    }
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    void refreshReportPreview(paramsFromForm(event.currentTarget), {
      keepDailyDraft: dailyDraft !== null,
    });
  }

  function handleFunnelSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    void refreshReportPreview(paramsFromForm(event.currentTarget), {
      keepDailyDraft: dailyDraft !== null,
    });
  }

  function handleReset() {
    const params = new URLSearchParams();

    if (preview.filters.projectId) {
      params.set("project_id", preview.filters.projectId);
    }

    params.set("range", "7d");
    params.set("granularity", "day");

    void refreshReportPreview(params);
  }

  function handleGenerateDailyDraft() {
    if (preview.source === "unavailable") {
      return;
    }

    const nextDailyDraft = generateDailyReportDraft(preview);
    setDailyDraft(nextDailyDraft);
    window.history.pushState(null, "", buildDailyReportDraftHref(preview));
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-background">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-4 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="size-4 text-primary" aria-hidden="true" />
              <h2 className="text-xl font-semibold tracking-normal">
                运营日报工作台
              </h2>
              <Badge variant={dataHealthBadgeVariant}>
                {preview.dataHealth.label}
              </Badge>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {preview.dataHealth.detail}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                preview.source === "clickhouse"
                  ? "default"
                  : "destructive"
              }
            >
              {sourceLabel}
            </Badge>
            {preview.source !== "unavailable" ? (
              <Button onClick={handleGenerateDailyDraft} size="sm" type="button">
                生成日报草稿
              </Button>
            ) : null}
          </div>
        </div>
        <div className="grid gap-3 px-4 py-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              数据可信度
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {preview.dataHealth.detail}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="size-4 text-primary" aria-hidden="true" />
              报告周期
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {preview.rangeLabel}，{preview.filters.granularity === "hour" ? "按小时" : "按天"}聚合。
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="size-4 text-primary" aria-hidden="true" />
              报告范围
            </div>
            <p className="mt-2 break-all text-sm leading-6 text-muted-foreground">
              {currentProjectLabel} /{" "}
              {preview.filters.environment ?? "全部环境"} /{" "}
              {preview.filters.source ?? "全部平台"}
            </p>
          </div>
        </div>
      </section>

      <form
        className="rounded-lg border border-border bg-background px-4 py-4"
        id="reports-filter-form"
        key={`filters-${buildReportParams(preview.filters).toString()}`}
        onSubmit={handleFilterSubmit}
      >
        {preview.filters.projectId ? (
          <input
            name="project_id"
            type="hidden"
            value={preview.filters.projectId}
          />
        ) : null}
        {funnelStepsValue ? (
          <input name="funnel_steps" type="hidden" value={funnelStepsValue} />
        ) : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <FilterField label="环境">
            <select
              className={selectClassName}
              defaultValue={preview.filters.environment ?? ""}
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
              defaultValue={preview.filters.source ?? ""}
              name="source"
            >
              <option value="">全部平台</option>
              <option value="web">Web</option>
              <option value="flutter">Flutter</option>
            </select>
          </FilterField>
          <FilterField label="事件名">
            <Input
              defaultValue={preview.filters.eventName ?? ""}
              name="event_name"
              placeholder="event_name"
            />
          </FilterField>
          <FilterField label="时间范围">
            <select
              className={selectClassName}
              defaultValue={preview.filters.range}
              name="range"
            >
              <option value="7d">最近 7 天</option>
              <option value="30d">最近 30 天</option>
            </select>
          </FilterField>
          <FilterField label="粒度">
            <select
              className={selectClassName}
              defaultValue={preview.filters.granularity}
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
        {refreshError ? (
          <p className="mt-3 text-sm text-destructive">{refreshError}</p>
        ) : null}
      </form>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">执行摘要</CardTitle>
            <CardDescription>
              面向运营、产品和管理层的可读结论。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm leading-6">
              {preview.executiveSummary.map((item, index) => (
                <li className="flex gap-3" key={item}>
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <div className="grid gap-3 md:grid-cols-3">
          {preview.insightCards.length > 0 ? (
            preview.insightCards.map((insight) => (
              <div
                className={`rounded-lg border p-4 ${insightToneClass(insight.tone)}`}
                key={insight.title}
              >
                <div className="text-sm font-semibold">{insight.title}</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {insight.detail}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground md:col-span-3">
              当前没有足够真实数据形成报告洞察。
            </div>
          )}
        </div>
      </section>

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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">趋势分析</CardTitle>
            <CardDescription>事件量与唯一用户的时间序列。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {preview.trendChartItems.length > 0 ? (
              <ReportsTrendChart items={preview.trendChartItems} />
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                当前筛选范围暂无趋势数据。
              </div>
            )}
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
              null
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">转化漏斗</CardTitle>
            <CardDescription>按业务路径定位关键步骤间的规模变化。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="rounded-lg border border-border bg-muted/20 p-3"
              key={`funnel-${buildReportParams(preview.filters).toString()}`}
              onSubmit={handleFunnelSubmit}
            >
              {preview.filters.projectId ? (
                <input
                  name="project_id"
                  type="hidden"
                  value={preview.filters.projectId}
                />
              ) : null}
              {preview.filters.environment ? (
                <input
                  name="environment"
                  type="hidden"
                  value={preview.filters.environment}
                />
              ) : null}
              {preview.filters.source ? (
                <input
                  name="source"
                  type="hidden"
                  value={preview.filters.source}
                />
              ) : null}
              {preview.filters.eventName ? (
                <input
                  name="event_name"
                  type="hidden"
                  value={preview.filters.eventName}
                />
              ) : null}
              <input name="range" type="hidden" value={preview.filters.range} />
              <input
                name="granularity"
                type="hidden"
                value={preview.filters.granularity}
              />
              <div className="grid gap-2">
                <FilterField label="分析路径">
                  <Input
                    defaultValue={funnelStepsValue}
                    name="funnel_steps"
                    placeholder="product_detail_view, pay_button_click, checkout_submit"
                  />
                </FilterField>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    用逗号连接用户转化路径，报告会据此计算漏斗和最大掉点。
                  </span>
                  <Button
                    disabled={isLoading}
                    size="sm"
                    type="submit"
                    variant="outline"
                  >
                    {isLoading ? "更新中" : "更新路径"}
                  </Button>
                </div>
              </div>
            </form>
            {preview.funnelSteps.length > 0 ? (
              <ReportsFunnelChart steps={preview.funnelSteps} />
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                当前筛选范围暂无漏斗数据。
              </div>
            )}
            {preview.funnelDropoff ? (
              <div className="rounded-lg bg-muted/40 p-3 text-sm">
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
            {preview.funnelSteps.length > 0 ? (
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
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl tracking-normal">留存观察</CardTitle>
          <CardDescription>{preview.retentionSummary}</CardDescription>
        </CardHeader>
        <CardContent>
          {preview.retentionItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>同期群</TableHead>
                  <TableHead>天数</TableHead>
                  <TableHead>样本</TableHead>
                  <TableHead>留存用户</TableHead>
                  <TableHead>留存率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.retentionItems.slice(0, 8).map((item) => (
                  <TableRow key={`${item.cohort}-${item.day}`}>
                    <TableCell className="font-mono text-xs">
                      {item.cohort}
                    </TableCell>
                    <TableCell>Day {item.day}</TableCell>
                    <TableCell>{item.cohortUsers}</TableCell>
                    <TableCell>{item.retainedUsers}</TableCell>
                    <TableCell>{item.retention}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              当前筛选范围暂无留存数据。
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
