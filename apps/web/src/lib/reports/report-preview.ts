import {
  type AnalyticsData,
  type AnalyticsFilterInput,
  type AnalyticsFilters,
  type ClickHouseAnalyticsClient,
  analyticsRangeLabel,
  createClickHouseAnalyticsClientFromEnv,
  normalizeAnalyticsFilters,
} from "@/lib/analytics/clickhouse-analytics";
import {
  type AnalyticsFunnelStep,
  type AnalyticsRetentionItem,
  type AnalyticsTrendItem,
  type StatusCard,
} from "@/lib/trackinghub/types";

export type ReportInsightTone = "neutral" | "success" | "warning" | "danger";

export type ReportDataHealth = {
  label: string;
  detail: string;
  tone: Exclude<ReportInsightTone, "neutral">;
};

export type ReportInsightCard = {
  title: string;
  detail: string;
  tone: ReportInsightTone;
};

export type ReportFunnelDropoff = {
  fromStep: string;
  fromEventName: string;
  toStep: string;
  toEventName: string;
  dropoff: string;
  conversion: string;
};

export type ReportPreviewData = {
  source: AnalyticsData["source"];
  rangeLabel: string;
  filters: AnalyticsFilters;
  dataHealth: ReportDataHealth;
  executiveSummary: string[];
  insightCards: ReportInsightCard[];
  metrics: StatusCard[];
  trendChartItems: AnalyticsTrendItem[];
  trendItems: AnalyticsTrendItem[];
  funnelSteps: AnalyticsFunnelStep[];
  funnelDropoff: ReportFunnelDropoff | null;
  retentionItems: AnalyticsRetentionItem[];
  retentionSummary: string;
};

type ReportPreviewOptions = {
  filters?: AnalyticsFilterInput;
  client?: ClickHouseAnalyticsClient | null;
  env?: Record<string, string | undefined>;
};

const unavailableReportAnalytics: AnalyticsData = {
  source: "unavailable",
  metrics: [],
  trendItems: [],
  funnelSteps: [],
  retentionItems: [],
  propertyItems: [],
  propertyKeyCount: 0,
  dimensionGroups: [],
};

function pickReportMetrics(metrics: StatusCard[]): StatusCard[] {
  const targetLabels = ["事件量", "活跃用户", "异常占比"];

  return targetLabels.flatMap((label) => {
    const metric = metrics.find((item) => item.label === label);
    return metric ? [metric] : [];
  });
}

function metricValue(metrics: StatusCard[], label: string) {
  return metrics.find((item) => item.label === label)?.value ?? "暂无数据";
}

