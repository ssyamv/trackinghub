import { PageShell } from "@/components/trackinghub/page-shell";
import { pageShells } from "@/lib/trackinghub/page-shells";

export default function SettingsPage() {
  return <PageShell activeHref="/settings" page={pageShells.settings} />;
}
