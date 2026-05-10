import { AnalyticsWorkbench } from "@/components/trackinghub/analytics-workbench";
import { AppShell } from "@/components/trackinghub/app-shell";
import { PageHeader } from "@/components/trackinghub/page-header";
import {
  analyticsFunnelSteps,
  analyticsMetricCards,
  analyticsTemplateItems,
  pageShells,
} from "@/lib/trackinghub/sample-data";

export default function AnalyticsPage() {
  return (
    <AppShell activeHref="/analytics">
      <PageHeader
        description={pageShells.analytics.description}
        eyebrow={pageShells.analytics.eyebrow}
        title={pageShells.analytics.title}
      />
      <div className="mt-6">
        <AnalyticsWorkbench
          funnelSteps={analyticsFunnelSteps}
          metrics={analyticsMetricCards}
          templates={analyticsTemplateItems}
        />
      </div>
    </AppShell>
  );
}
