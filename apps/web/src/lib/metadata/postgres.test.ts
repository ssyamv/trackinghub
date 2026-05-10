import { describe, expect, it } from "vitest";
import { getPostgresConnectionString, getPostgresPool } from "./postgres";

describe("postgres config", () => {
  it("uses TrackingHub-specific database url first", () => {
    expect(
      getPostgresConnectionString({
        TRACKINGHUB_POSTGRES_URL: "postgres://trackinghub",
        DATABASE_URL: "postgres://generic",
      }),
    ).toBe("postgres://trackinghub");
  });

  it("falls back to DATABASE_URL", () => {
    expect(
      getPostgresConnectionString({ DATABASE_URL: "postgres://generic" }),
    ).toBe("postgres://generic");
  });

  it("returns null when no database is configured", () => {
    expect(getPostgresConnectionString({})).toBeNull();
  });

  it("reuses the pool for the same connection string", async () => {
    const pool = getPostgresPool({
      TRACKINGHUB_POSTGRES_URL: "postgres://same-pool",
    });

    expect(
      getPostgresPool({ TRACKINGHUB_POSTGRES_URL: "postgres://same-pool" }),
    ).toBe(pool);
    await pool?.end();
  });

  it("creates a new pool when the connection string changes", async () => {
    const firstPool = getPostgresPool({
      TRACKINGHUB_POSTGRES_URL: "postgres://first-pool",
    });
    const secondPool = getPostgresPool({
      TRACKINGHUB_POSTGRES_URL: "postgres://second-pool",
    });

    expect(secondPool).not.toBe(firstPool);
    await secondPool?.end();
  });
});
