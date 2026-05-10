import type { TrackingEnvelope } from "./envelope";
import type { PersistedValidationResult } from "./schema-validation";

export type PersistedTrackingEvent = TrackingEnvelope & {
  event_id: string;
  received_at: string;
};

export type EventWriter = {
  writeRawEvent(event: PersistedTrackingEvent): Promise<void>;
  writeValidationResult(result: PersistedValidationResult): Promise<void>;
};

type FetchLike = typeof fetch;

type EventWriterEnv = Record<string, string | undefined>;

const RAW_EVENTS_COLUMNS = [
  "event_id",
  "project_id",
  "environment",
  "source",
  "event_name",
  "user_id",
  "anonymous_id",
  "device_id",
  "session_id",
  "timestamp",
  "received_at",
  "app_version",
  "sdk_version",
  "channel",
  "campaign",
  "country",
  "properties",
  "context",
].join(", ");

const VALIDATION_RESULT_COLUMNS = [
  "id",
  "project_id",
  "event_definition_id",
  "event_name",
  "environment",
  "source",
  "status",
  "errors",
  "sample_event_id",
  "observed_at",
].join(", ");

const noopEventWriter: EventWriter = {
  async writeRawEvent() {
    return undefined;
  },
  async writeValidationResult() {
    return undefined;
  },
};

function nullable(value: string | undefined) {
  return value ?? null;
}

function toClickHouseRow(event: PersistedTrackingEvent) {
  return {
    event_id: event.event_id,
    project_id: event.project_id,
    environment: event.environment,
    source: event.source,
    event_name: event.event_name,
    user_id: nullable(event.user_id),
    anonymous_id: nullable(event.anonymous_id),
    device_id: nullable(event.device_id),
    session_id: nullable(event.session_id),
    timestamp: new Date(event.timestamp).toISOString(),
    received_at: event.received_at,
    app_version: nullable(event.app_version),
    sdk_version: event.sdk_version,
    channel: nullable(event.channel),
    campaign: nullable(event.campaign),
    country: nullable(event.country),
    properties: JSON.stringify(event.properties),
    context: JSON.stringify(event.context),
  };
}

function toValidationResultRow(result: PersistedValidationResult) {
  return {
    id: result.id,
    project_id: result.project_id,
    event_definition_id: result.event_definition_id,
    event_name: result.event_name,
    environment: result.environment,
    source: result.source,
    status: result.status,
    errors: JSON.stringify(result.errors),
    sample_event_id: result.sample_event_id,
    observed_at: result.observed_at,
  };
}

function buildClickHouseUrl(
  baseUrl: string,
  database: string | undefined,
  query: string,
) {
  const url = new URL(baseUrl);
  url.searchParams.set("query", query);

  if (database) {
    url.searchParams.set("database", database);
  }

  return url;
}

function buildHeaders(username: string | undefined, password: string | undefined) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (username && password) {
    headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString(
      "base64",
    )}`;
  }

  return headers;
}

export function createEventWriterFromEnv(
  env: EventWriterEnv = process.env,
  fetchImpl: FetchLike = fetch,
): EventWriter {
  const clickHouseUrl =
    env.TRACKINGHUB_CLICKHOUSE_URL ?? env.CLICKHOUSE_URL;

  if (!clickHouseUrl) {
    return noopEventWriter;
  }

  const database =
    env.TRACKINGHUB_CLICKHOUSE_DATABASE ?? env.CLICKHOUSE_DATABASE;
  const username =
    env.TRACKINGHUB_CLICKHOUSE_USERNAME ?? env.CLICKHOUSE_USERNAME;
  const password =
    env.TRACKINGHUB_CLICKHOUSE_PASSWORD ?? env.CLICKHOUSE_PASSWORD;

  return {
    async writeRawEvent(event) {
      const url = buildClickHouseUrl(
        clickHouseUrl,
        database,
        `INSERT INTO raw_events (${RAW_EVENTS_COLUMNS}) FORMAT JSONEachRow`,
      );
      const response = await fetchImpl(url, {
        method: "POST",
        headers: buildHeaders(username, password),
        body: `${JSON.stringify(toClickHouseRow(event))}\n`,
      });

      if (!response.ok) {
        throw new Error(`ClickHouse raw_events insert failed: ${response.status}`);
      }
    },
    async writeValidationResult(result) {
      const url = buildClickHouseUrl(
        clickHouseUrl,
        database,
        `INSERT INTO event_validation_results (${VALIDATION_RESULT_COLUMNS}) FORMAT JSONEachRow`,
      );
      const response = await fetchImpl(url, {
        method: "POST",
        headers: buildHeaders(username, password),
        body: `${JSON.stringify(toValidationResultRow(result))}\n`,
      });

      if (!response.ok) {
        throw new Error(
          `ClickHouse event_validation_results insert failed: ${response.status}`,
        );
      }
    },
  };
}
