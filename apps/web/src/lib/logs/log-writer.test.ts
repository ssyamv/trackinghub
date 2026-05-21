import { describe, expect, it } from "vitest";

import { createLogWriterFromEnv } from "./log-writer";

describe("createLogWriterFromEnv", () => {
  it("ensures raw_logs exists before inserting a log row", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const writer = createLogWriterFromEnv(
      {
        TRACKINGHUB_CLICKHOUSE_URL: "https://clickhouse.example.com",
        TRACKINGHUB_CLICKHOUSE_DATABASE: "trackinghub",
      },
      async (url, init) => {
        requests.push({ url: String(url), init });
        return new Response("", { status: 200 });
      },
    );

    await writer.writeLog({
      log_id: "log_123",
      project_id: "project_x",
      environment: "prod",
      source: "web",
      level: "info",
      message: "ready",
      timestamp: 1710000000000,
      received_at: "2026-05-21T10:00:00.000Z",
      sdk_version: "0.1.0",
      attributes: {},
      context: {},
    });

    expect(requests).toHaveLength(2);
    expect(requests[0].url).toContain("CREATE+TABLE+IF+NOT+EXISTS+raw_logs");
    expect(requests[1].url).toContain("INSERT+INTO+raw_logs");
  });
});
