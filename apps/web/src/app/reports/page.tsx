import { AppShell } from "@/components/trackinghub/app-shell";
import { PageHeader } from "@/components/trackinghub/page-header";
import { ReportsWorkbench } from "@/components/trackinghub/reports-workbench";
import {
  pageShells,
  reportTaskItems,
  reportTemplateItems,
} from "@/lib/trackinghub/sample-data";

export default function ReportsPage() {
  return (
    <AppShell activeHref="/reports">
      <PageHeader
        description={pageShells.reports.description}
        eyebrow={pageShells.reports.eyebrow}
        title={pageShells.reports.title}
      />
      <div className="mt-6">
        <ReportsWorkbench
          tasks={reportTaskItems}
          templates={reportTemplateItems}
        />
      </div>
    </AppShell>
  );
}
