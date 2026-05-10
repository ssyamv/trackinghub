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
  analyticsFunnelSteps,
  analyticsMetricCards,
  analyticsTemplateItems,
  analyticsTrendItems,
  pageShells,
} from "@/lib/trackinghub/sample-data";

export const dynamic = "force-dynamic";

type AnalyticsPageProps = {
  searchParams?:
    | AnalyticsFilterInput
    | Promise<AnalyticsFilterInput>;
};

async function getAnalyticsWorkbench(filters: AnalyticsFilters) {
  const fallback = {
    source: "sample" as const,
    metrics: analyticsMetricCards,
    templates: analyticsTemplateItems,
    funnelSteps: analyticsFunnelSteps,
    trendItems: analyticsTrendItems,
  };
  const client = createClickHouseAnalyticsClientFromEnv();

  if (!client) {
    return fallback;
  }

  try {
    const analytics = await client.loadAnalytics(filters);
    return {
      ...analytics,
      templates: analyticsTemplateItems,
    };
  } catch {
    return fallback;
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
