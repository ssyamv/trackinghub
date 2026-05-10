import { AppShell } from "@/components/trackinghub/app-shell";
import { EventDictionaryEditor } from "@/components/trackinghub/event-dictionary-editor";
import { GovernanceWorkbench } from "@/components/trackinghub/governance-workbench";
import { PageHeader } from "@/components/trackinghub/page-header";
import { defaultMetadataStore } from "@/lib/metadata/default-metadata-store";
import { mapGovernanceOverviewToWorkbench } from "@/lib/trackinghub/governance-api";
import {
  editableEventDefinitions,
  eventDictionaryItems,
  featuredEventDetail,
  governanceAcceptanceChecks,
  governanceSummaryCards,
  pageShells,
} from "@/lib/trackinghub/sample-data";

export default async function GovernancePage() {
  let workbench = {
    summaryCards: governanceSummaryCards,
    events: eventDictionaryItems,
    eventDetail: featuredEventDetail,
    acceptanceChecks: governanceAcceptanceChecks,
    editableDefinitions: editableEventDefinitions,
  };

  try {
    workbench = mapGovernanceOverviewToWorkbench(
      await defaultMetadataStore.listEventDefinitions(),
    );
  } catch {
    // Keep the local seed view usable when Postgres is not configured.
  }

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
