import { AnalyticsWorkbench } from "@/components/trackinghub/analytics-workbench";
import { AppShell } from "@/components/trackinghub/app-shell";
import { PageHeader } from "@/components/trackinghub/page-header";
import {
  type AnalyticsFilterInput,
  type AnalyticsFilters,
  createClickHouseAnalyticsClientFromEnv,
  normalizeAnalyticsFilters,
} from "@/lib/analytics/clickhouse-analytics";
import {
  analyticsTemplateItems,
} from "@/lib/trackinghub/analytics-templates";
import { pageShells } from "@/lib/trackinghub/page-shells";

export const dynamic = "force-dynamic";

type AnalyticsPageProps = {
  searchParams?:
    | AnalyticsFilterInput
    | Promise<AnalyticsFilterInput>;
};

async function getAnalyticsWorkbench(filters: AnalyticsFilters) {
  const unavailable = {
    source: "unavailable" as const,
    metrics: [],
    templates: analyticsTemplateItems,
    funnelSteps: [],
    trendItems: [],
  };
  const client = createClickHouseAnalyticsClientFromEnv();

  if (!client) {
    return unavailable;
  }

  try {
    const analytics = await client.loadAnalytics(filters);
    return {
      ...analytics,
      templates: analyticsTemplateItems,
    };
  } catch {
    return unavailable;
  }
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const filters = normalizeAnalyticsFilters(await Promise.resolve(searchParams ?? {}));
  const workbench = await getAnalyticsWorkbench(filters);

  return (
    <AppShell activeHref="/analytics">
      <PageHeader
        description={pageShells.analytics.description}
        eyebrow={pageShells.analytics.eyebrow}
        title={pageShells.analytics.title}
      />
      <div className="mt-6">
        <AnalyticsWorkbench
          filters={filters}
          funnelSteps={workbench.funnelSteps}
          metrics={workbench.metrics}
          source={workbench.source}
          templates={workbench.templates}
          trendItems={workbench.trendItems}
        />
      </div>
    </AppShell>
  );
}
