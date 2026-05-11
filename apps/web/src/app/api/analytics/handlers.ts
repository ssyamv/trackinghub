import { jsonError, jsonOk, mapApiError } from "@/lib/api/http";
import {
  analyticsRangeLabel,
  createClickHouseAnalyticsClientFromEnv,
  normalizeAnalyticsFilters,
  type AnalyticsFilterInput,
  type ClickHouseAnalyticsClient,
} from "@/lib/analytics/clickhouse-analytics";
import {
  assertCanRead,
  AuthError,
  type AuthenticatedUser,
} from "@/lib/auth/permissions";

type AnalyticsGetDependencies = {
  client?: ClickHouseAnalyticsClient | null;
  user: AuthenticatedUser | null;
};

function analyticsFilterInputFromUrl(url: string): AnalyticsFilterInput {
  const searchParams = new URL(url).searchParams;
  const input: Record<string, string | string[]> = {};

  for (const [key, value] of searchParams.entries()) {
    const existing = input[key];

    if (Array.isArray(existing)) {
      existing.push(value);
    } else if (existing) {
      input[key] = [existing, value];
    } else {
      input[key] = value;
    }
  }

  return input;
}

export async function handleAnalyticsGet(
  request: Request,
  { client, user }: AnalyticsGetDependencies,
) {
  try {
    assertCanRead(user);

    const input = analyticsFilterInputFromUrl(request.url);
    const filters = normalizeAnalyticsFilters(input);
    const analyticsClient = client ?? createClickHouseAnalyticsClientFromEnv();
    const analytics = analyticsClient
      ? await analyticsClient.loadAnalytics(input)
      : null;

    return jsonOk({
      analytics,
      filters,
      rangeLabel: analyticsRangeLabel(filters),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return mapApiError(error);
    }

    return jsonError(503, "DATABASE_UNAVAILABLE", "分析数据源暂时不可用");
  }
}
