import { AppShell } from "@/components/trackinghub/app-shell";
import { EventDictionaryEditor } from "@/components/trackinghub/event-dictionary-editor";
import { GovernanceWorkbench } from "@/components/trackinghub/governance-workbench";
import { PageHeader } from "@/components/trackinghub/page-header";
import {
  editableEventDefinitions,
  eventDictionaryItems,
  featuredEventDetail,
  governanceAcceptanceChecks,
  governanceSummaryCards,
  pageShells,
} from "@/lib/trackinghub/sample-data";

export default function GovernancePage() {
  return (
    <AppShell activeHref="/governance">
      <PageHeader
        description={pageShells.governance.description}
        eyebrow={pageShells.governance.eyebrow}
        title={pageShells.governance.title}
      />
      <div className="mt-6">
        <GovernanceWorkbench
          acceptanceChecks={governanceAcceptanceChecks}
          eventDetail={featuredEventDetail}
          events={eventDictionaryItems}
          summaryCards={governanceSummaryCards}
        />
      </div>
      <div className="mt-6">
        <EventDictionaryEditor definitions={editableEventDefinitions} />
      </div>
    </AppShell>
  );
}
