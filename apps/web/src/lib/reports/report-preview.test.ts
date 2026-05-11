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
      uniqueUsers: "88",
    },
    {
      bucket: "05-09 00:00",
      eventName: "product_detail_view",
      environment: "prod",
      source: "web",
      eventCount: "100",
      uniqueUsers: "72",
    },
  ],
  funnelSteps: [
    {
      step: "1",
      eventName: "product_detail_view",
      users: "100",
      conversion: "100%",
    },
    {
      step: "2",
      eventName: "pay_button_click",
      users: "80",
      conversion: "80.0%",
    },
    {
      step: "3",
      eventName: "checkout_submit",
      users: "45",
      conversion: "45.0%",
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

  it("falls back to sample report preview data when analytics is unavailable", async () => {
    const preview = await loadReportPreviewData({
      client: {
        async loadAnalytics() {
          throw new Error("ClickHouse is down");
        },
      },
    });

    expect(preview.source).toBe("sample");
    expect(preview.metrics.map((metric) => metric.label)).toEqual([
      "事件量",
      "活跃用户",
      "异常占比",
    ]);
    expect(preview.trendItems.length).toBeGreaterThan(0);
    expect(preview.funnelSteps.length).toBeGreaterThan(0);
    expect(preview.funnelDropoff?.dropoff).toBe("42.2%");
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
