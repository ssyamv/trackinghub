import { PageShell } from "@/components/trackinghub/page-shell";
import { pageShells } from "@/lib/trackinghub/sample-data";

export default function AnalyticsPage() {
  return <PageShell activeHref="/analytics" page={pageShells.analytics} />;
}
