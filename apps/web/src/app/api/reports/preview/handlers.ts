import { jsonOk, mapApiError } from "@/lib/api/http";
import {
  type AnalyticsFilterInput,
  type ClickHouseAnalyticsClient,
} from "@/lib/analytics/clickhouse-analytics";
import { assertCanRead, type AuthenticatedUser } from "@/lib/auth/permissions";
import {
  buildDailyReportDraftHref,
  generateDailyReportDraft,
  shouldGenerateDailyReportDraft,
} from "@/lib/reports/report-draft";
import { loadReportPreviewData } from "@/lib/reports/report-preview";

type ReportPreviewGetDependencies = {
  client?: ClickHouseAnalyticsClient | null;
  user: AuthenticatedUser | null;
};

function reportFilterInputFromUrl(url: string): AnalyticsFilterInput {
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

export async function handleReportPreviewGet(
  request: Request,
  { client, user }: ReportPreviewGetDependencies,
) {
  try {
    assertCanRead(user);

    const input = reportFilterInputFromUrl(request.url);
    const preview = await loadReportPreviewData({
      client,
      filters: input,
    });
    const dailyDraft =
      shouldGenerateDailyReportDraft(input) && preview.source !== "unavailable"
        ? generateDailyReportDraft(preview)
        : null;

    return jsonOk({
      dailyDraft,
      dailyDraftHref: buildDailyReportDraftHref(preview),
      preview,
    });
  } catch (error) {
    return mapApiError(error);
  }
}
