import { describe, expect, it } from "vitest";
import { getPostgresConnectionString } from "./postgres";

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
});
