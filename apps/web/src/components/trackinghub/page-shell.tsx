import { AppShell } from "@/components/trackinghub/app-shell";
import { EmptyPageState } from "@/components/trackinghub/empty-page-state";
import { PageHeader } from "@/components/trackinghub/page-header";
import { Button } from "@/components/ui/button";
import type { PageShell as PageShellData } from "@/lib/trackinghub/sample-data";

export function PageShell({
  activeHref,
  page,
}: {
  activeHref: string;
  page: PageShellData;
}) {
  return (
    <AppShell activeHref={activeHref}>
      <PageHeader
        description={page.description}
        eyebrow={page.eyebrow}
        title={page.title}
      />

      <div className="mt-6">
        <EmptyPageState
          action={<Button type="button">{page.actionLabel}</Button>}
          badge={page.badge}
          description={page.description}
          sections={page.sections}
          title={page.title}
        />
      </div>
    </AppShell>
  );
}
