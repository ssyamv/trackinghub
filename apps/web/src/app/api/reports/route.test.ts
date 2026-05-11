import { describe, expect, it } from "vitest";
import { createMemoryMetadataStore } from "@/lib/metadata/metadata-store";
import { handleReportsGet, handleReportsPost } from "./handlers";

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
});
