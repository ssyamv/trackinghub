import { PageShell } from "@/components/trackinghub/page-shell";
import { pageShells } from "@/lib/trackinghub/sample-data";

export default function ProjectsPage() {
  return <PageShell activeHref="/projects" page={pageShells.projects} />;
}
