import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = process.cwd();
const repoRoot = join(appRoot, "../..");
const sourceRoot = join(appRoot, "src");

function readSourceFile(relativePath: string) {
  return readFileSync(join(appRoot, relativePath), "utf8");
}

describe("clean real-data state", () => {
  it("does not keep the legacy sample data module", () => {
    expect(existsSync(join(sourceRoot, "lib/trackinghub/sample-data.ts"))).toBe(
      false,
    );
  });

  it("does not expose a sample-data opt-in environment variable", () => {
    expect(readFileSync(join(repoRoot, ".env.example"), "utf8")).not.toContain(
      "TRACKINGHUB_ALLOW_SAMPLE_DATA",
    );
    expect(readSourceFile("README.md")).not.toContain(
      "TRACKINGHUB_ALLOW_SAMPLE_DATA",
    );
  });
});
