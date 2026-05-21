import { describe, expect, it } from "vitest";

import { createClickHouseLogsClientFromEnv } from "./clickhouse-logs";

describe("createClickHouseLogsClientFromEnv", () => {
  it("returns null when ClickHouse is not configured", () => {
    expect(createClickHouseLogsClientFromEnv({})).toBeNull();
  });

  it("loads log metrics, level counts, and recent log rows", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const responses = [
      [],
      [
        {
          log_count: "42",
          error_count: "7",
          fatal_count: "1",
          last_received_at: "2026-05-21 10:30:00.000",
        },
      ],
      [
        { level: "error", count: "7" },
        { level: "info", count: "35" },
      ],
      [
        {
          log_id: "log_123",
          level: "error",
          message: "Checkout failed",
          logger: "checkout",
          environment: "prod",
          source: "web",
          timestamp: "2026-05-21 10:00:00.000",
          received_at: "2026-05-21 10:00:01.000",
          user_id: "u_123",
          anonymous_id: "",
          device_id: "",
          session_id: "",
          app_version: "1.2.0",
          trace_id: "trace_123",
          error_name: "CheckoutError",
          error_message: "payment timeout",
        },
      ],
    ];

    const client = createClickHouseLogsClientFromEnv(
      {
        TRACKINGHUB_CLICKHOUSE_URL: "https://clickhouse.example.com",
        TRACKINGHUB_CLICKHOUSE_DATABASE: "trackinghub",
        TRACKINGHUB_CLICKHOUSE_USERNAME: "reader",
        TRACKINGHUB_CLICKHOUSE_PASSWORD: "secret",
      },
      async (url, init) => {
        requests.push({ url: String(url), init });
        const body = responses
          .shift()
          ?.map((row) => JSON.stringify(row))
          .join("\n");
        return new Response(`${body ?? ""}\n`, { status: 200 });
      },
    );

    const result = await client?.loadLogs({
      project_id: "project_x",
      level: "error",
      q: "checkout",
    });

    expect(result).toEqual({
      source: "clickhouse",
      filters: {
        projectId: "project_x",
        level: "error",
        q: "checkout",
        range: "7d",
      },
      metrics: [
        {
          label: "日志量",
          value: "42",
          detail: "最近 7 天接收日志",
          tone: "blue",
        },
        {
          label: "错误日志",
          value: "7",
          detail: "error 级别日志",
          tone: "red",
        },
        {
          label: "Fatal",
          value: "1",
          detail: "fatal 级别日志",
          tone: "red",
        },
        {
          label: "最近接收",
          value: "05-21 10:30",
          detail: "raw_logs 最新 received_at",
          tone: "purple",
        },
      ],
      levelCounts: [
        { level: "error", count: 7, share: "16.7%" },
        { level: "info", count: 35, share: "83.3%" },
      ],
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
    });
    expect(requests).toHaveLength(4);
    expect(requests[0].url).toContain("CREATE+TABLE+IF+NOT+EXISTS+raw_logs");
    expect(requests[1].url).toContain("FROM+raw_logs");
    expect(requests[2].url).toContain("GROUP+BY+level");
    expect(requests[3].url).toContain("message+ILIKE");
    expect(requests[1].init?.headers).toMatchObject({
      Authorization: "Basic cmVhZGVyOnNlY3JldA==",
    });
  });
});
