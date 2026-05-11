import type { GovernanceWorkbenchProps } from "@/components/trackinghub/governance-workbench";
import type { EditableEventDefinition } from "@/lib/trackinghub/event-dictionary-editor";
import type {
  EventDefinitionStatus,
  EventValidationResultRecord,
  GovernanceOverview,
  PlatformSource,
} from "@/lib/metadata/metadata-store";

type GovernanceWorkbenchData = GovernanceWorkbenchProps & {
  editableDefinitions: EditableEventDefinition[];
};

function sourceLabel(source: PlatformSource) {
  return source === "web" ? "Web" : "Flutter";
}

function platformLabel(platforms: PlatformSource[]) {
  if (platforms.length === 0) {
    return "未配置";
  }

  return platforms.map(sourceLabel).join(" + ");
}

function statusLabel(status: EventDefinitionStatus) {
  if (status === "accepted") {
    return "已验收";
  }

  if (status === "ready") {
    return "待验收";
  }

  if (status === "deprecated") {
    return "已弃用";
  }

  return "草稿";
}

function statusTone(status: EventDefinitionStatus) {
  if (status === "accepted") {
    return "success" as const;
  }

  if (status === "deprecated") {
    return "danger" as const;
  }

  return "warning" as const;
}

function validationErrorDetail(result: EventValidationResultRecord) {
  return result.errors.length > 0 ? result.errors.join("；") : "样本通过";
}

function validationStatusTone(status: EventValidationResultRecord["status"]) {
  return status === "valid" ? ("success" as const) : ("danger" as const);
}

function formatDateTime(value: string | null | undefined) {
  if (!value || value === "暂无") {
    return "暂无";
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);

  if (!match) {
    return value;
  }

  return `${match[2]}-${match[3]} ${match[4]}:${match[5]}`;
}

export function mapGovernanceOverviewToWorkbench(
  overview: GovernanceOverview,
): GovernanceWorkbenchData {
  const first = overview.definitions[0];
  const validationResults = [...(overview.validationResults ?? [])].sort(
    (left, right) => right.observedAt.localeCompare(left.observedAt),
  );
  const schemaAnomalies = validationResults.filter(
    (result) => result.status !== "valid",
  );
  const latest = validationResults[0];
  const firstAnomaly = schemaAnomalies[0];

  return {
    summaryCards: [
      {
        label: "治理事件",
        value: String(overview.definitions.length),
        detail: "来自 Postgres 事件字典",
        tone: "blue",
      },
      {
        label: "待验收",
        value: String(
          overview.definitions.filter((item) => item.status === "ready").length,
        ),
        detail: "ready 状态事件",
        tone: "green",
      },
      {
        label: "Schema 异常",
        value: String(schemaAnomalies.length),
        detail: firstAnomaly
          ? `${firstAnomaly.eventName}：${validationErrorDetail(firstAnomaly)}`
          : "最近样本均通过",
        tone: "red",
      },
      {
        label: "最近接收",
        value: formatDateTime(latest?.observedAt ?? first?.lastSeenAt),
        detail: latest
          ? `${latest.eventName} / ${latest.environment}`
          : first?.name ?? "暂无事件",
        tone: "purple",
      },
    ],
    events: overview.definitions.map((definition) => ({
      id: definition.id,
      eventName: definition.name,
      displayName: definition.displayName,
      project: definition.projectName,
      platforms: platformLabel(definition.platforms),
      environment: "按环境验证",
      owner: definition.module || "未分配",
      status: statusLabel(definition.status),
      statusTone: statusTone(definition.status),
      lastSeen: formatDateTime(definition.lastSeenAt),
    })),
    acceptanceChecks: schemaAnomalies.map((result) => ({
      label: `${result.eventName} / ${result.status}`,
      detail: validationErrorDetail(result),
      tone: validationStatusTone(result.status),
    })),
    editableDefinitions: overview.definitions.map((definition) => ({
      id: definition.id,
      eventName: definition.name,
      displayName: definition.displayName,
      description: definition.description,
      triggerTiming: definition.triggerTiming,
      module: definition.module,
      platforms: definition.platforms.map(sourceLabel),
      requiredProperties: definition.requiredProperties.map(
        (property) => property.name,
      ),
      requiredPropertyDefinitions: definition.requiredProperties,
      status: definition.status,
    })),
  };
}
