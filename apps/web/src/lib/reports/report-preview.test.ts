import { describe, expect, it } from "vitest";

import type { AnalyticsData } from "@/lib/analytics/clickhouse-analytics";

import { loadReportPreviewData } from "./report-preview";

const clickHouseAnalytics: AnalyticsData = {
  source: "clickhouse",
  metrics: [
    {
      label: "事件量",
      value: "2.7k",
      detail: "最近 7 天接收事件",
      tone: "blue",
    },
    {
      label: "活跃用户",
      value: "184",
      detail: "最近 7 天去重用户",
      tone: "green",
    },
    {
      label: "最近接收",
      value: "05-10 08:30",
      detail: "raw_events 最新 received_at",
      tone: "purple",
    },
    {
      label: "异常占比",
      value: "15.0%",
      detail: "3 / 20 条验证异常",
      tone: "red",
    },
  ],
  trendItems: [
    {
      bucket: "05-10 00:00",
      eventName: "pay_button_click",
      environment: "prod",
      source: "web",
      eventCount: "120",
      eventCountValue: 120,
      uniqueUsers: "88",
      uniqueUsersValue: 88,
    },
    {
      bucket: "05-09 00:00",
      eventName: "product_detail_view",
      environment: "prod",
      source: "web",
      eventCount: "100",
      eventCountValue: 100,
      uniqueUsers: "72",
      uniqueUsersValue: 72,
    },
  ],
  propertyItems: [],
  propertyKeyCount: 0,
  dimensionGroups: [],
  retentionItems: [],
  funnelSteps: [
    {
      step: "1",
      eventName: "product_detail_view",
      users: "100",
      usersValue: 100,
      conversion: "100%",
      conversionRate: 1,
    },
    {
      step: "2",
      eventName: "pay_button_click",
      users: "80",
      usersValue: 80,
      conversion: "80.0%",
      conversionRate: 0.8,
    },
    {
      step: "3",
      eventName: "checkout_submit",
      users: "45",
      usersValue: 45,
      conversion: "45.0%",
      conversionRate: 0.45,
    },
  ],
};

describe("loadReportPreviewData", () => {
  it("builds a daily report preview from analytics data and normalized filters", async () => {
    const seenFilters: unknown[] = [];

    const preview = await loadReportPreviewData({
      filters: {
        project_id: "magic_frame",
        environment: "prod",
        source: "web",
        funnel_steps: "product_detail_view,pay_button_click,checkout_submit",
      },
      client: {
        async loadAnalytics(filters) {
          seenFilters.push(filters);
          return clickHouseAnalytics;
        },
      },
    });

    expect(seenFilters).toEqual([
      {
        projectId: "magic_frame",
        environment: "prod",
        source: "web",
        eventName: undefined,
        propertyKey: undefined,
        funnelSteps: [
          "product_detail_view",
          "pay_button_click",
          "checkout_submit",
        ],
        granularity: "day",
        range: "7d",
      },
    ]);
    expect(preview.source).toBe("clickhouse");
    expect(preview.rangeLabel).toBe("最近 7 天");
    expect(preview.dataHealth).toEqual({
      label: "数据需复核",
      detail: "异常占比 15.0%，建议先确认 Schema、版本或渠道变化。",
      tone: "warning",
    });
    expect(preview.executiveSummary).toEqual([
      "最近 7 天内，事件量 2.7k，活跃用户 184，异常占比 15.0%。",
      "主要变化入口是 05-10 00:00 的 pay_button_click，事件量 120，唯一用户 88。",
      "最大漏斗掉点出现在 pay_button_click -> checkout_submit，掉点 35.0%，当前转化 45.0%。",
      "当前范围暂无留存同期群数据，建议确认是否已有跨日活跃样本。",
    ]);
    expect(preview.insightCards).toEqual([
      {
        title: "趋势入口",
        detail: "05-10 00:00 的 pay_button_click 事件量 120，唯一用户 88。",
        tone: "neutral",
      },
      {
        title: "最大掉点",
        detail: "pay_button_click -> checkout_submit 掉点 35.0%，当前转化 45.0%。",
        tone: "warning",
      },
      {
        title: "留存观察",
        detail: "当前范围暂无留存同期群数据，建议确认是否已有跨日活跃样本。",
        tone: "warning",
      },
    ]);
    expect(preview.trendChartItems).toHaveLength(2);
    expect(preview.retentionItems).toEqual([]);
    expect(preview.retentionSummary).toBe(
      "当前范围暂无留存同期群数据，建议确认是否已有跨日活跃样本。",
    );
    expect(preview.metrics).toEqual([
      {
        label: "事件量",
        value: "2.7k",
        detail: "最近 7 天接收事件",
        tone: "blue",
      },
      {
        label: "活跃用户",
        value: "184",
        detail: "最近 7 天去重用户",
        tone: "green",
      },
      {
        label: "异常占比",
        value: "15.0%",
        detail: "3 / 20 条验证异常",
        tone: "red",
      },
    ]);
    expect(preview.trendItems).toHaveLength(2);
    expect(preview.funnelDropoff).toEqual({
      fromEventName: "pay_button_click",
      fromStep: "2",
      toEventName: "checkout_submit",
      toStep: "3",
      dropoff: "35.0%",
      conversion: "45.0%",
    });
  });

  it("does not use fallback report data unless explicitly enabled", async () => {
    const preview = await loadReportPreviewData({
      client: {
        async loadAnalytics() {
          throw new Error("ClickHouse is down");
        },
      },
    });

    expect(preview.source).toBe("unavailable");
    expect(preview.dataHealth).toEqual({
      label: "真实数据源不可用",
      detail: "当前环境未读取到 ClickHouse 数据，报告不会使用示例数据。",
      tone: "danger",
    });
    expect(preview.executiveSummary).toEqual([
      "当前环境未读取到真实分析数据，暂不能生成线上报告。",
    ]);
    expect(preview.insightCards).toEqual([]);
    expect(preview.trendChartItems).toEqual([]);
    expect(preview.retentionItems).toEqual([]);
    expect(preview.retentionSummary).toBe("暂无留存数据");
    expect(preview.metrics).toEqual([]);
    expect(preview.trendItems).toEqual([]);
    expect(preview.funnelSteps).toEqual([]);
    expect(preview.funnelDropoff).toBeNull();
  });

  it("ignores legacy sample opt-in and keeps reports unavailable without real data", async () => {
    const preview = await loadReportPreviewData({
      env: {
        TRACKINGHUB_ALLOW_SAMPLE_DATA: "true",
      },
      client: {
        async loadAnalytics() {
          throw new Error("ClickHouse is down");
        },
      },
    });

    expect(preview.source).toBe("unavailable");
    expect(preview.metrics).toEqual([]);
    expect(preview.trendItems).toEqual([]);
    expect(preview.funnelSteps).toEqual([]);
    expect(preview.funnelDropoff).toBeNull();
  });

  it("does not fall back to sample reports when real data is required", async () => {
    const preview = await loadReportPreviewData({
      env: {
        NODE_ENV: "production",
      },
      client: {
        async loadAnalytics() {
          throw new Error("ClickHouse is down");
        },
      },
    });

    expect(preview.source).toBe("unavailable");
    expect(preview.metrics).toEqual([]);
    expect(preview.trendItems).toEqual([]);
    expect(preview.funnelSteps).toEqual([]);
    expect(preview.funnelDropoff).toBeNull();
  });
});
