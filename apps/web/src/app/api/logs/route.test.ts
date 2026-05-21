import { describe, expect, it } from "vitest";

import { handleLogGet, handleLogPost } from "./route";
import {
  createMemoryMetadataStore,
  hashSdkWriteKey,
} from "@/lib/metadata/metadata-store";

const payload = {
  project_id: "project_x",
  environment: "prod",
  source: "web",
  level: "error",
  message: "Checkout failed",
  logger: "checkout",
  user_id: "u_123",
  anonymous_id: "anon_123",
  device_id: "device_456",
  session_id: "session_789",
  timestamp: 1710000000000,
  app_version: "1.2.0",
  sdk_version: "0.1.0",
  channel: "google",
  country: "US",
  trace_id: "trace_123",
  error_name: "CheckoutError",
  error_message: "payment timeout",
  stack: "CheckoutError: payment timeout",
  attributes: { order_id: "order_123" },
  context: { locale: "en-US" },
};

describe("/api/logs", () => {
  it("persists valid SDK logs before accepting them", async () => {
    const logs: unknown[] = [];
    const response = await handleLogPost(
      new Request("http://localhost/api/logs", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
      {
        logWriter: {
          writeLog: async (log) => {
            logs.push(log);
          },
        },
        createLogId: () => "log_123",
        now: () => new Date("2026-05-21T10:00:00.000Z"),
      },
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({
      accepted: true,
      log_id: "log_123",
      level: "error",
      received_at: "2026-05-21T10:00:00.000Z",
    });
    expect(logs).toEqual([
      {
        ...payload,
        log_id: "log_123",
        received_at: "2026-05-21T10:00:00.000Z",
      },
    ]);
  });

  it("rejects logs when metadata-backed SDK write key validation fails", async () => {
    const store = createMemoryMetadataStore();
    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web"],
    });
    await store.upsertEnvironment(project.id, {
      name: "prod",
      enabled: true,
      lastEventAt: null,
    });
    await store.createSdkKey(project.id, "prod", {
      source: "web",
      maskedKey: "write_key_live_****91",
      status: "active",
      keyHash: hashSdkWriteKey("expected_write_key"),
    });

    const response = await handleLogPost(
      new Request("http://localhost/api/logs", {
        method: "POST",
        headers: { "x-trackinghub-write-key": "wrong_write_key" },
        body: JSON.stringify({ ...payload, project_id: project.id }),
      }),
      {
        metadataStore: store,
        logWriter: {
          writeLog: async () => undefined,
        },
      },
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      accepted: false,
      errors: ["invalid write key"],
    });
  });

  it("returns filtered logs for viewers", async () => {
    const calls: unknown[] = [];
    const response = await handleLogGet(
      new Request(
        "http://localhost/api/logs?project_id=project_x&level=error&q=checkout",
      ),
      {
        user: { role: "viewer" },
        client: {
          async loadLogs(filters) {
            calls.push(filters);
            return {
              source: "clickhouse",
              filters: {
                projectId: "project_x",
                level: "error",
                q: "checkout",
                range: "7d",
              },
              metrics: [
                { label: "日志量", value: "1", detail: "最近 7 天", tone: "blue" },
              ],
              levelCounts: [{ level: "error", count: 1, share: "100%" }],
              items: [
                {
                  logId: "log_123",
                  level: "error",
                  message: "Checkout failed",
                  logger: "checkout",
                  environment: "prod",
                  source: "web",
                  timestamp: "05-21 10:00",
                  receivedAt: "05-21 10:00",
                  identity: "u_123",
                  appVersion: "1.2.0",
                  traceId: "trace_123",
                  errorSummary: "CheckoutError: payment timeout",
                },
              ],
            };
          },
        },
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: {
        logs: {
          source: "clickhouse",
          items: [{ logId: "log_123", message: "Checkout failed" }],
        },
      },
    });
    expect(calls).toEqual([
      {
        project_id: "project_x",
        level: "error",
        q: "checkout",
      },
    ]);
  });
});
