import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  EventDictionaryItem,
  GovernanceAcceptanceCheck,
  StatusCard,
} from "@/lib/trackinghub/types";
import type { EditableEventDefinition } from "@/lib/trackinghub/event-dictionary-editor";
import {
  GovernanceEventDictionary,
  type GovernanceDictionaryFilters,
} from "./governance-event-dictionary";
import { MetricCard } from "./metric-card";
import { StatusBadge } from "./status-badge";

export type { GovernanceDictionaryFilters } from "./governance-event-dictionary";

export type GovernanceWorkbenchProps = {
  summaryCards: StatusCard[];
  events: EventDictionaryItem[];
  editableDefinitions?: EditableEventDefinition[];
  acceptanceChecks: GovernanceAcceptanceCheck[];
  dictionaryFilters?: GovernanceDictionaryFilters;
  projectOptions?: { id: string; name: string }[];
  selectedProjectId?: string;
};

export function GovernanceWorkbench({
  summaryCards,
  events,
  editableDefinitions = [],
  acceptanceChecks,
  dictionaryFilters,
  projectOptions = [],
  selectedProjectId = "",
}: GovernanceWorkbenchProps) {
  const problemChecks = acceptanceChecks.filter(
    (check) => check.tone !== "success",
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => (
          <MetricCard
            detail={item.detail}
            key={item.label}
            label={item.label}
            tone={item.tone}
            value={item.value}
          />
        ))}
      </section>

      <GovernanceEventDictionary
        editableDefinitions={editableDefinitions}
        events={events}
        initialFilters={dictionaryFilters}
        projectOptions={projectOptions}
        selectedProjectId={selectedProjectId}
      />

      {problemChecks.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">待处理问题</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {problemChecks.map((check) => (
              <div
                className="rounded-lg border border-border bg-background p-4"
                key={check.label}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold">{check.label}</div>
                  <StatusBadge className="shrink-0" tone={check.tone}>
                    {check.tone === "success"
                      ? "通过"
                      : check.tone === "warning"
                        ? "待确认"
                        : "需修复"}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {check.detail}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
