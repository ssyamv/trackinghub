import { AppShell } from "@/components/trackinghub/app-shell";
import { PageHeader } from "@/components/trackinghub/page-header";
import { ReportsWorkbench } from "@/components/trackinghub/reports-workbench";
import type { AnalyticsFilterInput } from "@/lib/analytics/clickhouse-analytics";
import {
  buildDailyReportDraftHref,
  generateDailyReportDraft,
  shouldGenerateDailyReportDraft,
} from "@/lib/reports/report-draft";
import { loadReportPreviewData } from "@/lib/reports/report-preview";
import { pageShells } from "@/lib/trackinghub/page-shells";
import { reportTemplateItems } from "@/lib/trackinghub/report-templates";

export const dynamic = "force-dynamic";

type ReportsPageProps = {
  searchParams?:
    | AnalyticsFilterInput
    | Promise<AnalyticsFilterInput>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const filters = await Promise.resolve(searchParams ?? {});
  const preview = await loadReportPreviewData({
    filters,
  });
  const dailyDraft = shouldGenerateDailyReportDraft(filters) &&
    preview.source !== "unavailable"
    ? generateDailyReportDraft(preview)
    : null;

  return (
    <AppShell activeHref="/reports">
      <PageHeader
        description={pageShells.reports.description}
        eyebrow={pageShells.reports.eyebrow}
        title={pageShells.reports.title}
      />
      <div className="mt-6">
        <ReportsWorkbench
          dailyDraft={dailyDraft}
          dailyDraftHref={buildDailyReportDraftHref(preview)}
          preview={preview}
          templates={reportTemplateItems}
        />
      </div>
    </AppShell>
  );
}
