export type RuntimeEnv = Record<string, string | undefined>;

export function allowsSampleData(env: RuntimeEnv = process.env) {
  if (env.TRACKINGHUB_ALLOW_SAMPLE_DATA === "true") {
    return true;
  }

  return false;
}
