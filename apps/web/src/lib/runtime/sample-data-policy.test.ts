import { describe, expect, it } from "vitest";

import { allowsSampleData } from "./sample-data-policy";

describe("allowsSampleData", () => {
  it("allows sample data in local development by default", () => {
    expect(allowsSampleData({ NODE_ENV: "development" })).toBe(true);
  });

  it("disables sample data in production by default", () => {
    expect(allowsSampleData({ NODE_ENV: "production" })).toBe(false);
  });

  it("supports explicit allow and deny switches", () => {
    expect(
      allowsSampleData({
        NODE_ENV: "production",
        TRACKINGHUB_ALLOW_SAMPLE_DATA: "true",
      }),
    ).toBe(true);
    expect(
      allowsSampleData({
        NODE_ENV: "development",
        TRACKINGHUB_ALLOW_SAMPLE_DATA: "false",
      }),
    ).toBe(false);
    expect(
      allowsSampleData({
        NODE_ENV: "development",
        TRACKINGHUB_REQUIRE_REAL_DATA: "true",
      }),
    ).toBe(false);
  });
});
