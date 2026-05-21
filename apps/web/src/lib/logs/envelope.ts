import type { JsonObject, TrackingEnvironment, TrackingSource } from "@/lib/tracking/envelope";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export type LogEnvelope = {
  project_id: string;
  environment: TrackingEnvironment;
  source: TrackingSource;
  level: LogLevel;
  message: string;
  logger?: string;
  user_id?: string;
  anonymous_id?: string;
  device_id?: string;
  session_id?: string;
  timestamp: number;
  app_version?: string;
  sdk_version: string;
  channel?: string;
  country?: string;
  trace_id?: string;
  error_name?: string;
  error_message?: string;
  stack?: string;
  attributes: JsonObject;
  context: JsonObject;
};

export type LogValidationResult =
  | { ok: true; value: LogEnvelope }
  | { ok: false; errors: string[] };

const REQUIRED_STRING_FIELDS = [
  "project_id",
  "environment",
  "source",
  "level",
  "message",
  "sdk_version",
] as const;

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function isAllowedEnvironment(value: unknown): value is TrackingEnvironment {
  return (
    value === "dev" ||
    value === "staging" ||
    value === "prod" ||
    value === "test" ||
    value === "develop" ||
    value === "production"
  );
}

function isAllowedSource(value: unknown): value is TrackingSource {
  return value === "web" || value === "flutter";
}

function isAllowedLevel(value: unknown): value is LogLevel {
  return (
    value === "debug" ||
    value === "info" ||
    value === "warn" ||
    value === "error" ||
    value === "fatal"
  );
}

export function validateLogEnvelope(input: unknown): LogValidationResult {
  if (!isRecord(input)) {
    return { ok: false, errors: ["payload must be an object"] };
  }

  const errors: string[] = [];

  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof input[field] !== "string" || input[field].trim() === "") {
      errors.push(`${field} is required`);
    }
  }

  if (typeof input.environment === "string" && !isAllowedEnvironment(input.environment)) {
    errors.push("environment must be one of dev, staging, prod, test, develop, production");
  }

  if (typeof input.source === "string" && !isAllowedSource(input.source)) {
    errors.push("source must be one of web, flutter");
  }

  if (typeof input.level === "string" && !isAllowedLevel(input.level)) {
    errors.push("level must be one of debug, info, warn, error, fatal");
  }

  if (!Number.isFinite(input.timestamp)) {
    errors.push("timestamp must be an epoch millisecond number");
  }

  if (!isRecord(input.attributes)) {
    errors.push("attributes must be an object");
  }

  if (!isRecord(input.context)) {
    errors.push("context must be an object");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: input as LogEnvelope };
}
