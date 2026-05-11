import { AppShell } from "@/components/trackinghub/app-shell";
import { EmptyPageState } from "@/components/trackinghub/empty-page-state";
import { PageHeader } from "@/components/trackinghub/page-header";
import { Button } from "@/components/ui/button";
import type { PageShell as PageShellData } from "@/lib/trackinghub/types";

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
        eyebrow={page.eyebrow}
        title={page.title}
      />

      <div className="mt-6">
        <EmptyPageState
          action={<Button type="button">{page.actionLabel}</Button>}
          badge={page.badge}
          sections={page.sections}
          title={page.title}
        />
      </div>
    </AppShell>
  );
}
