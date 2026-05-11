import { AppShell } from "@/components/trackinghub/app-shell";
import {
  GovernanceWorkbench,
  type GovernanceDictionaryFilters,
} from "@/components/trackinghub/governance-workbench";
import { PageHeader } from "@/components/trackinghub/page-header";
import { getCurrentUserFromCookieHeader } from "@/lib/api/auth";
import { assertCanRead } from "@/lib/auth/permissions";
import { defaultMetadataStore } from "@/lib/metadata/default-metadata-store";
import type { GovernanceOverview } from "@/lib/metadata/metadata-store";
import { getPostgresConnectionString } from "@/lib/metadata/postgres";
import { mapGovernanceOverviewToWorkbench } from "@/lib/trackinghub/governance-api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { pageShells } from "@/lib/trackinghub/page-shells";

export const dynamic = "force-dynamic";

type GovernancePageProps = {
  searchParams?:
    | Partial<{
        page: unknown;
        page_size: unknown;
        platform: unknown;
        project_id: unknown;
        q: unknown;
        status: unknown;
      }>
    | Promise<
        Partial<{
          page: unknown;
          page_size: unknown;
          platform: unknown;
          project_id: unknown;
          q: unknown;
          status: unknown;
        }>
      >;
};

function firstValue(value: unknown) {
  if (Array.isArray(value)) {
    return firstValue(value[0]);
  }

  return typeof value === "string" ? value.trim() : undefined;
}

function normalizeGovernanceDictionaryFilters(
  input: Awaited<NonNullable<GovernancePageProps["searchParams"]>> = {},
): GovernanceDictionaryFilters {
  const page = Number(firstValue(input.page));
  const pageSize = Number(firstValue(input.page_size));
  const platform = firstValue(input.platform);
  const status = firstValue(input.status);

  return {
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    pageSize:
      Number.isFinite(pageSize) && pageSize > 0
        ? Math.min(200, Math.max(1, Math.floor(pageSize)))
        : 25,
    platform:
      platform === "web" || platform === "flutter" ? platform : "all",
    query: firstValue(input.q) ?? "",
    status:
      status === "草稿" ||
      status === "待验收" ||
      status === "已发布" ||
      status === "已验收" ||
      status === "已弃用"
        ? status
        : "all",
  };
}

function filterGovernanceOverviewByProject(
  overview: GovernanceOverview,
  projectId: string | undefined,
): GovernanceOverview {
  if (!projectId) {
    return overview;
  }

  return {
    definitions: overview.definitions.filter(
      (definition) => definition.projectId === projectId,
    ),
    validationResults: overview.validationResults?.filter(
      (result) => result.projectId === projectId,
    ),
  };
}

async function getGovernanceWorkbench(projectId: string | undefined) {
  if (!getPostgresConnectionString()) {
    return {
      summaryCards: [
        {
          label: "治理事件",
          value: "0",
          detail: "未配置 Postgres 事件字典",
          tone: "blue" as const,
        },
        {
          label: "待验收",
          value: "0",
          detail: "未读取到真实事件定义",
          tone: "green" as const,
        },
        {
          label: "Schema 异常",
          value: "0",
          detail: "未读取到真实验证结果",
          tone: "red" as const,
        },
        {
          label: "最近接收",
          value: "暂无",
          detail: "未读取到真实样本",
          tone: "purple" as const,
        },
      ],
      events: [],
      acceptanceChecks: [],
      editableDefinitions: [],
      projectOptions: [],
    };
  }

  const user = await getCurrentUserFromCookieHeader(
    (await headers()).get("cookie"),
  );
  if (!user) {
    redirect("/login");
  }

  assertCanRead(user);

  const [overview, projectsOverview] = await Promise.all([
    defaultMetadataStore.listEventDefinitions(),
    defaultMetadataStore.listProjectsOverview(),
  ]);

  return {
    ...mapGovernanceOverviewToWorkbench(
      filterGovernanceOverviewByProject(overview, projectId),
    ),
    projectOptions: projectsOverview.projects.map((project) => ({
      id: project.id,
      name: project.name,
    })),
  };
}

export default async function GovernancePage({ searchParams }: GovernancePageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const dictionaryFilters = normalizeGovernanceDictionaryFilters(params);
  const workbench = await getGovernanceWorkbench(firstValue(params.project_id));

  return (
    <AppShell activeHref="/governance">
      <PageHeader
        eyebrow={pageShells.governance.eyebrow}
        title={pageShells.governance.title}
      />
      <div className="mt-6">
        <GovernanceWorkbench
          acceptanceChecks={workbench.acceptanceChecks}
          dictionaryFilters={dictionaryFilters}
          editableDefinitions={workbench.editableDefinitions}
          events={workbench.events}
          projectOptions={workbench.projectOptions}
          selectedProjectId={firstValue(params.project_id) ?? ""}
          summaryCards={workbench.summaryCards}
        />
      </div>
    </AppShell>
  );
}
