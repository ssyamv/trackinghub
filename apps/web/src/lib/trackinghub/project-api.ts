import type { ProjectManagementWorkbenchProps } from "@/components/trackinghub/project-management-workbench";
import type {
  PlatformSource,
  ProjectsOverview,
  SdkKeyStatus,
} from "@/lib/metadata/metadata-store";

function sourceLabel(source: PlatformSource) {
  return source === "web" ? "Web" : "Flutter";
}

function platformLabel(platforms: PlatformSource[]) {
  if (platforms.length === 0) {
    return "未配置";
  }

  return platforms.map(sourceLabel).join(" + ");
}

function sdkStatusLabel(status: SdkKeyStatus) {
  return status === "active"
    ? "启用"
    : status === "rotating"
      ? "轮换中"
      : "停用";
}

function environmentWriteKeyStatus(
  overview: ProjectsOverview,
  projectId: string,
  environmentName: string,
) {
  const matchingKeys = overview.sdkKeys.filter(
    (key) => key.projectId === projectId && key.environment === environmentName,
  );

  if (matchingKeys.some((key) => key.status === "active")) {
    return "启用";
  }

  if (matchingKeys.some((key) => key.status === "rotating")) {
    return "轮换中";
  }

  return "停用";
}

function isProductionEnvironment(environmentName: string) {
  return environmentName === "prod" || environmentName === "production";
}

export function mapProjectsOverviewToWorkbench(
  overview: ProjectsOverview,
): ProjectManagementWorkbenchProps {
  return {
    summaryCards: [
      {
        label: "项目总数",
        value: String(overview.projects.length),
        detail: "来自 Postgres 元数据",
        tone: "blue",
      },
      {
        label: "生产环境",
        value: String(
          overview.environments.filter(
            (item) => isProductionEnvironment(item.name) && item.enabled,
          ).length,
        ),
        detail: "已启用生产环境",
        tone: "green",
      },
      {
        label: "启用 SDK Key",
        value: String(
          overview.sdkKeys.filter((item) => item.status === "active").length,
        ),
        detail: "按来源区分 Web / Flutter",
        tone: "purple",
      },
      {
        label: "待处理接入",
        value: String(
          overview.sdkKeys.filter((item) => item.status !== "active").length,
        ),
        detail: "轮换或停用 Key",
        tone: "red",
      },
    ],
    projects: overview.projects.map((project) => ({
      name: project.name,
      slug: project.slug,
      description: project.description,
      platforms: platformLabel(project.platforms),
      status: project.status === "active" ? "运行中" : "停用",
      owner: project.ownerName,
      events: "等待事件字典关联",
    })),
    environments: overview.environments.map((environment) => ({
      project: environment.projectName,
      name: environment.name,
      enabled: environment.enabled,
      lastEventAt: environment.lastEventAt ?? "暂无",
      writeKeyStatus: environmentWriteKeyStatus(
        overview,
        environment.projectId,
        environment.name,
      ),
    })),
    sdkKeys: overview.sdkKeys.map((key) => ({
      id: key.id,
      project: key.projectName,
      environment: key.environment,
      source: sourceLabel(key.source),
      maskedKey: key.maskedKey,
      status: sdkStatusLabel(key.status),
      lastUsed: key.lastUsedAt ?? "暂无",
    })),
  };
}
