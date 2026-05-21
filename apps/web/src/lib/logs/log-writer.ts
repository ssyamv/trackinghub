import type { LogEnvelope } from "./envelope";
import { RAW_LOGS_TABLE_SQL } from "./schema";

export type PersistedLog = LogEnvelope & {
  log_id: string;
  received_at: string;
};

export type LogWriter = {
  writeLog(log: PersistedLog): Promise<void>;
};

type FetchLike = typeof fetch;
type LogWriterEnv = Record<string, string | undefined>;

const RAW_LOGS_COLUMNS = [
  "log_id",
  "project_id",
  "environment",
  "source",
  "level",
  "message",
  "logger",
  "user_id",
  "anonymous_id",
  "device_id",
  "session_id",
  "timestamp",
  "received_at",
  "app_version",
  "sdk_version",
  "channel",
  "country",
  "trace_id",
  "error_name",
  "error_message",
  "stack",
  "attributes",
  "context",
].join(", ");

const noopLogWriter: LogWriter = {
  async writeLog() {
    return undefined;
  },
};

const unavailableLogWriter: LogWriter = {
  async writeLog() {
    throw new Error("ClickHouse log persistence is not configured");
  },
};

function requiresLogPersistence(env: LogWriterEnv) {
  return (
    env.NODE_ENV === "production" ||
    env.TRACKINGHUB_REQUIRE_EVENT_PERSISTENCE === "true" ||
    env.TRACKINGHUB_REQUIRE_LOG_PERSISTENCE === "true"
  );
}

function nullable(value: string | undefined) {
  return value ?? null;
}

function toClickHouseDateTime64(value: number | string) {
  return new Date(value).toISOString().replace("T", " ").replace("Z", "");
}

function toClickHouseRow(log: PersistedLog) {
  return {
    log_id: log.log_id,
    project_id: log.project_id,
    environment: log.environment,
    source: log.source,
    level: log.level,
    message: log.message,
    logger: nullable(log.logger),
    user_id: nullable(log.user_id),
    anonymous_id: nullable(log.anonymous_id),
    device_id: nullable(log.device_id),
    session_id: nullable(log.session_id),
    timestamp: toClickHouseDateTime64(log.timestamp),
    received_at: toClickHouseDateTime64(log.received_at),
    app_version: nullable(log.app_version),
    sdk_version: log.sdk_version,
    channel: nullable(log.channel),
    country: nullable(log.country),
    trace_id: nullable(log.trace_id),
    error_name: nullable(log.error_name),
    error_message: nullable(log.error_message),
    stack: nullable(log.stack),
    attributes: JSON.stringify(log.attributes),
    context: JSON.stringify(log.context),
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

export function createLogWriterFromEnv(
  env: LogWriterEnv = process.env,
  fetchImpl: FetchLike = fetch,
): LogWriter {
  const clickHouseUrl =
    env.TRACKINGHUB_CLICKHOUSE_URL ?? env.CLICKHOUSE_URL;

  if (!clickHouseUrl) {
    return requiresLogPersistence(env) ? unavailableLogWriter : noopLogWriter;
  }

  const database =
    env.TRACKINGHUB_CLICKHOUSE_DATABASE ?? env.CLICKHOUSE_DATABASE;
  const username =
    env.TRACKINGHUB_CLICKHOUSE_USERNAME ?? env.CLICKHOUSE_USERNAME;
  const password =
    env.TRACKINGHUB_CLICKHOUSE_PASSWORD ?? env.CLICKHOUSE_PASSWORD;

  return {
    async writeLog(log) {
      const ensureUrl = buildClickHouseUrl(
        clickHouseUrl,
        database,
        RAW_LOGS_TABLE_SQL,
      );
      const ensureResponse = await fetchImpl(ensureUrl, {
        method: "POST",
        headers: buildHeaders(username, password),
      });

      if (!ensureResponse.ok) {
        throw new Error(`ClickHouse raw_logs schema ensure failed: ${ensureResponse.status}`);
      }

      const url = buildClickHouseUrl(
        clickHouseUrl,
        database,
        `INSERT INTO raw_logs (${RAW_LOGS_COLUMNS}) FORMAT JSONEachRow`,
      );
      const response = await fetchImpl(url, {
        method: "POST",
        headers: buildHeaders(username, password),
        body: `${JSON.stringify(toClickHouseRow(log))}\n`,
      });

      if (!response.ok) {
        throw new Error(`ClickHouse raw_logs insert failed: ${response.status}`);
      }
    },
  };
}
