import type { TrackingEnvelope } from "./envelope";

export type ValidationStatus = "valid" | "invalid" | "unknown_event";

export type PersistedValidationResult = {
  id: string;
  project_id: string;
  event_definition_id: string | null;
  event_name: string;
  environment: TrackingEnvelope["environment"];
  source: TrackingEnvelope["source"];
  status: ValidationStatus;
  errors: string[];
  sample_event_id: string;
  observed_at: string;
};

type PropertySchema = {
  name: string;
  type: "string" | "number" | "boolean";
};

type EventSchema = {
  eventDefinitionId: string;
  requiredProperties: PropertySchema[];
};

const EVENT_SCHEMAS: Record<string, EventSchema> = {
  pay_button_click: {
    eventDefinitionId: "pay_button_click",
    requiredProperties: [
      { name: "product_id", type: "string" },
      { name: "price", type: "number" },
      { name: "currency", type: "string" },
      { name: "source_page", type: "string" },
    ],
  },
  campaign_card_view: {
    eventDefinitionId: "campaign_card_view",
    requiredProperties: [{ name: "campaign_id", type: "string" }],
  },
  subscription_success: {
    eventDefinitionId: "subscription_success",
    requiredProperties: [
      { name: "plan_id", type: "string" },
      { name: "amount", type: "number" },
      { name: "currency", type: "string" },
    ],
  },
  onboarding_finish: {
    eventDefinitionId: "onboarding_finish",
    requiredProperties: [{ name: "step_count", type: "number" }],
  },
};

function typeOfProperty(value: unknown) {
  if (typeof value === "string") {
    return "string";
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return "number";
  }

  if (typeof value === "boolean") {
    return "boolean";
  }

  return "unknown";
}

export function validateEventSchema(
  event: TrackingEnvelope,
  sampleEventId: string,
  observedAt: string,
): PersistedValidationResult {
  const schema = EVENT_SCHEMAS[event.event_name];

  if (!schema) {
    return {
      id: `validation_${sampleEventId}`,
      project_id: event.project_id,
      event_definition_id: null,
      event_name: event.event_name,
      environment: event.environment,
      source: event.source,
      status: "unknown_event",
      errors: ["event definition not found"],
      sample_event_id: sampleEventId,
      observed_at: observedAt,
    };
  }

  const errors: string[] = [];

  for (const property of schema.requiredProperties) {
    const value = event.properties[property.name];

    if (value === undefined || value === null || value === "") {
      errors.push(`${property.name} is required`);
      continue;
    }

    if (typeOfProperty(value) !== property.type) {
      errors.push(`${property.name} must be ${property.type}`);
    }
  }

  return {
    id: `validation_${sampleEventId}`,
    project_id: event.project_id,
    event_definition_id: schema.eventDefinitionId,
    event_name: event.event_name,
    environment: event.environment,
    source: event.source,
    status: errors.length > 0 ? "invalid" : "valid",
    errors,
    sample_event_id: sampleEventId,
    observed_at: observedAt,
  };
}
