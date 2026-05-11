import { AppShell } from "@/components/trackinghub/app-shell";
import { EventDictionaryEditor } from "@/components/trackinghub/event-dictionary-editor";
import { GovernanceWorkbench } from "@/components/trackinghub/governance-workbench";
import { PageHeader } from "@/components/trackinghub/page-header";
import { getCurrentUserFromCookieHeader } from "@/lib/api/auth";
import { assertCanRead } from "@/lib/auth/permissions";
import { defaultMetadataStore } from "@/lib/metadata/default-metadata-store";
import { getPostgresConnectionString } from "@/lib/metadata/postgres";
import { mapGovernanceOverviewToWorkbench } from "@/lib/trackinghub/governance-api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { pageShells } from "@/lib/trackinghub/page-shells";

export const dynamic = "force-dynamic";

async function getGovernanceWorkbench() {
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
      eventDetail: {
        eventName: "暂无事件",
        displayName: "暂无事件",
        businessGoal: "连接 Postgres 后展示真实事件定义。",
        triggerTiming: "连接 Postgres 后展示触发时机。",
        platforms: [],
        requiredProperties: [],
        recentSamples: [],
      },
      acceptanceChecks: [],
      editableDefinitions: [],
    };
  }

  const user = await getCurrentUserFromCookieHeader(
    (await headers()).get("cookie"),
  );
  if (!user) {
    redirect("/login");
  }

  assertCanRead(user);

  return mapGovernanceOverviewToWorkbench(
    await defaultMetadataStore.listEventDefinitions(),
  );
}

export default async function GovernancePage() {
  const workbench = await getGovernanceWorkbench();

  return (
    <AppShell activeHref="/governance">
      <PageHeader
        description={pageShells.governance.description}
        eyebrow={pageShells.governance.eyebrow}
        title={pageShells.governance.title}
      />
      <div className="mt-6">
        <GovernanceWorkbench
          acceptanceChecks={workbench.acceptanceChecks}
          eventDetail={workbench.eventDetail}
          events={workbench.events}
          summaryCards={workbench.summaryCards}
        />
      </div>
      <div className="mt-6">
        <EventDictionaryEditor definitions={workbench.editableDefinitions} />
      </div>
    </AppShell>
  );
}
