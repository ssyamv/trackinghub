import { describe, expect, it } from "vitest";

import { evaluateHealth } from "./health";

describe("evaluateHealth", () => {
  it("reports ok when production dependencies are configured and reachable", async () => {
    const health = await evaluateHealth({
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

    expect(health.status).toBe("ok");
    expect(health.checks).toEqual([
      {
        name: "postgres",
        status: "ok",
        message: "Postgres 已配置且可连接",
      },
      {
        name: "clickhouse",
        status: "ok",
        message: "ClickHouse 已配置且可连接",
      },
      {
        name: "eventPersistence",
        status: "ok",
        message: "事件持久化保护已满足",
      },
      {
        name: "sampleData",
        status: "ok",
        message: "当前环境不会回显占位数据",
      },
    ]);
  });

  it("reports production dependency gaps as errors", async () => {
    const health = await evaluateHealth({
      env: {
        NODE_ENV: "production",
        TRACKINGHUB_REQUIRE_EVENT_PERSISTENCE: "true",
        TRACKINGHUB_REQUIRE_REAL_DATA: "true",
      },
      pingPostgres: async () => true,
      pingClickHouse: async () => true,
    });

    expect(health.status).toBe("degraded");
    expect(health.checks).toContainEqual({
      name: "postgres",
      status: "error",
      message: "生产环境未配置 Postgres",
    });
    expect(health.checks).toContainEqual({
      name: "clickhouse",
      status: "error",
      message: "生产环境未配置 ClickHouse",
    });
  });

  it("reports configured but unreachable dependencies as errors", async () => {
    const health = await evaluateHealth({
      env: {
        NODE_ENV: "production",
        TRACKINGHUB_POSTGRES_URL: "postgres://trackinghub",
        TRACKINGHUB_CLICKHOUSE_URL: "http://clickhouse:8123",
      },
      pingPostgres: async () => false,
      pingClickHouse: async () => false,
    });

    expect(health.status).toBe("degraded");
    expect(health.checks).toContainEqual({
      name: "postgres",
      status: "error",
      message: "Postgres 已配置但连接失败",
    });
    expect(health.checks).toContainEqual({
      name: "clickhouse",
      status: "error",
      message: "ClickHouse 已配置但连接失败",
    });
  });

  it("keeps local sample mode off unless explicitly enabled", async () => {
    const health = await evaluateHealth({
      env: {
        NODE_ENV: "development",
      },
      pingPostgres: async () => true,
      pingClickHouse: async () => true,
    });

    expect(health.status).toBe("degraded");
    expect(health.checks).toContainEqual({
      name: "sampleData",
      status: "ok",
      message: "当前环境不会回显占位数据",
    });
  });

  it("allows sample mode only with explicit opt-in", async () => {
    const health = await evaluateHealth({
      env: {
        NODE_ENV: "development",
        TRACKINGHUB_ALLOW_SAMPLE_DATA: "true",
      },
      pingPostgres: async () => true,
      pingClickHouse: async () => true,
    });

    expect(health.status).toBe("degraded");
    expect(health.checks).toContainEqual({
      name: "sampleData",
      status: "warning",
      message: "当前环境允许回显占位数据",
    });
  });
});