function parsePercent(value: string) {
  const normalized = value.trim().replace("%", "");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function metricPercent(metrics: StatusCard[], label: string) {
  const metric = metrics.find((item) => item.label === label);

  return metric ? parsePercent(metric.value) : undefined;
}

function formatDropoff(value: number) {
  return value === 0 ? "0%" : `${value.toFixed(1)}%`;
}

function buildDataHealth(
  source: AnalyticsData["source"],
  metrics: StatusCard[],
): ReportDataHealth {
  if (source === "unavailable") {
    return {
      label: "真实数据源不可用",
      detail: "当前环境未读取到 ClickHouse 数据，报告不会使用示例数据。",
      tone: "danger",
    };
  }

  const anomalyRate = metricPercent(metrics, "异常占比") ?? 0;

  if (anomalyRate > 0) {
    return {
      label: "数据需复核",
      detail: `异常占比 ${metricValue(metrics, "异常占比")}，建议先确认 Schema、版本或渠道变化。`,
      tone: anomalyRate >= 10 ? "warning" : "success",
    };
  }

  return {
    label: "可用于报告",
    detail: "当前筛选范围已连接真实数据，未发现验证异常。",
    tone: "success",
  };
}

function calculateFunnelDropoff(
  steps: AnalyticsFunnelStep[],
): ReportFunnelDropoff | null {
  if (steps.length < 2) {
    return null;
  }

  let largestDropoff: ReportFunnelDropoff | null = null;
  let largestDropoffValue = -1;

  for (let index = 1; index < steps.length; index += 1) {
    const previous = steps[index - 1];
    const current = steps[index];
    const previousConversion = parsePercent(previous.conversion);
    const currentConversion = parsePercent(current.conversion);

    if (previousConversion === undefined || currentConversion === undefined) {
      continue;
    }

    const dropoff = Math.max(previousConversion - currentConversion, 0);

    if (dropoff > largestDropoffValue) {
      largestDropoffValue = dropoff;
      largestDropoff = {
        fromStep: previous.step,
        fromEventName: previous.eventName,
        toStep: current.step,
        toEventName: current.eventName,
        dropoff: formatDropoff(dropoff),
        conversion: current.conversion,
      };
    }
  }

  return largestDropoff;
}

function retentionSummary(items: AnalyticsRetentionItem[]) {
  const firstComparable = items.find((item) => item.day > 0);

  if (!firstComparable) {
    return "当前范围暂无留存同期群数据，建议确认是否已有跨日活跃样本。";
  }

  return `${firstComparable.cohort} 同期群 Day ${firstComparable.day} 留存 ${firstComparable.retention}，样本 ${firstComparable.cohortUsers} 人。`;
}

function buildExecutiveSummary({
  source,
  metrics,
  rangeLabel,
  trendItems,
  funnelDropoff,
  retentionText,
}: {
  source: AnalyticsData["source"];
  metrics: StatusCard[];
  rangeLabel: string;
  trendItems: AnalyticsTrendItem[];
  funnelDropoff: ReportFunnelDropoff | null;
  retentionText: string;
}) {
  if (source === "unavailable") {
    return ["当前环境未读取到真实分析数据，暂不能生成线上报告。"];
  }

  const topTrend = trendItems[0];
  const summary = [
    `${rangeLabel}内，事件量 ${metricValue(metrics, "事件量")}，活跃用户 ${metricValue(
      metrics,
      "活跃用户",
    )}，异常占比 ${metricValue(metrics, "异常占比")}。`,
  ];

  if (topTrend) {
    summary.push(
      `主要变化入口是 ${topTrend.bucket} 的 ${topTrend.eventName}，事件量 ${topTrend.eventCount}，唯一用户 ${topTrend.uniqueUsers}。`,
    );
  } else {
    summary.push("当前筛选范围暂无事件趋势，建议先确认埋点是否正常上报。");
  }

  if (funnelDropoff) {
    summary.push(
      `最大漏斗掉点出现在 ${funnelDropoff.fromEventName} -> ${funnelDropoff.toEventName}，掉点 ${funnelDropoff.dropoff}，当前转化 ${funnelDropoff.conversion}。`,
    );
  } else {
    summary.push("当前漏斗步骤不足，暂不能定位最大转化掉点。");
  }

  summary.push(retentionText);

  return summary;
}

function buildInsightCards({
  source,
  trendItems,
  funnelDropoff,
  retentionText,
}: {
  source: AnalyticsData["source"];
  trendItems: AnalyticsTrendItem[];
  funnelDropoff: ReportFunnelDropoff | null;
  retentionText: string;
}) {
  if (source === "unavailable") {
    return [];
  }

  const cards: ReportInsightCard[] = [];
  const topTrend = trendItems[0];

  if (topTrend) {
    cards.push({
      title: "趋势入口",
      detail: `${topTrend.bucket} 的 ${topTrend.eventName} 事件量 ${topTrend.eventCount}，唯一用户 ${topTrend.uniqueUsers}。`,
      tone: "neutral",
    });
  }

  cards.push(
    funnelDropoff
      ? {
          title: "最大掉点",
          detail: `${funnelDropoff.fromEventName} -> ${funnelDropoff.toEventName} 掉点 ${funnelDropoff.dropoff}，当前转化 ${funnelDropoff.conversion}。`,
          tone: "warning",
        }
      : {
          title: "最大掉点",
          detail: "当前漏斗步骤不足，暂不能定位最大转化掉点。",
          tone: "neutral",
        },
  );

  cards.push({
    title: "留存观察",
    detail: retentionText,
    tone: retentionText.startsWith("当前范围暂无") ? "warning" : "success",
  });

  return cards;
}

function buildReportPreviewData(
  analytics: AnalyticsData,
  filters: AnalyticsFilters,
): ReportPreviewData {
  const rangeLabel = analyticsRangeLabel(filters);
  const metrics = pickReportMetrics(analytics.metrics);
  const trendItems = analytics.trendItems.slice(0, 8);
  const funnelDropoff = calculateFunnelDropoff(analytics.funnelSteps);
  const retentionText =
    analytics.source === "unavailable"
      ? "暂无留存数据"
      : retentionSummary(analytics.retentionItems);

  return {
    source: analytics.source,
    rangeLabel,
    filters,
    dataHealth: buildDataHealth(analytics.source, metrics),
    executiveSummary: buildExecutiveSummary({
      source: analytics.source,
      metrics,
      rangeLabel,
      trendItems,
      funnelDropoff,
      retentionText,
    }),
    insightCards: buildInsightCards({
      source: analytics.source,
      trendItems,
      funnelDropoff,
      retentionText,
    }),
    metrics,
    trendChartItems: analytics.trendItems,
    trendItems,
    funnelSteps: analytics.funnelSteps,
    funnelDropoff,
    retentionItems: analytics.retentionItems,
    retentionSummary: retentionText,
  };
}

export async function loadReportPreviewData({
  filters: inputFilters,
  client,
}: ReportPreviewOptions = {}): Promise<ReportPreviewData> {
  const filters = normalizeAnalyticsFilters(inputFilters);
  const analyticsClient = client ?? createClickHouseAnalyticsClientFromEnv();

  if (!analyticsClient) {
    return buildReportPreviewData(unavailableReportAnalytics, filters);
  }

  try {
    const analytics = await analyticsClient.loadAnalytics(filters);
    return buildReportPreviewData(analytics, filters);
  } catch {
    return buildReportPreviewData(unavailableReportAnalytics, filters);
  }
}
