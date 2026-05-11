import { AppShell } from "@/components/trackinghub/app-shell";
import { PageHeader } from "@/components/trackinghub/page-header";
import { ReportsWorkbench } from "@/components/trackinghub/reports-workbench";
import type { AnalyticsFilterInput } from "@/lib/analytics/clickhouse-analytics";
import {
  generateDailyReportDraft,
  shouldGenerateDailyReportDraft,
} from "@/lib/reports/report-draft";
import { loadReportPreviewData } from "@/lib/reports/report-preview";
import { getCurrentUserFromCookieHeader } from "@/lib/api/auth";
import { assertCanRead } from "@/lib/auth/permissions";
import { defaultMetadataStore } from "@/lib/metadata/default-metadata-store";
import { getPostgresConnectionString } from "@/lib/metadata/postgres";
import { pageShells } from "@/lib/trackinghub/page-shells";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

type ReportsPageProps = {
  searchParams?:
    | AnalyticsFilterInput
    | Promise<AnalyticsFilterInput>;
};

async function getReportProjectOptions() {
  if (!getPostgresConnectionString()) {
    return [];
  }

  const user = await getCurrentUserFromCookieHeader(
    (await headers()).get("cookie"),
  );

  if (!user) {
    return [];
  }

  try {
    assertCanRead(user);
    const overview = await defaultMetadataStore.listProjectsOverview();

    return overview.projects.map((project) => ({
      id: project.id,
      name: project.name,
      slug: project.slug,
    }));
  } catch {
    return [];
  }
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const filters = await Promise.resolve(searchParams ?? {});
  const [preview, projectOptions] = await Promise.all([
    loadReportPreviewData({
      filters,
    }),
    getReportProjectOptions(),
  ]);
  const dailyDraft = shouldGenerateDailyReportDraft(filters) &&
    preview.source !== "unavailable"
    ? generateDailyReportDraft(preview)
    : null;

  return (
    <AppShell activeHref="/reports">
      <PageHeader
        eyebrow={pageShells.reports.eyebrow}
        title={pageShells.reports.title}
      />
      <div className="mt-6">
        <ReportsWorkbench
          dailyDraft={dailyDraft}
          preview={preview}
          projectOptions={projectOptions}
        />
      </div>
    </AppShell>
  );
}
