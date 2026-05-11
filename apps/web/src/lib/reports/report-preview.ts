import {
  type AnalyticsData,
  type AnalyticsFilterInput,
  type AnalyticsFilters,
  type ClickHouseAnalyticsClient,
  createClickHouseAnalyticsClientFromEnv,
  normalizeAnalyticsFilters,
} from "@/lib/analytics/clickhouse-analytics";
import {
  analyticsFunnelSteps,
  analyticsTrendItems,
  type AnalyticsFunnelStep,
  type AnalyticsTrendItem,
  type StatusCard,
} from "@/lib/trackinghub/sample-data";
import {
  allowsSampleData,
  type RuntimeEnv,
} from "@/lib/runtime/sample-data-policy";

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
  metrics: StatusCard[];
  trendItems: AnalyticsTrendItem[];
  funnelSteps: AnalyticsFunnelStep[];
  funnelDropoff: ReportFunnelDropoff | null;
};

type ReportPreviewOptions = {
  filters?: AnalyticsFilterInput;
  client?: ClickHouseAnalyticsClient | null;
  env?: RuntimeEnv;
};

const fallbackReportAnalytics: AnalyticsData = {
  source: "sample",
  metrics: [
    {
      label: "事件量",
      value: "2.7m",
      detail: "示例报告模板：最近 7 天核心事件",
      tone: "blue",
    },
    {
      label: "活跃用户",
      value: "18.4k",
      detail: "示例报告模板：最近 7 天去重用户",
      tone: "green",
    },
    {
      label: "异常占比",
      value: "3.4%",
      detail: "示例报告模板：Schema 与流量异常占比",
      tone: "red",
    },
  ],
  trendItems: analyticsTrendItems,
  funnelSteps: analyticsFunnelSteps,
};

const unavailableReportAnalytics: AnalyticsData = {
  source: "unavailable",
  metrics: [],
  trendItems: [],
  funnelSteps: [],
};

function rangeLabel(filters: AnalyticsFilters) {
  return filters.range === "30d" ? "最近 30 天" : "最近 7 天";
}

function pickReportMetrics(metrics: StatusCard[]): StatusCard[] {
  const targetLabels = ["事件量", "活跃用户", "异常占比"];

  return targetLabels.flatMap((label) => {
    const metric = metrics.find((item) => item.label === label);
    return metric ? [metric] : [];
  });
}

function parsePercent(value: string) {
  const normalized = value.trim().replace("%", "");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatDropoff(value: number) {
  return value === 0 ? "0%" : `${value.toFixed(1)}%`;
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

function buildReportPreviewData(
  analytics: AnalyticsData,
  filters: AnalyticsFilters,
): ReportPreviewData {
  const trendItems = analytics.trendItems.slice(0, 5);

  return {
    source: analytics.source,
    rangeLabel: rangeLabel(filters),
    filters,
    metrics: pickReportMetrics(analytics.metrics),
    trendItems,
    funnelSteps: analytics.funnelSteps,
    funnelDropoff: calculateFunnelDropoff(analytics.funnelSteps),
  };
}

export async function loadReportPreviewData({
  filters: inputFilters,
  client,
  env,
}: ReportPreviewOptions = {}): Promise<ReportPreviewData> {
  const filters = normalizeAnalyticsFilters(inputFilters);
  const analyticsClient = client ?? createClickHouseAnalyticsClientFromEnv();
  const sampleDataAllowed = allowsSampleData(env);

  if (!analyticsClient) {
    return buildReportPreviewData(
      sampleDataAllowed ? fallbackReportAnalytics : unavailableReportAnalytics,
      filters,
    );
  }

  try {
    const analytics = await analyticsClient.loadAnalytics(filters);
    return buildReportPreviewData(analytics, filters);
  } catch {
    return buildReportPreviewData(
      sampleDataAllowed ? fallbackReportAnalytics : unavailableReportAnalytics,
      filters,
    );
  }
}
