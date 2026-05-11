import type {
  AnalyticsFunnelStep,
  AnalyticsTrendItem,
  StatusCard,
} from "@/lib/trackinghub/types";

export type AnalyticsData = {
  source: "clickhouse" | "unavailable";
  metrics: StatusCard[];
  trendItems: AnalyticsTrendItem[];
  funnelSteps: AnalyticsFunnelStep[];
};

export type AnalyticsRange = "7d" | "30d";
export type AnalyticsGranularity = "day" | "hour";
export type AnalyticsEnvironment = "dev" | "staging" | "prod";
export type AnalyticsSource = "web" | "flutter";

export type AnalyticsFilters = {
  projectId?: string;
  environment?: AnalyticsEnvironment;
  source?: AnalyticsSource;
  eventName?: string;
  funnelSteps: string[];
  granularity: AnalyticsGranularity;
  range: AnalyticsRange;
};

export type AnalyticsFilterInput = Partial<{
  projectId: unknown;
  project_id: unknown;
  environment: unknown;
  source: unknown;
  eventName: unknown;
  event_name: unknown;
  funnelSteps: unknown;
  funnel_steps: unknown;
  granularity: unknown;
  range: unknown;
  report_action: unknown;
}>;

export type ClickHouseAnalyticsClient = {
  loadAnalytics(filters?: AnalyticsFilterInput): Promise<AnalyticsData>;
};

type FetchLike = typeof fetch;
type AnalyticsEnv = Record<string, string | undefined>;
type ClickHouseRow = Record<string, unknown>;

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilters = {
  funnelSteps: [],
  granularity: "day",
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

  return cleanIdentifierValue(input);
}

function cleanIdentifierValue(input: string | undefined) {
  if (!input || input.length > 128) {
    return undefined;
  }

  return /^[A-Za-z0-9_.:-]+$/.test(input) ? input : undefined;
}

function rawFunnelStepValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(rawFunnelStepValues);
  }

  const input = firstValue(value);

  if (!input) {
    return [];
  }

  return input.split(",").map((item) => item.trim());
}

function normalizeFunnelSteps(value: unknown) {
  const steps = rawFunnelStepValues(value)
    .map(cleanIdentifierValue)
    .filter((item): item is string => Boolean(item))
    .slice(0, 8);

  return steps.length >= 2 ? steps : [];
}

