import type { AnalyticsFilterInput } from "@/lib/analytics/clickhouse-analytics";

import type { ReportPreviewData } from "./report-preview";

export const DAILY_REPORT_DRAFT_ACTION = "daily_draft";

export type DailyReportDraft = {
  title: string;
  summary: string;
  highlights: string[];
  trendExplanation: string;
  funnelExplanation: string;
  nextActions: string[];
};

export type DailyReportSavePayload = {
  projectId: string;
  type: "daily";
  title: string;
  content: string;
  sourceQueryRefs: Array<{
    dataSource: ReportPreviewData["source"];
    range: string;
    granularity: string;
    environment: string | undefined;
    source: string | undefined;
    eventName: string | undefined;
    funnelSteps: string[];
  }>;
};

function metricText(preview: ReportPreviewData, label: string) {
  const metric = preview.metrics.find((item) => item.label === label);

  return metric ? `${metric.label} ${metric.value}` : `${label}暂无数据`;
}

function metricHighlights(preview: ReportPreviewData) {
  return preview.metrics.map(
    (metric) => `${metric.label}：${metric.value}（${metric.detail}）`,
  );
}

function scopeTitle(preview: ReportPreviewData) {
  const project = preview.filters.projectId ?? "全部项目";
  const environment = preview.filters.environment ?? "全部环境";
  const source = preview.filters.source ?? "全部平台";

  return `${project} / ${environment} / ${source} 日报草稿`;
}

function trendExplanation(preview: ReportPreviewData) {
  const topTrend = preview.trendItems[0];

  if (!topTrend) {
    return "趋势重点：当前筛选范围暂无趋势数据，草稿生成前需要先确认是否存在上报缺口。";
  }

  return [
    `趋势重点：${topTrend.bucket} 的 ${topTrend.eventName} 事件量 ${topTrend.eventCount}`,
    `唯一用户 ${topTrend.uniqueUsers}`,
    "是本次草稿优先解释的变化入口。",
  ].join("，");
}

function funnelExplanation(preview: ReportPreviewData) {
  if (!preview.funnelDropoff) {
    return "漏斗掉点：当前漏斗步骤不足，暂不能定位最大流失步骤。";
  }

  const dropoff = preview.funnelDropoff;

  return `漏斗掉点：Step ${dropoff.fromStep} ${dropoff.fromEventName} 到 Step ${dropoff.toStep} ${dropoff.toEventName} 掉点 ${dropoff.dropoff}，当前转化 ${dropoff.conversion}，建议优先拆解页面入口、渠道、版本和关键属性。`;
}

export function generateDailyReportDraft(
  preview: ReportPreviewData,
): DailyReportDraft {
  const topTrend = preview.trendItems[0];
  const dropoff = preview.funnelDropoff;

  return {
    title: scopeTitle(preview),
    summary: `${preview.rangeLabel}内，${metricText(preview, "事件量")}，${metricText(
      preview,
      "活跃用户",
    )}，${metricText(preview, "异常占比")}。`,
    highlights: metricHighlights(preview),
    trendExplanation: trendExplanation(preview),
    funnelExplanation: funnelExplanation(preview),
    nextActions: [
      "复核异常样本，确认是否由 Schema、版本或渠道流量变化导致。",
      `围绕 ${topTrend?.eventName ?? "核心事件"} 补充渠道、版本、页面来源维度拆解。`,
      `针对 ${
        dropoff
          ? `${dropoff.fromEventName} -> ${dropoff.toEventName}`
          : "当前漏斗"
      } 最大掉点补充漏斗解释。`,
    ],
  };
}

export function buildDailyReportDraftHref(preview: ReportPreviewData) {
  const params = new URLSearchParams();

  if (preview.filters.projectId) {
    params.set("project_id", preview.filters.projectId);
  }

  if (preview.filters.environment) {
    params.set("environment", preview.filters.environment);
  }

  if (preview.filters.source) {
    params.set("source", preview.filters.source);
  }

  if (preview.filters.eventName) {
    params.set("event_name", preview.filters.eventName);
  }

  if (preview.filters.funnelSteps.length > 0) {
    params.set("funnel_steps", preview.filters.funnelSteps.join(","));
  }
  params.set("range", preview.filters.range);
  params.set("granularity", preview.filters.granularity);
  params.set("report_action", DAILY_REPORT_DRAFT_ACTION);

  return `/reports?${params.toString()}`;
}

export function shouldGenerateDailyReportDraft(input: AnalyticsFilterInput = {}) {
  const action = input.report_action;
  const value = Array.isArray(action) ? action[0] : action;

  return value === DAILY_REPORT_DRAFT_ACTION;
}

function formatDailyReportContent(draft: DailyReportDraft) {
  return [
    draft.summary,
    "",
    "指标摘要：",
    ...draft.highlights.map((highlight) => `- ${highlight}`),
    "",
    "解释草稿：",
    draft.trendExplanation,
    draft.funnelExplanation,
    "",
    "建议下一步：",
    ...draft.nextActions.map((action) => `- ${action}`),
  ].join("\n");
}

export function buildDailyReportSavePayload(
  preview: ReportPreviewData,
  draft: DailyReportDraft,
): DailyReportSavePayload | null {
  if (!preview.filters.projectId) {
    return null;
  }

  return {
    projectId: preview.filters.projectId,
    type: "daily",
    title: draft.title,
    content: formatDailyReportContent(draft),
    sourceQueryRefs: [
      {
        dataSource: preview.source,
        range: preview.filters.range,
        granularity: preview.filters.granularity,
        environment: preview.filters.environment,
        source: preview.filters.source,
        eventName: preview.filters.eventName,
        funnelSteps: [...preview.filters.funnelSteps],
      },
    ],
  };
}
