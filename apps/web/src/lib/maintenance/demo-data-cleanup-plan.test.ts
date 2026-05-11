import { describe, expect, test } from "vitest";
import { buildDemoDataCleanupPlan } from "./demo-data-cleanup-plan";

describe("buildDemoDataCleanupPlan", () => {
  test("defaults to preserving the first formal Magic Frame App project", () => {
    const plan = buildDemoDataCleanupPlan({});

    expect(plan.keepProjectSlugs).toEqual(["magic_frame_app"]);
    expect(plan.postgres.countProjectsSql).toContain("slug <> ALL($1::text[])");
    expect(plan.postgres.deleteProjectsSql).toContain("DELETE FROM projects");
  });

  test("rejects empty keep project slugs", () => {
    expect(() =>
      buildDemoDataCleanupPlan({ keepProjectSlugs: ["", "  "] }),
    ).toThrow("At least one project slug must be preserved");
  });

  test("builds ClickHouse cleanup statements only when requested", () => {
    expect(buildDemoDataCleanupPlan({}).clickHouse).toBeNull();

    const plan = buildDemoDataCleanupPlan({ includeClickHouse: true });

    expect(plan.clickHouse?.countRawEventsSql).toContain("raw_events");
    expect(plan.clickHouse?.countRawEventsSql).toContain("keepProjectIds");
    expect(plan.clickHouse?.deleteRawEventsSql).toContain("ALTER TABLE raw_events DELETE");
    expect(plan.clickHouse?.countValidationResultsSql).toContain(
      "event_validation_results",
    );
  });
});
