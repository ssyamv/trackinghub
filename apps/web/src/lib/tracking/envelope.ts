export type TrackingSource = "web" | "flutter";
export type TrackingEnvironment = "dev" | "staging" | "prod";
export type JsonObject = Record<string, unknown>;

export type TrackingEnvelope = {
  project_id: string;
  environment: TrackingEnvironment;
  source: TrackingSource;
  event_name: string;
  user_id?: string;
  anonymous_id?: string;
  device_id?: string;
  session_id?: string;
  timestamp: number;
  app_version?: string;
  sdk_version: string;
  channel?: string;
  campaign?: string;
  country?: string;
  properties: JsonObject;
  context: JsonObject;
};

export type ValidationResult =
  | { ok: true; value: TrackingEnvelope }
  | { ok: false; errors: string[] };

const REQUIRED_STRING_FIELDS = [
  "project_id",
  "environment",
  "source",
  "event_name",
  "sdk_version",
] as const;

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function isAllowedEnvironment(value: unknown): value is TrackingEnvironment {
  return value === "dev" || value === "staging" || value === "prod";
}

function isAllowedSource(value: unknown): value is TrackingSource {
  return value === "web" || value === "flutter";
}

export function validateTrackingEnvelope(input: unknown): ValidationResult {
  if (!isRecord(input)) {
    return { ok: false, errors: ["payload must be an object"] };
  }

  const errors: string[] = [];

  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof input[field] !== "string" || input[field].trim() === "") {
      errors.push(`${field} is required`);
    }
  }

  if (typeof input.source === "string" && !isAllowedSource(input.source)) {
    errors.push("source must be one of web, flutter");
  }

  if (
    typeof input.environment === "string" &&
    !isAllowedEnvironment(input.environment)
  ) {
    errors.push("environment must be one of dev, staging, prod");
  }

  if (!Number.isFinite(input.timestamp)) {
    errors.push("timestamp must be an epoch millisecond number");
  }

  if (!isRecord(input.properties)) {
    errors.push("properties must be an object");
  }

  if (!isRecord(input.context)) {
    errors.push("context must be an object");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: input as TrackingEnvelope };
}
