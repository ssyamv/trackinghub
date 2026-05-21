import type { LogLevel } from "./envelope";
import { RAW_LOGS_TABLE_SQL } from "./schema";
import type { StatusCard } from "@/lib/trackinghub/types";

export type LogsRange = "7d" | "30d";
export type LogsEnvironment =
  | "dev"
  | "staging"
  | "prod"
  | "test"
  | "develop"
  | "production";
export type LogsSource = "web" | "flutter";

export type LogsFilters = {
  projectId?: string;
  environment?: LogsEnvironment;
  source?: LogsSource;
  level?: LogLevel;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  range: LogsRange;
};

export type LogsFilterInput = Partial<{
  projectId: unknown;
  project_id: unknown;
  environment: unknown;
  source: unknown;
  level: unknown;
  q: unknown;
  dateFrom: unknown;
  date_from: unknown;
  dateTo: unknown;
  date_to: unknown;
  range: unknown;
}>;

export type LogLevelCount = {
  level: string;
  count: number;
  share: string;
};

export type LogListItem = {
  logId: string;
  level: string;
  message: string;
  logger: string;
  environment: string;
  source: string;
  timestamp: string;
  receivedAt: string;
  identity: string;
  appVersion: string;
  traceId: string;
  errorSummary: string;
};

export type LogsData = {
  source: "clickhouse" | "unavailable";
  filters: LogsFilters;
  metrics: StatusCard[];
  levelCounts: LogLevelCount[];
  items: LogListItem[];
};

export type ClickHouseLogsClient = {
  loadLogs(filters?: LogsFilterInput): Promise<LogsData>;
};

type FetchLike = typeof fetch;
type LogsEnv = Record<string, string | undefined>;
type ClickHouseRow = Record<string, unknown>;

const DEFAULT_LOGS_FILTERS: LogsFilters = {
  range: "7d",
};

function firstValue(value: unknown) {
  if (Array.isArray(value)) {
    return firstValue(value[0]);
  }

  return typeof value === "string" ? value.trim() : undefined;
}

function cleanIdentifier(value: unknown) {
  const input = firstValue(value);

  if (!input || input.length > 128) {
    return undefined;
  }

  return /^[A-Za-z0-9_.:-]+$/.test(input) ? input : undefined;
}

function cleanQuery(value: unknown) {
  const input = firstValue(value);

  if (!input) {
    return undefined;
  }

  return input.slice(0, 120);
}

function cleanDateValue(value: unknown) {
  const input = firstValue(value);

  if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return undefined;
  }

  const date = new Date(`${input}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input
    ? undefined
    : input;
}

function dateValueMs(value: string) {
  return new Date(`${value}T00:00:00.000Z`).getTime();
}

function normalizeDateRange(input: LogsFilterInput) {
  const dateFrom = cleanDateValue(input.dateFrom ?? input.date_from);
  const dateTo = cleanDateValue(input.dateTo ?? input.date_to);

  if (!dateFrom || !dateTo || dateValueMs(dateFrom) > dateValueMs(dateTo)) {
    return {};
  }

  return { dateFrom, dateTo };
}

export function normalizeLogsFilters(input: LogsFilterInput = {}): LogsFilters {
  const environment = firstValue(input.environment);
  const source = firstValue(input.source);
  const level = firstValue(input.level);
  const range = firstValue(input.range);

  return {
    projectId: cleanIdentifier(input.projectId ?? input.project_id),
    environment:
      environment === "dev" ||
      environment === "staging" ||
      environment === "prod" ||
      environment === "test" ||
      environment === "develop" ||
      environment === "production"
        ? environment
        : undefined,
    source: source === "web" || source === "flutter" ? source : undefined,
    level:
      level === "debug" ||
      level === "info" ||
      level === "warn" ||
      level === "error" ||
      level === "fatal"
        ? level
        : undefined,
    q: cleanQuery(input.q),
    ...normalizeDateRange(input),
    range: range === "30d" ? "30d" : DEFAULT_LOGS_FILTERS.range,
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
  const headers: Record<string, string> = {};

  if (username && password) {
    headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString(
      "base64",
    )}`;
  }

  return headers;
}

