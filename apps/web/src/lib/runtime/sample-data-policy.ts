export type RuntimeEnv = Record<string, string | undefined>;

export function allowsSampleData(env: RuntimeEnv = process.env) {
  if (env.TRACKINGHUB_ALLOW_SAMPLE_DATA === "true") {
    return true;
  }

  if (
    env.TRACKINGHUB_ALLOW_SAMPLE_DATA === "false" ||
    env.TRACKINGHUB_REQUIRE_REAL_DATA === "true"
  ) {
    return false;
  }

  return env.NODE_ENV !== "production";
}
