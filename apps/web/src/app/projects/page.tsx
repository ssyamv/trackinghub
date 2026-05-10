import { AppShell } from "@/components/trackinghub/app-shell";
import { PageHeader } from "@/components/trackinghub/page-header";
import { ProjectManagementWorkbench } from "@/components/trackinghub/project-management-workbench";
import { defaultMetadataStore } from "@/lib/metadata/default-metadata-store";
import { mapProjectsOverviewToWorkbench } from "@/lib/trackinghub/project-api";
import {
  pageShells,
  projectEnvironmentItems,
  projectItems,
  projectSummaryCards,
  sdkKeyItems,
} from "@/lib/trackinghub/sample-data";

export default async function ProjectsPage() {
  let workbench = {
    summaryCards: projectSummaryCards,
    projects: projectItems,
    environments: projectEnvironmentItems,
    sdkKeys: sdkKeyItems,
  };

  try {
    workbench = mapProjectsOverviewToWorkbench(
      await defaultMetadataStore.listProjectsOverview(),
    );
  } catch {
    // Keep the local seed view usable when Postgres is not configured.
  }

  return (
    <AppShell activeHref="/projects">
      <PageHeader
        description={pageShells.projects.description}
        eyebrow={pageShells.projects.eyebrow}
        title={pageShells.projects.title}
      />
      <div className="mt-6">
        <ProjectManagementWorkbench
          environments={workbench.environments}
          projects={workbench.projects}
          sdkKeys={workbench.sdkKeys}
          summaryCards={workbench.summaryCards}
        />
      </div>
    </AppShell>
  );
}
