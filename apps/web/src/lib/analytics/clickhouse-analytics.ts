import type {
  AnalyticsDimensionGroup,
  AnalyticsDimensionKey,
  AnalyticsFunnelStep,
  AnalyticsPropertyValueItem,
  AnalyticsRetentionItem,
  AnalyticsTrendItem,
  StatusCard,
} from "@/lib/trackinghub/types";

export type AnalyticsData = {
  source: "clickhouse" | "unavailable";
  metrics: StatusCard[];
  trendItems: AnalyticsTrendItem[];
  funnelSteps: AnalyticsFunnelStep[];
  retentionItems: AnalyticsRetentionItem[];
  propertyItems: AnalyticsPropertyValueItem[];
  propertyKeyCount: number;
  dimensionGroups: AnalyticsDimensionGroup[];
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
  propertyKey?: string;
  dateFrom?: string;
  dateTo?: string;
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
  propertyKey: unknown;
  property_key: unknown;
  dateFrom: unknown;
  date_from: unknown;
  dateTo: unknown;
  date_to: unknown;
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

type AnalyticsDimensionDefinition = {
  key: AnalyticsDimensionKey;
  label: string;
  valueExpression: string;
};

const MISSING_DIMENSION_VALUE = "未提供";

const ANALYTICS_DIMENSIONS: AnalyticsDimensionDefinition[] = [
  {
    key: "app_version",
    label: "App 版本",
    valueExpression: "coalesce(nullIf(app_version, ''), '未提供')",
  },
  {
    key: "country",
    label: "用户地区",
    valueExpression: "coalesce(nullIf(country, ''), '未提供')",
  },
  {
    key: "channel",
    label: "渠道",
    valueExpression: "coalesce(nullIf(channel, ''), '未提供')",
  },
  {
    key: "device_os",
    label: "设备系统",
    valueExpression: [
      "if(",
      "nullIf(JSONExtractString(context, 'os_name'), '') IS NULL,",
      "'未提供',",
      "if(",
      "nullIf(JSONExtractString(context, 'os_version'), '') IS NULL,",
      "JSONExtractString(context, 'os_name'),",
      "concat(JSONExtractString(context, 'os_name'), ' ', JSONExtractString(context, 'os_version'))",
      ")",
      ")",
    ].join(" "),
  },
  {
    key: "device_model",
    label: "设备型号",
    valueExpression:
      "coalesce(nullIf(JSONExtractString(context, 'device_model'), ''), '未提供')",
  },
];

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

function normalizeDateRange(input: AnalyticsFilterInput) {
  const dateFrom = cleanDateValue(input.dateFrom ?? input.date_from);
  const dateTo = cleanDateValue(input.dateTo ?? input.date_to);

  if (!dateFrom || !dateTo || dateValueMs(dateFrom) > dateValueMs(dateTo)) {
    return {};
  }

  return { dateFrom, dateTo };
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

  const dateRange = normalizeDateRange(input);

  return {
    projectId: cleanIdentifier(input.projectId ?? input.project_id),
    environment:
      environment === "dev" || environment === "staging" || environment === "prod"
        ? environment
        : undefined,
    source: source === "web" || source === "flutter" ? source : undefined,
    eventName: cleanIdentifier(input.eventName ?? input.event_name),
    propertyKey: cleanIdentifier(input.propertyKey ?? input.property_key),
    ...dateRange,
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

function customRangeDays(filters: AnalyticsFilters) {
  if (!filters.dateFrom || !filters.dateTo) {
    return undefined;
  }

  const dayMs = 24 * 60 * 60 * 1000;
  return Math.floor((dateValueMs(filters.dateTo) - dateValueMs(filters.dateFrom)) / dayMs) + 1;
}

function effectiveRangeDays(filters: AnalyticsFilters) {
  return customRangeDays(filters) ?? rangeDays(filters);
}

export function analyticsRangeLabel(filters: AnalyticsFilters) {
  if (filters.dateFrom && filters.dateTo) {
    return `${filters.dateFrom} 至 ${filters.dateTo}`;
  }

  return `最近 ${rangeDays(filters)} 天`;
}

function rangeMetricDetail(filters: AnalyticsFilters, suffix: string) {
  const label = analyticsRangeLabel(filters);
  const separator = label.startsWith("最近 ") ? "" : " ";

  return `${label}${separator}${suffix}`;
}

function clickHouseString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function filterConditions(
  filters: AnalyticsFilters,
  timeColumn: string,
  options: { includeEventName?: boolean } = {},
) {
  const conditions =
    filters.dateFrom && filters.dateTo
      ? [
          `${timeColumn} >= toDateTime64(${clickHouseString(`${filters.dateFrom} 00:00:00`)}, 3, 'UTC')`,
          `${timeColumn} < toDateTime64(${clickHouseString(`${filters.dateTo} 00:00:00`)}, 3, 'UTC') + INTERVAL 1 DAY`,
        ]
      : [`${timeColumn} >= now() - INTERVAL ${rangeDays(filters)} DAY`];
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

function trendLimit(filters: AnalyticsFilters) {
  return Math.min(effectiveRangeDays(filters), 366) * 24;
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
    LIMIT ${trendLimit(filters)}
    FORMAT JSONEachRow
  `;
}

function buildPropertyDistributionQuery(filters: AnalyticsFilters) {
  return `
    SELECT
      property_key,
      property_value,
      event_count,
      unique_users,
      count() OVER (PARTITION BY property_key) AS distinct_values
    FROM (
      SELECT
        property_key,
        property_value,
        count() AS event_count,
        uniqExact(identity) AS unique_users
      FROM (
        SELECT
          tupleElement(property_item, 1) AS property_key,
          coalesce(
            nullIf(replaceRegexpAll(tupleElement(property_item, 2), '^"|"$', ''), ''),
            '未提供'
          ) AS property_value,
          ${identityExpression()} AS identity
        FROM raw_events
        ARRAY JOIN JSONExtractKeysAndValuesRaw(properties) AS property_item
        WHERE ${filterConditions(filters, "timestamp").trim()}
      )
      GROUP BY property_key, property_value
    )
    ORDER BY property_key ASC, event_count DESC
    LIMIT 300
    FORMAT JSONEachRow
  `;
}

function buildDimensionQuery(filters: AnalyticsFilters) {
  const dimensionQueries = ANALYTICS_DIMENSIONS.map((dimension) => {
    return `
      SELECT
        ${clickHouseString(dimension.key)} AS dimension_key,
        ${clickHouseString(dimension.label)} AS dimension_label,
        dimension_value,
        event_count,
        unique_users,
        total_events
      FROM (
        SELECT
          dimension_value,
          event_count,
          unique_users,
          sum(event_count) OVER () AS total_events
        FROM (
          SELECT
            ${dimension.valueExpression} AS dimension_value,
            count() AS event_count,
            uniqExact(${identityExpression()}) AS unique_users
          FROM raw_events
          WHERE ${filterConditions(filters, "timestamp").trim()}
          GROUP BY dimension_value
        )
        ORDER BY event_count DESC, dimension_value ASC
        LIMIT 10
      )
    `;
  }).join("\n    UNION ALL\n");

  return `
    ${dimensionQueries}
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

function buildRetentionQuery(filters: AnalyticsFilters) {
  return `
    WITH
      filtered AS (
        SELECT
          ${identityExpression()} AS identity,
          toDate(timestamp) AS active_date
        FROM raw_events
        WHERE ${filterConditions(filters, "timestamp").trim()}
      ),
      cohorts AS (
        SELECT
          identity,
          min(active_date) AS cohort_date
        FROM filtered
        GROUP BY identity
      ),
      cohort_sizes AS (
        SELECT
          cohort_date,
          count() AS cohort_users
        FROM cohorts
        GROUP BY cohort_date
      ),
      activity AS (
        SELECT
          cohorts.cohort_date AS cohort_date,
          dateDiff('day', cohorts.cohort_date, filtered.active_date) AS day_number,
          uniqExact(filtered.identity) AS retained_users
        FROM filtered
        INNER JOIN cohorts ON filtered.identity = cohorts.identity
        WHERE filtered.active_date >= cohorts.cohort_date
        GROUP BY cohort_date, day_number
      )
    SELECT
      toString(activity.cohort_date) AS cohort,
      activity.day_number AS day_number,
      cohort_sizes.cohort_users AS cohort_users,
      activity.retained_users AS retained_users
    FROM activity
    INNER JOIN cohort_sizes ON activity.cohort_date = cohort_sizes.cohort_date
    WHERE day_number IN (0, 1, 7, 14, 30)
    ORDER BY activity.cohort_date DESC, day_number ASC
    LIMIT 160
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
      detail: rangeMetricDetail(filters, "接收事件"),
      tone: "blue",
    },
    {
      label: "活跃用户",
      value: formatCompact(activeUsers),
      detail: rangeMetricDetail(filters, "去重用户"),
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
  return rows.map((row) => {
    const eventCount = toNumber(row.event_count);
    const uniqueUsers = toNumber(row.unique_users);

    return {
      bucket: formatDateTime(row.bucket),
      eventName: String(row.event_name ?? ""),
      environment: String(row.environment ?? ""),
      source: String(row.source ?? ""),
      eventCount: formatCompact(eventCount),
      eventCountValue: eventCount,
      uniqueUsers: formatCompact(uniqueUsers),
      uniqueUsersValue: uniqueUsers,
    };
  });
}

function mapPropertyItems(
  rows: ClickHouseRow[],
  propertyKey: string | undefined,
): AnalyticsPropertyValueItem[] {
  return rows.map((row) => {
    const eventCount = toNumber(row.event_count);
    const uniqueUsers = toNumber(row.unique_users);

    return {
      propertyKey: String(row.property_key ?? propertyKey ?? ""),
      propertyValue: String(row.property_value ?? "未提供"),
      distinctValues: toNumber(row.distinct_values),
      eventCount: formatCompact(eventCount),
      eventCountValue: eventCount,
      uniqueUsers: formatCompact(uniqueUsers),
      uniqueUsersValue: uniqueUsers,
    };
  });
}

function propertyKeyCount(rows: ClickHouseRow[]) {
  return new Set(rows.map((row) => String(row.property_key ?? ""))).size;
}

function dimensionValue(value: unknown) {
  return typeof value === "string" && value.trim() !== ""
    ? value
    : MISSING_DIMENSION_VALUE;
}

function mapDimensionGroups(rows: ClickHouseRow[]): AnalyticsDimensionGroup[] {
  return ANALYTICS_DIMENSIONS.map((dimension) => {
    const items = rows
      .filter((row) => row.dimension_key === dimension.key)
      .map((row) => {
        const eventCount = toNumber(row.event_count);
        const uniqueUsers = toNumber(row.unique_users);
        const totalEvents = toNumber(row.total_events);
        const shareValue = totalEvents > 0 ? eventCount / totalEvents : 0;

        return {
          value: dimensionValue(row.dimension_value),
          eventCount: formatCompact(eventCount),
          eventCountValue: eventCount,
          uniqueUsers: formatCompact(uniqueUsers),
          uniqueUsersValue: uniqueUsers,
          share: formatPercent(eventCount, totalEvents),
          shareValue,
        };
      });

    return {
      key: dimension.key,
      label: dimension.label,
      items,
    };
  });
}

function mapFunnelSteps(rows: ClickHouseRow[]): AnalyticsFunnelStep[] {
  const sortedRows = [...rows].sort(
    (left, right) => toNumber(left.step) - toNumber(right.step),
  );
  const firstStepUsers = toNumber(sortedRows[0]?.users);

  return sortedRows.map((row) => {
    const users = toNumber(row.users);
    return {
      step: String(row.step ?? ""),
      eventName: String(row.event_name ?? ""),
      users: formatCompact(users),
      usersValue: users,
      conversion: formatPercent(users, firstStepUsers),
      conversionRate: firstStepUsers > 0 ? users / firstStepUsers : 0,
    };
  });
}

function mapRetentionItems(rows: ClickHouseRow[]): AnalyticsRetentionItem[] {
  return rows.map((row) => {
    const cohortUsers = toNumber(row.cohort_users);
    const retainedUsers = toNumber(row.retained_users);
    return {
      cohort: String(row.cohort ?? ""),
      day: toNumber(row.day_number),
      cohortUsers: formatCompact(cohortUsers),
      cohortUsersValue: cohortUsers,
      retainedUsers: formatCompact(retainedUsers),
      retainedUsersValue: retainedUsers,
      retention: formatPercent(retainedUsers, cohortUsers),
      retentionRate: cohortUsers > 0 ? retainedUsers / cohortUsers : 0,
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
      const [
        overviewRows,
        validationRows,
        trendRows,
        retentionRows,
        dimensionRows,
        funnelRows,
        propertyRows,
      ] = await Promise.all([
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
          queryClickHouseRows(
            fetchImpl,
            buildClickHouseUrl(clickHouseUrl, database, buildRetentionQuery(filters)),
            headers,
          ),
          queryClickHouseRows(
            fetchImpl,
            buildClickHouseUrl(clickHouseUrl, database, buildDimensionQuery(filters)),
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
          filters.eventName
            ? queryClickHouseRows(
                fetchImpl,
                buildClickHouseUrl(
                  clickHouseUrl,
                  database,
                  buildPropertyDistributionQuery(filters),
                ),
                headers,
              )
            : Promise.resolve([]),
        ]);

      return {
        source: "clickhouse",
        metrics: mapMetrics(overviewRows[0], validationRows[0], filters),
        trendItems: mapTrendItems(trendRows),
        retentionItems: mapRetentionItems(retentionRows),
        funnelSteps: mapFunnelSteps(funnelRows),
        propertyItems: mapPropertyItems(propertyRows, filters.propertyKey),
        propertyKeyCount: propertyKeyCount(propertyRows),
        dimensionGroups: mapDimensionGroups(dimensionRows),
      };
    },
  };
}