async function queryClickHouseRows<T extends ClickHouseRow>(
  fetchImpl: FetchLike,
  url: URL,
  headers: Record<string, string>,
) {
  const response = await fetchImpl(url, {
    method: "POST",
    headers,
  });

  if (!response.ok) {
    throw new Error(`ClickHouse logs query failed: ${response.status}`);
  }

  const text = await response.text();

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatCompact(value: number) {
  if (value >= 1_000_000) {
    return `${trimFixed(value / 1_000_000)}m`;
  }

  if (value >= 1_000) {
    return `${trimFixed(value / 1_000)}k`;
  }

  return String(value);
}

function trimFixed(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
}

function formatPercent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return "0%";
  }

  const percent = (numerator / denominator) * 100;
  return percent === 100 ? "100%" : `${percent.toFixed(1)}%`;
}

function formatDateTime(value: unknown) {
  if (typeof value !== "string" || value.length < 16) {
    return "暂无";
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);

  if (!match) {
    return value;
  }

  return `${match[2]}-${match[3]} ${match[4]}:${match[5]}`;
}

function logsRangeLabel(filters: LogsFilters) {
  if (filters.dateFrom && filters.dateTo) {
    return `${filters.dateFrom} 至 ${filters.dateTo}`;
  }

  return `最近 ${filters.range === "30d" ? 30 : 7} 天`;
}

function clickHouseString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function filterConditions(filters: LogsFilters, timeColumn: string) {
  const conditions =
    filters.dateFrom && filters.dateTo
      ? [
          `${timeColumn} >= toDateTime64(${clickHouseString(`${filters.dateFrom} 00:00:00`)}, 3, 'UTC')`,
          `${timeColumn} < toDateTime64(${clickHouseString(`${filters.dateTo} 00:00:00`)}, 3, 'UTC') + INTERVAL 1 DAY`,
        ]
      : [`${timeColumn} >= now() - INTERVAL ${filters.range === "30d" ? 30 : 7} DAY`];

  if (filters.projectId) {
    conditions.push(`project_id = ${clickHouseString(filters.projectId)}`);
  }

  if (filters.environment) {
    conditions.push(`environment = ${clickHouseString(filters.environment)}`);
  }

  if (filters.source) {
    conditions.push(`source = ${clickHouseString(filters.source)}`);
  }

  if (filters.level) {
    conditions.push(`level = ${clickHouseString(filters.level)}`);
  }

  if (filters.q) {
    const query = clickHouseString(`%${filters.q}%`);
    conditions.push(
      `(message ILIKE ${query} OR logger ILIKE ${query} OR error_name ILIKE ${query} OR error_message ILIKE ${query} OR trace_id ILIKE ${query})`,
    );
  }

  return conditions.join("\n      AND ");
}

function buildOverviewQuery(filters: LogsFilters) {
  return `
    SELECT
      count() AS log_count,
      countIf(level = 'error') AS error_count,
      countIf(level = 'fatal') AS fatal_count,
      max(received_at) AS last_received_at
    FROM raw_logs
    WHERE ${filterConditions(filters, "timestamp").trim()}
    FORMAT JSONEachRow
  `;
}

function buildLevelCountQuery(filters: LogsFilters) {
  return `
    SELECT
      level,
      count() AS count
    FROM raw_logs
    WHERE ${filterConditions(filters, "timestamp").trim()}
    GROUP BY level
    ORDER BY count DESC
    FORMAT JSONEachRow
  `;
}

function buildLogRowsQuery(filters: LogsFilters) {
  return `
    SELECT
      log_id,
      level,
      message,
      logger,
      environment,
      source,
      timestamp,
      received_at,
      user_id,
      anonymous_id,
      device_id,
      session_id,
      app_version,
      trace_id,
      error_name,
      error_message
    FROM raw_logs
    WHERE ${filterConditions(filters, "timestamp").trim()}
    ORDER BY timestamp DESC
    LIMIT 100
    FORMAT JSONEachRow
  `;
}

