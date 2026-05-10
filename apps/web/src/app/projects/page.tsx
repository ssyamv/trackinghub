import { AppShell } from "@/components/trackinghub/app-shell";
import { PageHeader } from "@/components/trackinghub/page-header";
import { ProjectManagementWorkbench } from "@/components/trackinghub/project-management-workbench";
import { getCurrentUserFromCookieHeader } from "@/lib/api/auth";
import { assertCanRead } from "@/lib/auth/permissions";
import { defaultMetadataStore } from "@/lib/metadata/default-metadata-store";
import { getPostgresConnectionString } from "@/lib/metadata/postgres";
import { mapProjectsOverviewToWorkbench } from "@/lib/trackinghub/project-api";
import { headers } from "next/headers";
import {
  pageShells,
  projectEnvironmentItems,
  projectItems,
  projectSummaryCards,
  sdkKeyItems,
} from "@/lib/trackinghub/sample-data";

export const dynamic = "force-dynamic";

async function getProjectsWorkbench() {
  if (!getPostgresConnectionString()) {
    return {
      summaryCards: projectSummaryCards,
      projects: projectItems,
      environments: projectEnvironmentItems,
      sdkKeys: sdkKeyItems,
    };
  }

  const user = await getCurrentUserFromCookieHeader(
    (await headers()).get("cookie"),
  );
  assertCanRead(user);

  return mapProjectsOverviewToWorkbench(
    await defaultMetadataStore.listProjectsOverview(),
  );
}

export default async function ProjectsPage() {
  const workbench = await getProjectsWorkbench();

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
