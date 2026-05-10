export type EventDefinitionStatus =
  | "draft"
  | "ready"
  | "released"
  | "accepted"
  | "deprecated";

export type EditableEventDefinition = {
  id: string;
  eventName: string;
  displayName: string;
  description: string;
  platforms: string[];
  requiredProperties: string[];
  status: EventDefinitionStatus;
};

export type EventDictionaryAction =
  | { type: "create"; definition: EditableEventDefinition }
  | {
      type: "update";
      id: string;
      changes: Partial<Omit<EditableEventDefinition, "id">>;
    }
  | { type: "transition"; id: string; status: EventDefinitionStatus }
  | { type: "delete"; id: string };

export function applyEventDictionaryAction(
  definitions: EditableEventDefinition[],
  action: EventDictionaryAction,
) {
  if (action.type === "create") {
    return [...definitions, action.definition];
  }

  if (action.type === "delete") {
    return definitions.map((definition) =>
      definition.id === action.id
        ? { ...definition, status: "deprecated" as const }
        : definition,
    );
  }

  if (action.type === "transition") {
    return definitions.map((definition) =>
      definition.id === action.id
        ? { ...definition, status: action.status }
        : definition,
    );
  }

  return definitions.map((definition) =>
    definition.id === action.id
      ? { ...definition, ...action.changes }
      : definition,
  );
}
