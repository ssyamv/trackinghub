import { PageShell } from "@/components/trackinghub/page-shell";
import { pageShells } from "@/lib/trackinghub/sample-data";

export default function SettingsPage() {
  return <PageShell activeHref="/settings" page={pageShells.settings} />;
}
