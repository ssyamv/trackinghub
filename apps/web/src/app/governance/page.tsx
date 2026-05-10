import { PageShell } from "@/components/trackinghub/page-shell";
import { pageShells } from "@/lib/trackinghub/sample-data";

export default function GovernancePage() {
  return <PageShell activeHref="/governance" page={pageShells.governance} />;
}
