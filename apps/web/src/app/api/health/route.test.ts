import { describe, expect, it } from "vitest";

import { handleHealthGet } from "./route";

describe("/api/health", () => {
  it("returns 200 when runtime health is ok", async () => {
    const response = await handleHealthGet({
      env: {
        NODE_ENV: "production",
        TRACKINGHUB_POSTGRES_URL: "postgres://trackinghub",
        TRACKINGHUB_CLICKHOUSE_URL: "http://clickhouse:8123",
        TRACKINGHUB_REQUIRE_EVENT_PERSISTENCE: "true",
        TRACKINGHUB_REQUIRE_REAL_DATA: "true",
      },
      pingPostgres: async () => true,
      pingClickHouse: async () => true,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: { status: "ok" },
    });
  });

  it("returns 503 when runtime health is degraded", async () => {
    const response = await handleHealthGet({
      env: {
        NODE_ENV: "production",
        TRACKINGHUB_REQUIRE_EVENT_PERSISTENCE: "true",
      },
      pingPostgres: async () => true,
      pingClickHouse: async () => true,
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      ok: false,
      data: { status: "degraded" },
    });
  });
});
