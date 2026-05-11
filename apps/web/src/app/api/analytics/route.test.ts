import { describe, expect, it } from "vitest";

import { handleAnalyticsGet } from "./handlers";

describe("/api/analytics", () => {
  it("returns analytics for viewers and normalizes custom date filters", async () => {
    const calls: unknown[] = [];
    const response = await handleAnalyticsGet(
      new Request(
        "http://localhost/api/analytics?project_id=project_a&date_from=2026-05-05&date_to=2026-05-11",
      ),
      {
        client: {
          async loadAnalytics(filters) {
            calls.push(filters);
            return {
              source: "clickhouse",
              metrics: [],
              trendItems: [],
              funnelSteps: [],
              dimensionGroups: [],
              retentionItems: [],
              propertyItems: [],
              propertyKeyCount: 0,
            };
          },
        },
        user: { role: "viewer" },
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: {
        analytics: { source: "clickhouse" },
        filters: {
          projectId: "project_a",
          dateFrom: "2026-05-05",
          dateTo: "2026-05-11",
        },
        rangeLabel: "2026-05-05 至 2026-05-11",
      },
    });
    expect(calls).toEqual([
      {
        project_id: "project_a",
        date_from: "2026-05-05",
        date_to: "2026-05-11",
      },
    ]);
  });

  it("blocks anonymous analytics reads", async () => {
    const response = await handleAnalyticsGet(
      new Request("http://localhost/api/analytics?range=30d"),
      {
        client: null,
        user: null,
      },
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "UNAUTHENTICATED" },
    });
  });

  it("returns an analytics-specific message when the data query fails", async () => {
    const response = await handleAnalyticsGet(
      new Request("http://localhost/api/analytics?event_name=parameter_lab_submit"),
      {
        client: {
          async loadAnalytics() {
            throw new Error("ClickHouse query failed");
          },
        },
        user: { role: "viewer" },
      },
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "分析数据源暂时不可用",
      },
    });
  });
});