export function normalizeAnalyticsFilters(
  input: AnalyticsFilterInput = {},
): AnalyticsFilters {
  const environment = firstValue(input.environment);
  const source = firstValue(input.source);
  const granularity = firstValue(input.granularity);
  const range = firstValue(input.range);

  return {
    projectId: cleanIdentifier(input.projectId ?? input.project_id),
    environment:
      environment === "dev" || environment === "staging" || environment === "prod"
        ? environment
        : undefined,
    source: source === "web" || source === "flutter" ? source : undefined,
    eventName: cleanIdentifier(input.eventName ?? input.event_name),
    funnelSteps: normalizeFunnelSteps(input.funnelSteps ?? input.funnel_steps),
    granularity: granularity === "hour" ? "hour" : "day",
    range: range === "30d" ? "30d" : "7d",
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
    throw new Error(`ClickHouse analytics query failed: ${response.status}`);
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

function identityExpression() {
  return "coalesce(user_id, anonymous_id, device_id, session_id, toString(event_id))";
}

function rangeDays(filters: AnalyticsFilters) {
  return filters.range === "30d" ? 30 : 7;
}

function rangeLabel(filters: AnalyticsFilters) {
  return `最近 ${rangeDays(filters)} 天`;
}

function clickHouseString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function filterConditions(
  filters: AnalyticsFilters,
  timeColumn: string,
  options: { includeEventName?: boolean } = {},
) {
  const conditions = [
    `${timeColumn} >= now() - INTERVAL ${rangeDays(filters)} DAY`,
  ];
  const includeEventName = options.includeEventName ?? true;

  if (filters.projectId) {
    conditions.push(`project_id = ${clickHouseString(filters.projectId)}`);
  }

  if (filters.environment) {
    conditions.push(`environment = ${clickHouseString(filters.environment)}`);
  }

  if (filters.source) {
    conditions.push(`source = ${clickHouseString(filters.source)}`);
  }

  if (includeEventName && filters.eventName) {
    conditions.push(`event_name = ${clickHouseString(filters.eventName)}`);
  }

  return conditions.join("\n      AND ");
}

function bucketExpression(filters: AnalyticsFilters) {
  return filters.granularity === "hour"
    ? "toStartOfHour(timestamp)"
    : "toStartOfDay(timestamp)";
}

function buildOverviewQuery(filters: AnalyticsFilters) {
  return `
    SELECT
      count() AS event_count,
      uniqExact(${identityExpression()}) AS active_users,
      max(received_at) AS last_received_at
    FROM raw_events
    WHERE ${filterConditions(filters, "timestamp").trim()}
    FORMAT JSONEachRow
  `;
}

function buildValidationQuery(filters: AnalyticsFilters) {
  return `
    SELECT
      count() AS validation_count,
      countIf(status != 'valid') AS invalid_count
    FROM event_validation_results
    WHERE ${filterConditions(filters, "observed_at").trim()}
    FORMAT JSONEachRow
  `;
}

function buildTrendQuery(filters: AnalyticsFilters) {
  return `
    SELECT
      ${bucketExpression(filters)} AS bucket,
      event_name,
      environment,
      source,
      count() AS event_count,
      uniqExact(${identityExpression()}) AS unique_users
    FROM raw_events
    WHERE ${filterConditions(filters, "timestamp").trim()}
    GROUP BY bucket, event_name, environment, source
    ORDER BY bucket DESC, event_count DESC
    LIMIT ${filters.granularity === "hour" ? 48 : 30}
    FORMAT JSONEachRow
  `;
}

function buildFunnelQuery(filters: AnalyticsFilters) {
  const eventList = filters.funnelSteps.map(clickHouseString).join(", ");
  const stepColumns = filters.funnelSteps
    .map(
      (eventName, index) =>
        [
          "          minIf(timestamp, event_name = ",
          clickHouseString(eventName),
          `) AS step_${index + 1}_at`,
        ].join(""),
    )
    .join(",\n");
  const stepQueries = filters.funnelSteps
    .map((eventName, index) => {
      const stepNumber = index + 1;
      const completedSteps = Array.from(
        { length: stepNumber },
        (_, stepIndex) => `step_${stepIndex + 1}_at`,
      );
      const conditions = [
        `${completedSteps[0]} > zero`,
        ...completedSteps
          .slice(1)
          .map((stepAt, stepIndex) => `${stepAt} >= ${completedSteps[stepIndex]}`),
      ].join(" AND ");

      return [
        `    SELECT '${stepNumber}' AS step, `,
        `${clickHouseString(eventName)} AS event_name, `,
        `countIf(${conditions}) AS users FROM per_user`,
      ].join("");
    })
    .join("\n    UNION ALL\n");

  return `
    WITH
      toDateTime64(0, 3, 'UTC') AS zero,
      per_user AS (
        SELECT
          ${identityExpression()} AS identity,
${stepColumns}
        FROM raw_events
        WHERE ${filterConditions(filters, "timestamp", { includeEventName: false }).trim()}
          AND event_name IN (${eventList})
        GROUP BY identity
      )
${stepQueries}
    ORDER BY step ASC
    FORMAT JSONEachRow
  `;
}

function mapMetrics(
  overviewRow: ClickHouseRow | undefined,
  validationRow: ClickHouseRow | undefined,
  filters: AnalyticsFilters,
): StatusCard[] {
  const eventCount = toNumber(overviewRow?.event_count);
  const activeUsers = toNumber(overviewRow?.active_users);
  const validationCount = toNumber(validationRow?.validation_count);
  const invalidCount = toNumber(validationRow?.invalid_count);

  return [
    {
      label: "事件量",
      value: formatCompact(eventCount),
      detail: `${rangeLabel(filters)}接收事件`,
      tone: "blue",
    },
    {
      label: "活跃用户",
      value: formatCompact(activeUsers),
      detail: `${rangeLabel(filters)}去重用户`,
      tone: "green",
    },
    {
      label: "最近接收",
      value: formatDateTime(overviewRow?.last_received_at),
      detail: "raw_events 最新 received_at",
      tone: "purple",
    },
    {
      label: "异常占比",
      value: formatPercent(invalidCount, validationCount),
      detail:
        validationCount > 0
          ? `${invalidCount} / ${validationCount} 条验证异常`
          : "暂无验证结果",
      tone: invalidCount > 0 ? "red" : "green",
    },
  ];
}

function mapTrendItems(rows: ClickHouseRow[]): AnalyticsTrendItem[] {
  return rows.map((row) => ({
    bucket: formatDateTime(row.bucket),
    eventName: String(row.event_name ?? ""),
    environment: String(row.environment ?? ""),
    source: String(row.source ?? ""),
    eventCount: formatCompact(toNumber(row.event_count)),
    uniqueUsers: formatCompact(toNumber(row.unique_users)),
  }));
}

function mapFunnelSteps(rows: ClickHouseRow[]): AnalyticsFunnelStep[] {
  const firstStepUsers = toNumber(rows[0]?.users);

  return rows.map((row) => {
    const users = toNumber(row.users);
    return {
      step: String(row.step ?? ""),
      eventName: String(row.event_name ?? ""),
      users: formatCompact(users),
      conversion: formatPercent(users, firstStepUsers),
    };
  });
}

export function createClickHouseAnalyticsClientFromEnv(
  env: AnalyticsEnv = process.env,
  fetchImpl: FetchLike = fetch,
): ClickHouseAnalyticsClient | null {
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
  const headers = buildHeaders(username, password);

  return {
    async loadAnalytics(inputFilters) {
      const filters = normalizeAnalyticsFilters(inputFilters);
      const [overviewRows, validationRows, trendRows, funnelRows] =
        await Promise.all([
          queryClickHouseRows(
            fetchImpl,
            buildClickHouseUrl(clickHouseUrl, database, buildOverviewQuery(filters)),
            headers,
          ),
          queryClickHouseRows(
            fetchImpl,
            buildClickHouseUrl(clickHouseUrl, database, buildValidationQuery(filters)),
            headers,
          ),
          queryClickHouseRows(
            fetchImpl,
            buildClickHouseUrl(clickHouseUrl, database, buildTrendQuery(filters)),
            headers,
          ),
          filters.funnelSteps.length >= 2
            ? queryClickHouseRows(
                fetchImpl,
                buildClickHouseUrl(
                  clickHouseUrl,
                  database,
                  buildFunnelQuery(filters),
                ),
                headers,
              )
            : Promise.resolve([]),
        ]);

      return {
        source: "clickhouse",
        metrics: mapMetrics(overviewRows[0], validationRows[0], filters),
        trendItems: mapTrendItems(trendRows),
        funnelSteps: mapFunnelSteps(funnelRows),
      };
    },
  };
}
