import {
  evaluateHealth,
  type HealthDependencies,
} from "@/lib/runtime/health";

export const runtime = "nodejs";

export async function handleHealthGet(dependencies: HealthDependencies = {}) {
  const health = await evaluateHealth(dependencies);
  const ok = health.status === "ok";

  return Response.json(
    {
      ok,
      data: health,
    },
    { status: ok ? 200 : 503 },
  );
}

export async function GET() {
  return handleHealthGet();
}
