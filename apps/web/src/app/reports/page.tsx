import { PageShell } from "@/components/trackinghub/page-shell";
import { pageShells } from "@/lib/trackinghub/sample-data";

export default function ReportsPage() {
  return <PageShell activeHref="/reports" page={pageShells.reports} />;
}
