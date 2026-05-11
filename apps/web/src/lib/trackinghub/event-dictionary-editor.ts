export type EventDefinitionStatus =
  | "draft"
  | "ready"
  | "released"
  | "accepted"
  | "deprecated";

export type EditableEventPropertyDefinition = {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required: boolean;
  description: string;
  exampleValue: string | number | boolean | null;
};

export type EditableEventDefinition = {
  id: string;
  eventName: string;
  displayName: string;
  description: string;
  triggerTiming?: string;
  module?: string;
  platforms: string[];
  requiredProperties: string[];
  requiredPropertyDefinitions?: EditableEventPropertyDefinition[];
  status: EventDefinitionStatus;
};

export type EventDefinitionEditDraft = {
  displayName: string;
  description: string;
  triggerTiming: string;
  module: string;
  platforms: string;
  requiredProperties: string;
  status: EventDefinitionStatus;
};

export function parseEventPropertyNames(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function defaultPropertyDefinition(
  name: string,
): EditableEventPropertyDefinition {
  return {
    name,
    type: "string",
    required: true,
    description: "",
    exampleValue: null,
  };
}

export function buildEventDefinitionPatchPayload(
  draft: EventDefinitionEditDraft,
  fallback?: EditableEventDefinition,
) {
  const fallbackProperties = new Map(
    (fallback?.requiredPropertyDefinitions ?? []).map((property) => [
      property.name,
      property,
    ]),
  );

  return {
    displayName: draft.displayName.trim(),
    description: draft.description.trim(),
    triggerTiming: draft.triggerTiming.trim(),
    module: draft.module.trim(),
    platforms: draft.platforms
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter((item): item is "web" | "flutter" =>
        item === "web" || item === "flutter",
      ),
    requiredProperties: parseEventPropertyNames(draft.requiredProperties).map(
      (name) => fallbackProperties.get(name) ?? defaultPropertyDefinition(name),
    ),
    status: draft.status,
  };
}

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
