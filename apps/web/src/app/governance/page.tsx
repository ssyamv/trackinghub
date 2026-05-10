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
import {
  editableEventDefinitions,
  eventDictionaryItems,
  featuredEventDetail,
  governanceAcceptanceChecks,
  governanceSummaryCards,
  pageShells,
} from "@/lib/trackinghub/sample-data";

export const dynamic = "force-dynamic";

async function getGovernanceWorkbench() {
  if (!getPostgresConnectionString()) {
    return {
      summaryCards: governanceSummaryCards,
      events: eventDictionaryItems,
      eventDetail: featuredEventDetail,
      acceptanceChecks: governanceAcceptanceChecks,
      editableDefinitions: editableEventDefinitions,
    };
  }

  const user = await getCurrentUserFromCookieHeader(
    (await headers()).get("cookie"),
  );
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
