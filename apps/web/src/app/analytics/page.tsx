import { AnalyticsWorkbench } from "@/components/trackinghub/analytics-workbench";
import { AppShell } from "@/components/trackinghub/app-shell";
import { PageHeader } from "@/components/trackinghub/page-header";
import { getCurrentUserFromCookieHeader } from "@/lib/api/auth";
import {
  type AnalyticsFilterInput,
  type AnalyticsFilters,
  createClickHouseAnalyticsClientFromEnv,
  normalizeAnalyticsFilters,
} from "@/lib/analytics/clickhouse-analytics";
import { assertCanRead } from "@/lib/auth/permissions";
import { getPostgresConnectionString } from "@/lib/metadata/postgres";
import { pageShells } from "@/lib/trackinghub/page-shells";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

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
    funnelSteps: [],
    trendItems: [],
    propertyItems: [],
    propertyKeyCount: 0,
    dimensionGroups: [],
  };
  const client = createClickHouseAnalyticsClientFromEnv();

  if (!client) {
    return unavailable;
  }

  try {
    const analytics = await client.loadAnalytics(filters);
    return {
      ...analytics,
    };
  } catch {
    return unavailable;
  }
}

async function assertAnalyticsPageAccess() {
  if (!getPostgresConnectionString()) {
    return;
  }

  const user = await getCurrentUserFromCookieHeader(
    (await headers()).get("cookie"),
  );

  if (!user) {
    redirect("/login");
  }

  assertCanRead(user);
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  await assertAnalyticsPageAccess();

  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const filters = normalizeAnalyticsFilters(resolvedSearchParams);
  const workbench = await getAnalyticsWorkbench(filters);

  return (
    <AppShell activeHref="/analytics">
      <PageHeader
        eyebrow={pageShells.analytics.eyebrow}
        title={pageShells.analytics.title}
      />
      <div className="mt-6">
        <AnalyticsWorkbench
          dimensionGroups={workbench.dimensionGroups}
          filters={filters}
          funnelSteps={workbench.funnelSteps}
          metrics={workbench.metrics}
          propertyKeyCount={workbench.propertyKeyCount}
          propertyItems={workbench.propertyItems}
          source={workbench.source}
          trendItems={workbench.trendItems}
        />
      </div>
    </AppShell>
  );
}
