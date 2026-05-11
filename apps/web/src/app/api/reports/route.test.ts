import { describe, expect, it } from "vitest";
import type { AnalyticsData } from "@/lib/analytics/clickhouse-analytics";
import { createMemoryMetadataStore } from "@/lib/metadata/metadata-store";
import { handleReportsGet, handleReportsPost } from "./handlers";
import { handleReportPreviewGet } from "./preview/handlers";

const reportAnalytics: AnalyticsData = {
  source: "clickhouse",
  metrics: [
    {
      detail: "最近 7 天接收事件",
      label: "事件量",
      tone: "blue",
      value: "120",
    },
    {
      detail: "最近 7 天去重用户",
      label: "活跃用户",
      tone: "green",
      value: "88",
    },
    {
      detail: "0 / 120 条验证异常",
      label: "异常占比",
      tone: "green",
      value: "0%",
    },
  ],
  trendItems: [],
  funnelSteps: [],
  retentionItems: [],
  propertyItems: [],
  propertyKeyCount: 0,
};

describe("/api/reports", () => {
  it("creates generated reports for editors", async () => {
    const store = createMemoryMetadataStore();
    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web"],
    });

    const response = await handleReportsPost(
      new Request("http://localhost/api/reports", {
        method: "POST",
        body: JSON.stringify({
          projectId: project.id,
          type: "daily",
          title: "Magic Frame 生产日报",
          content: "今日事件量 2.7k，异常占比 3.4%。",
          sourceQueryRefs: [{ source: "clickhouse", range: "7d" }],
        }),
      }),
      {
        store,
        user: { role: "editor", email: "editor@example.com" },
      },
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: {
        report: {
          projectId: project.id,
          projectName: "Magic Frame",
          type: "daily",
          title: "Magic Frame 生产日报",
          generatedBy: "editor@example.com",
        },
      },
    });
  });

  it("lists generated reports for viewers", async () => {
    const store = createMemoryMetadataStore();
    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web"],
    });
    await store.createReport({
      projectId: project.id,
      type: "daily",
      title: "Magic Frame 生产日报",
      content: "今日事件量 2.7k，异常占比 3.4%。",
      sourceQueryRefs: [{ source: "clickhouse", range: "7d" }],
      generatedBy: "codex",
      generatedAt: "2026-05-11T00:00:00.000Z",
    });

    const response = await handleReportsGet(
      new Request(`http://localhost/api/reports?project_id=${project.id}`),
      {
        store,
        user: { role: "viewer" },
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: {
        reports: [
          {
            projectId: project.id,
            type: "daily",
            title: "Magic Frame 生产日报",
          },
        ],
      },
    });
  });

  it("blocks viewers from creating reports", async () => {
    const response = await handleReportsPost(
      new Request("http://localhost/api/reports", {
        method: "POST",
        body: JSON.stringify({
          projectId: "project_1",
          type: "daily",
          title: "日报",
          content: "内容",
          sourceQueryRefs: [],
        }),
      }),
      {
        store: createMemoryMetadataStore(),
        user: { role: "viewer" },
      },
    );

    expect(response.status).toBe(403);
  });

  it("validates required report fields", async () => {
    const response = await handleReportsPost(
      new Request("http://localhost/api/reports", {
        method: "POST",
        body: JSON.stringify({ type: "daily", sourceQueryRefs: "bad" }),
      }),
      {
        store: createMemoryMetadataStore(),
        user: { role: "editor" },
      },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("returns report preview data for local report refreshes", async () => {
    const seenFilters: unknown[] = [];
    const response = await handleReportPreviewGet(
      new Request(
        "http://localhost/api/reports/preview?project_id=project_a&environment=prod&report_action=daily_draft",
      ),
      {
        client: {
          async loadAnalytics(filters) {
            seenFilters.push(filters);
            return reportAnalytics;
          },
        },
        user: { role: "viewer" },
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: {
        dailyDraft: {
          title: "project_a / prod / 全部平台 日报草稿",
        },
        dailyDraftHref:
          "/reports?project_id=project_a&environment=prod&range=7d&granularity=day&report_action=daily_draft",
        preview: {
          filters: {
            environment: "prod",
            projectId: "project_a",
          },
          source: "clickhouse",
        },
      },
    });
    expect(seenFilters).toEqual([
      {
        environment: "prod",
        eventName: undefined,
        funnelSteps: [],
        granularity: "day",
        projectId: "project_a",
        propertyKey: undefined,
        range: "7d",
        source: undefined,
      },
    ]);
  });

  it("blocks anonymous report preview refreshes", async () => {
    const response = await handleReportPreviewGet(
      new Request("http://localhost/api/reports/preview?range=7d"),
      {
        client: null,
        user: null,
      },
    );

    expect(response.status).toBe(401);
  });
});
