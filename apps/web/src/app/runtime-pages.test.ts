import { describe, expect, it } from "vitest";
import { dynamic as governanceDynamic } from "./governance/page";
import { dynamic as projectsDynamic } from "./projects/page";

describe("metadata-backed admin pages", () => {
  it("loads projects and governance pages dynamically at runtime", () => {
    expect(projectsDynamic).toBe("force-dynamic");
    expect(governanceDynamic).toBe("force-dynamic");
  });
});