function mapMetrics(row: ClickHouseRow | undefined, filters: LogsFilters): StatusCard[] {
  const logCount = toNumber(row?.log_count);
  const errorCount = toNumber(row?.error_count);
  const fatalCount = toNumber(row?.fatal_count);

  return [
    {
      label: "日志量",
      value: formatCompact(logCount),
      detail: `${logsRangeLabel(filters)}接收日志`,
      tone: "blue",
    },
    {
      label: "错误日志",
      value: formatCompact(errorCount),
      detail: "error 级别日志",
      tone: errorCount > 0 ? "red" : "green",
    },
    {
      label: "Fatal",
      value: formatCompact(fatalCount),
      detail: "fatal 级别日志",
      tone: fatalCount > 0 ? "red" : "green",
    },
    {
      label: "最近接收",
      value: formatDateTime(row?.last_received_at),
      detail: "raw_logs 最新 received_at",
      tone: "purple",
    },
  ];
}

function mapLevelCounts(rows: ClickHouseRow[]): LogLevelCount[] {
  const total = rows.reduce((sum, row) => sum + toNumber(row.count), 0);

  return rows.map((row) => {
    const count = toNumber(row.count);
    return {
      level: String(row.level ?? ""),
      count,
      share: formatPercent(count, total),
    };
  });
}

function firstIdentity(row: ClickHouseRow) {
  for (const key of ["user_id", "anonymous_id", "device_id", "session_id"]) {
    const value = row[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value;
    }
  }

  return "未提供";
}

function errorSummary(row: ClickHouseRow) {
  const errorName =
    typeof row.error_name === "string" && row.error_name.trim() !== ""
      ? row.error_name
      : "";
  const errorMessage =
    typeof row.error_message === "string" && row.error_message.trim() !== ""
      ? row.error_message
      : "";

  if (errorName && errorMessage) {
    return `${errorName}: ${errorMessage}`;
  }

  return errorName || errorMessage || "无异常对象";
}

function cleanText(value: unknown, fallback = "未提供") {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function mapItems(rows: ClickHouseRow[]): LogListItem[] {
  return rows.map((row) => ({
    logId: cleanText(row.log_id, ""),
    level: cleanText(row.level, ""),
    message: cleanText(row.message, ""),
    logger: cleanText(row.logger),
    environment: cleanText(row.environment, ""),
    source: cleanText(row.source, ""),
    timestamp: formatDateTime(row.timestamp),
    receivedAt: formatDateTime(row.received_at),
    identity: firstIdentity(row),
    appVersion: cleanText(row.app_version),
    traceId: cleanText(row.trace_id),
    errorSummary: errorSummary(row),
  }));
}

export function createClickHouseLogsClientFromEnv(
  env: LogsEnv = process.env,
  fetchImpl: FetchLike = fetch,
): ClickHouseLogsClient | null {
  const clickHouseUrl =
    env.TRACKINGHUB_CLICKHOUSE_URL ?? env.CLICKHOUSE_URL;

  if (!clickHouseUrl) {
    return null;
  }

  const database =
    env.TRACKINGHUB_CLICKHOUSE_DATABASE ?? env.CLICKHOUSE_DATABASE;
  const username =
    env.TRACKINGHUB_CLICKHOUSE_USERNAME ?? env.CLICKHOUSE_USERNAME;
  const password =
    env.TRACKINGHUB_CLICKHOUSE_PASSWORD ?? env.CLICKHOUSE_PASSWORD;

  return {
    async loadLogs(input = {}) {
      const filters = normalizeLogsFilters(input);
      const headers = buildHeaders(username, password);
      await queryClickHouseRows(
        fetchImpl,
        buildClickHouseUrl(clickHouseUrl, database, RAW_LOGS_TABLE_SQL),
        headers,
      );
      const [overviewRows, levelRows, itemRows] = await Promise.all([
        queryClickHouseRows(
          fetchImpl,
          buildClickHouseUrl(clickHouseUrl, database, buildOverviewQuery(filters)),
          headers,
        ),
        queryClickHouseRows(
          fetchImpl,
          buildClickHouseUrl(clickHouseUrl, database, buildLevelCountQuery(filters)),
          headers,
        ),
        queryClickHouseRows(
          fetchImpl,
          buildClickHouseUrl(clickHouseUrl, database, buildLogRowsQuery(filters)),
          headers,
        ),
      ]);

      return {
        source: "clickhouse",
        filters,
        metrics: mapMetrics(overviewRows[0], filters),
        levelCounts: mapLevelCounts(levelRows),
        items: mapItems(itemRows),
      };
    },
  };
}
