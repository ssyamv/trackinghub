import { AppShell } from "@/components/trackinghub/app-shell";
import { PageHeader } from "@/components/trackinghub/page-header";
import { ProjectManagementWorkbench } from "@/components/trackinghub/project-management-workbench";
import {
  pageShells,
  projectEnvironmentItems,
  projectItems,
  projectSummaryCards,
  sdkKeyItems,
} from "@/lib/trackinghub/sample-data";

export default function ProjectsPage() {
  return (
    <AppShell activeHref="/projects">
      <PageHeader
        description={pageShells.projects.description}
        eyebrow={pageShells.projects.eyebrow}
        title={pageShells.projects.title}
      />
      <div className="mt-6">
        <ProjectManagementWorkbench
          environments={projectEnvironmentItems}
          projects={projectItems}
          sdkKeys={sdkKeyItems}
          summaryCards={projectSummaryCards}
        />
      </div>
    </AppShell>
  );
}
