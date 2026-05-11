import { describe, expect, it } from "vitest";
import { dynamic as analyticsDistributionsDynamic } from "./analytics/distributions/page";
import { dynamic as analyticsDynamic } from "./analytics/page";
import { dynamic as governanceDynamic } from "./governance/page";
import { dynamic as projectsDynamic } from "./projects/page";
import { dynamic as reportsDynamic } from "./reports/page";

describe("metadata-backed admin pages", () => {
  it("loads data-backed admin pages dynamically at runtime", () => {
    expect(analyticsDistributionsDynamic).toBe("force-dynamic");
    expect(analyticsDynamic).toBe("force-dynamic");
    expect(projectsDynamic).toBe("force-dynamic");
    expect(governanceDynamic).toBe("force-dynamic");
    expect(reportsDynamic).toBe("force-dynamic");
  });
});
