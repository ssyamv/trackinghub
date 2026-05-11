# Analytics Dimension Distributions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable运营维度分布模块 to `/analytics`, showing App版本、用户地区、渠道、设备系统、设备型号 distributions from ClickHouse.

**Architecture:** Extend the existing ClickHouse analytics loader with a configured dimension query that returns grouped Top 10 distributions under `AnalyticsData.dimensionGroups`. Render those groups in the existing `AnalyticsWorkbench` as reusable distribution cards. Keep SDK changes contract-level only: both SDK tests prove `context.os_name`、`context.os_version`、`context.device_model` can pass through unchanged.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, ClickHouse SQL over HTTP, Web SDK TypeScript, Flutter SDK Dart tests.

---

## File Structure

- Modify `apps/web/src/lib/trackinghub/types.ts`
  - Owns shared analytics UI/API types.
  - Add `AnalyticsDimensionGroup` and `AnalyticsDimensionItem`.
- Modify `apps/web/src/lib/analytics/clickhouse-analytics.ts`
  - Owns analytics filter normalization, ClickHouse query building, and ClickHouse row mapping.
  - Add dimension definitions, dimension SQL, row mapping, and `dimensionGroups` in `AnalyticsData`.
- Modify `apps/web/src/lib/analytics/clickhouse-analytics.test.ts`
  - Owns query/mapping regression tests for the analytics loader.
  - Add response fixtures and expectations for dimension groups.
- Modify `apps/web/src/components/trackinghub/analytics-workbench.tsx`
  - Owns rendered analytics workbench.
  - Add reusable dimension distribution card and place it below metric cards.
- Modify `apps/web/src/components/trackinghub/analytics-workbench-client.test.tsx`
  - Owns client-side rendering/refresh behavior tests.
  - Include dimension groups in initial and refresh payloads and assert rendered distribution content.
- Modify `apps/web/src/app/analytics/page.tsx`
  - Owns server-side page data handoff.
  - Include `dimensionGroups` in unavailable fallback and component props.
- Modify `packages/web-sdk/src/index.test.ts`
  - Owns Web SDK envelope contract tests.
  - Add device context keys to the existing envelope test.
- Modify `packages/flutter-sdk/test/trackinghub_client_test.dart`
  - Owns Flutter SDK envelope contract tests.
  - Add device context keys to the existing serialization test.

## Task 1: Analytics Types And ClickHouse Dimension Query

**Files:**
- Modify: `apps/web/src/lib/trackinghub/types.ts`
- Modify: `apps/web/src/lib/analytics/clickhouse-analytics.ts`
- Test: `apps/web/src/lib/analytics/clickhouse-analytics.test.ts`

- [ ] **Step 1: Write failing analytics loader expectations**

In `apps/web/src/lib/analytics/clickhouse-analytics.test.ts`, update the first test responses so the analytics loader receives a fifth ClickHouse response for dimensions:

```ts
const responses = [
  [
    {
      event_count: "2700",
      active_users: "184",
      last_received_at: "2026-05-10 08:30:00.000",
    },
  ],
  [{ validation_count: "20", invalid_count: "3" }],
  [
    {
      bucket: "2026-05-10 00:00:00",
      event_name: "pay_button_click",
      environment: "prod",
      source: "web",
      event_count: "120",
      unique_users: "88",
    },
  ],
  [
    {
      cohort: "2026-05-10",
      day_number: "1",
      cohort_users: "100",
      retained_users: "42",
    },
  ],
  [
    {
      dimension_key: "app_version",
      dimension_label: "App 版本",
      dimension_value: "1.5.1",
      event_count: "900",
      unique_users: "120",
      total_events: "1800",
    },
    {
      dimension_key: "country",
      dimension_label: "用户地区",
      dimension_value: "US",
      event_count: "450",
      unique_users: "80",
      total_events: "900",
    },
    {
      dimension_key: "channel",
      dimension_label: "渠道",
      dimension_value: "google_play",
      event_count: "360",
      unique_users: "70",
      total_events: "900",
    },
    {
      dimension_key: "device_os",
      dimension_label: "设备系统",
      dimension_value: "iOS 18.4",
      event_count: "300",
      unique_users: "60",
      total_events: "900",
    },
    {
      dimension_key: "device_model",
      dimension_label: "设备型号",
      dimension_value: "iPhone16,2",
      event_count: "240",
      unique_users: "50",
      total_events: "900",
    },
  ],
];
```

Add `dimensionGroups` to the expected `result`:

```ts
dimensionGroups: [
  {
    key: "app_version",
    label: "App 版本",
    items: [
      {
        value: "1.5.1",
        eventCount: "900",
        eventCountValue: 900,
        uniqueUsers: "120",
        uniqueUsersValue: 120,
        share: "50.0%",
        shareValue: 0.5,
      },
    ],
  },
  {
    key: "country",
    label: "用户地区",
    items: [
      {
        value: "US",
        eventCount: "450",
        eventCountValue: 450,
        uniqueUsers: "80",
        uniqueUsersValue: 80,
        share: "50.0%",
        shareValue: 0.5,
      },
    ],
  },
  {
    key: "channel",
    label: "渠道",
    items: [
      {
        value: "google_play",
        eventCount: "360",
        eventCountValue: 360,
        uniqueUsers: "70",
        uniqueUsersValue: 70,
        share: "40.0%",
        shareValue: 0.4,
      },
    ],
  },
  {
    key: "device_os",
    label: "设备系统",
    items: [
      {
        value: "iOS 18.4",
        eventCount: "300",
        eventCountValue: 300,
        uniqueUsers: "60",
        uniqueUsersValue: 60,
        share: "33.3%",
        shareValue: 1 / 3,
      },
    ],
  },
  {
    key: "device_model",
    label: "设备型号",
    items: [
      {
        value: "iPhone16,2",
        eventCount: "240",
        eventCountValue: 240,
        uniqueUsers: "50",
        uniqueUsersValue: 50,
        share: "26.7%",
        shareValue: 240 / 900,
      },
    ],
  },
],
```

Update the same test request assertions:

```ts
expect(requests).toHaveLength(5);
expect(requests[4].url).toContain("dimension_key");
expect(requests[4].url).toContain("JSONExtractString");
```

- [ ] **Step 2: Run the focused failing test**

Run:

```bash
pnpm --filter web test -- src/lib/analytics/clickhouse-analytics.test.ts
```

Expected: FAIL because `dimensionGroups` does not exist yet and the loader still makes 4 requests in the no-event-name case.

- [ ] **Step 3: Add shared dimension types**

In `apps/web/src/lib/trackinghub/types.ts`, add after `AnalyticsPropertyValueItem`:

```ts
export type AnalyticsDimensionKey =
  | "app_version"
  | "country"
  | "channel"
  | "device_os"
  | "device_model";

export type AnalyticsDimensionItem = {
  value: string;
  eventCount: string;
  eventCountValue: number;
  uniqueUsers: string;
  uniqueUsersValue: number;
  share: string;
  shareValue: number;
};

export type AnalyticsDimensionGroup = {
  key: AnalyticsDimensionKey;
  label: string;
  items: AnalyticsDimensionItem[];
};
```

- [ ] **Step 4: Extend analytics data shape**

In `apps/web/src/lib/analytics/clickhouse-analytics.ts`, import the new type:

```ts
import type {
  AnalyticsDimensionGroup,
  AnalyticsDimensionKey,
  AnalyticsFunnelStep,
  AnalyticsPropertyValueItem,
  AnalyticsRetentionItem,
  AnalyticsTrendItem,
  StatusCard,
} from "@/lib/trackinghub/types";
```

Add `dimensionGroups` to `AnalyticsData`:

```ts
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
```

- [ ] **Step 5: Add dimension definitions and SQL helpers**

In `apps/web/src/lib/analytics/clickhouse-analytics.ts`, add near other query helpers:

```ts
type AnalyticsDimensionDefinition = {
  key: AnalyticsDimensionKey;
  label: string;
  expression: string;
};

const ANALYTICS_DIMENSIONS: AnalyticsDimensionDefinition[] = [
  {
    key: "app_version",
    label: "App 版本",
    expression: "app_version",
  },
  {
    key: "country",
    label: "用户地区",
    expression: "country",
  },
  {
    key: "channel",
    label: "渠道",
    expression: "channel",
  },
  {
    key: "device_os",
    label: "设备系统",
    expression: [
      "nullIf(",
      "trim(BOTH ' ' FROM concat(",
      "ifNull(nullIf(JSONExtractString(context, 'os_name'), ''), ''),",
      "' ',",
      "ifNull(nullIf(JSONExtractString(context, 'os_version'), ''), '')",
      ")),",
      "''",
      ")",
    ].join(""),
  },
  {
    key: "device_model",
    label: "设备型号",
    expression: "JSONExtractString(context, 'device_model')",
  },
];

function dimensionValueExpression(expression: string) {
  return `coalesce(nullIf(${expression}, ''), '未提供')`;
}

function buildSingleDimensionQuery(
  filters: AnalyticsFilters,
  dimension: AnalyticsDimensionDefinition,
) {
  const valueExpression = dimensionValueExpression(dimension.expression);

  return `
    SELECT
      ${clickHouseString(dimension.key)} AS dimension_key,
      ${clickHouseString(dimension.label)} AS dimension_label,
      dimension_value,
      event_count,
      unique_users,
      sum(event_count) OVER () AS total_events
    FROM (
      SELECT
        ${valueExpression} AS dimension_value,
        count() AS event_count,
        uniqExact(${identityExpression()}) AS unique_users
      FROM raw_events
      WHERE ${filterConditions(filters, "timestamp").trim()}
      GROUP BY dimension_value
      ORDER BY event_count DESC
      LIMIT 10
    )
  `;
}

function buildDimensionDistributionQuery(filters: AnalyticsFilters) {
  return `
${ANALYTICS_DIMENSIONS.map((dimension) =>
  buildSingleDimensionQuery(filters, dimension),
).join("\n    UNION ALL\n")}
    FORMAT JSONEachRow
  `;
}
```

- [ ] **Step 6: Add row mapping**

In `apps/web/src/lib/analytics/clickhouse-analytics.ts`, add before `mapFunnelSteps`:

```ts
function mapDimensionGroups(rows: ClickHouseRow[]): AnalyticsDimensionGroup[] {
  const groups = new Map<AnalyticsDimensionKey, AnalyticsDimensionGroup>();

  for (const dimension of ANALYTICS_DIMENSIONS) {
    groups.set(dimension.key, {
      key: dimension.key,
      label: dimension.label,
      items: [],
    });
  }

  for (const row of rows) {
    const key = String(row.dimension_key ?? "") as AnalyticsDimensionKey;
    const group = groups.get(key);

    if (!group) {
      continue;
    }

    const eventCount = toNumber(row.event_count);
    const uniqueUsers = toNumber(row.unique_users);
    const totalEvents = toNumber(row.total_events);
    const shareValue = totalEvents > 0 ? eventCount / totalEvents : 0;

    group.items.push({
      value: String(row.dimension_value ?? "未提供"),
      eventCount: formatCompact(eventCount),
      eventCountValue: eventCount,
      uniqueUsers: formatCompact(uniqueUsers),
      uniqueUsersValue: uniqueUsers,
      share: formatPercent(eventCount, totalEvents),
      shareValue,
    });
  }

  return Array.from(groups.values());
}
```

- [ ] **Step 7: Wire the dimension query into the loader**

In `createClickHouseAnalyticsClientFromEnv(...).loadAnalytics`, add `dimensionRows` to the `Promise.all` destructuring immediately after `retentionRows`:

```ts
const [
  overviewRows,
  validationRows,
  trendRows,
  retentionRows,
  dimensionRows,
  funnelRows,
  propertyRows,
] = await Promise.all([
```

Add the dimension request after retention:

```ts
queryClickHouseRows(
  fetchImpl,
  buildClickHouseUrl(
    clickHouseUrl,
    database,
    buildDimensionDistributionQuery(filters),
  ),
  headers,
),
```

Add `dimensionGroups` to the return value:

```ts
return {
  source: "clickhouse",
  metrics: mapMetrics(overviewRows[0], validationRows[0], filters),
  trendItems: mapTrendItems(trendRows),
  retentionItems: mapRetentionItems(retentionRows),
  dimensionGroups: mapDimensionGroups(dimensionRows),
  funnelSteps: mapFunnelSteps(funnelRows),
  propertyItems: mapPropertyItems(propertyRows, filters.propertyKey),
  propertyKeyCount: propertyKeyCount(propertyRows),
};
```

- [ ] **Step 8: Run focused analytics tests**

Run:

```bash
pnpm --filter web test -- src/lib/analytics/clickhouse-analytics.test.ts
```

Expected: PASS. If existing tests count requests, update expectations so no-event-name cases include the new dimension query and event-name cases include both dimension and property queries.

- [ ] **Step 9: Commit Task 1**

Because the worktree contains unrelated local changes, stage only these files:

```bash
git add apps/web/src/lib/trackinghub/types.ts apps/web/src/lib/analytics/clickhouse-analytics.ts apps/web/src/lib/analytics/clickhouse-analytics.test.ts
git commit -m "feat: 添加分析维度分布查询"
```

## Task 2: Analytics Workbench Distribution Cards

**Files:**
- Modify: `apps/web/src/app/analytics/page.tsx`
- Modify: `apps/web/src/components/trackinghub/analytics-workbench.tsx`
- Test: `apps/web/src/components/trackinghub/analytics-workbench-client.test.tsx`

- [ ] **Step 1: Write failing component expectations**

In `apps/web/src/components/trackinghub/analytics-workbench-client.test.tsx`, include `dimensionGroups` in the mocked API payload:

```ts
dimensionGroups: [
  {
    key: "app_version",
    label: "App 版本",
    items: [
      {
        value: "1.5.1",
        eventCount: "999",
        eventCountValue: 999,
        uniqueUsers: "88",
        uniqueUsersValue: 88,
        share: "62.4%",
        shareValue: 0.624,
      },
    ],
  },
],
```

Pass initial `dimensionGroups` into `AnalyticsWorkbench`:

```tsx
dimensionGroups={[
  {
    key: "country",
    label: "用户地区",
    items: [
      {
        value: "US",
        eventCount: "120",
        eventCountValue: 120,
        uniqueUsers: "46",
        uniqueUsersValue: 46,
        share: "48.0%",
        shareValue: 0.48,
      },
    ],
  },
]}
```

Add assertions after initial render:

```ts
expect(document.body.textContent).toContain("用户分布");
expect(document.body.textContent).toContain("用户地区");
expect(document.body.textContent).toContain("US");
expect(document.body.textContent).toContain("48.0%");
```

Add assertions after refresh:

```ts
expect(document.body.textContent).toContain("App 版本");
expect(document.body.textContent).toContain("1.5.1");
expect(document.body.textContent).toContain("62.4%");
```

- [ ] **Step 2: Run the focused failing component test**

Run:

```bash
pnpm --filter web test -- src/components/trackinghub/analytics-workbench-client.test.tsx
```

Expected: FAIL because `AnalyticsWorkbench` does not accept or render `dimensionGroups` yet.

- [ ] **Step 3: Pass dimension groups from the page**

In `apps/web/src/app/analytics/page.tsx`, add `dimensionGroups` to the unavailable fallback:

```ts
const unavailable = {
  source: "unavailable" as const,
  metrics: [],
  funnelSteps: [],
  trendItems: [],
  propertyItems: [],
  propertyKeyCount: 0,
  dimensionGroups: [],
};
```

Pass the prop into `AnalyticsWorkbench`:

```tsx
<AnalyticsWorkbench
  dimensionGroups={workbench.dimensionGroups}
  filters={filters}
  funnelSteps={workbench.funnelSteps}
  metrics={workbench.metrics}
  propertyKeyCount={workbench.propertyKeyCount}
  propertyItems={workbench.propertyItems}
  source={workbench.source}
  trendItems={workbench.trendItems}
/>
```

- [ ] **Step 4: Add component props and local state**

In `apps/web/src/components/trackinghub/analytics-workbench.tsx`, import the dimension type:

```ts
import type {
  AnalyticsDimensionGroup,
  AnalyticsFunnelStep,
  AnalyticsPropertyValueItem,
  AnalyticsTrendItem,
  StatusCard,
} from "@/lib/trackinghub/types";
```

Add `dimensionGroups` to `AnalyticsWorkbenchData`:

```ts
type AnalyticsWorkbenchData = Pick<
  AnalyticsData,
  | "source"
  | "metrics"
  | "trendItems"
  | "funnelSteps"
  | "propertyItems"
  | "propertyKeyCount"
  | "dimensionGroups"
>;
```

Add `dimensionGroups` to props and initial state:

```tsx
export function AnalyticsWorkbench({
  dimensionGroups,
  filters,
  metrics,
  funnelSteps,
  propertyKeyCount,
  propertyItems,
  trendItems,
  source,
}: {
  dimensionGroups: AnalyticsDimensionGroup[];
  filters: AnalyticsFilters;
  metrics: StatusCard[];
  funnelSteps: AnalyticsFunnelStep[];
  propertyKeyCount: number;
  propertyItems: AnalyticsPropertyValueItem[];
  trendItems: AnalyticsTrendItem[];
  source: "clickhouse" | "unavailable";
}) {
```

Initialize state with `dimensionGroups`:

```ts
const [workbenchData, setWorkbenchData] = useState<AnalyticsWorkbenchData>({
  dimensionGroups,
  funnelSteps,
  metrics,
  propertyKeyCount,
  propertyItems,
  source,
  trendItems,
});
```

Update `refreshAnalytics` state assignment:

```ts
setWorkbenchData({
  dimensionGroups: nextAnalytics.dimensionGroups,
  funnelSteps: nextAnalytics.funnelSteps,
  metrics: nextAnalytics.metrics,
  propertyKeyCount: nextAnalytics.propertyKeyCount,
  propertyItems: nextAnalytics.propertyItems,
  source: nextAnalytics.source,
  trendItems: nextAnalytics.trendItems,
});
```

- [ ] **Step 5: Add reusable distribution UI**

In `apps/web/src/components/trackinghub/analytics-workbench.tsx`, add before `PropertyAnalysis`:

```tsx
function DimensionDistribution({
  groups,
}: {
  groups: AnalyticsDimensionGroup[];
}) {
  const visibleGroups = groups.filter((group) => group.items.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl tracking-normal">用户分布</CardTitle>
      </CardHeader>
      <CardContent>
        {visibleGroups.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {visibleGroups.map((group) => (
              <div
                className="rounded-lg border border-border bg-card p-4"
                key={group.key}
              >
                <div className="text-sm font-semibold">{group.label}</div>
                <div className="mt-4 grid gap-3">
                  {group.items.map((item) => (
                    <div className="grid gap-1.5" key={`${group.key}:${item.value}`}>
                      <div className="flex items-start justify-between gap-3 text-sm">
                        <span
                          className="min-w-0 truncate font-mono text-xs"
                          title={item.value}
                        >
                          {item.value}
                        </span>
                        <span className="shrink-0 font-semibold">{item.share}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-chart-4"
                          style={{
                            width: `${Math.max(3, Math.min(100, item.shareValue * 100))}%`,
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>事件 {item.eventCount}</span>
                        <span>用户 {item.uniqueUsers}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            当前筛选范围暂无用户分布数据。
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

Render it below the metric card section:

```tsx
<DimensionDistribution groups={workbenchData.dimensionGroups} />
```

- [ ] **Step 6: Run focused component test**

Run:

```bash
pnpm --filter web test -- src/components/trackinghub/analytics-workbench-client.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

Stage only these files:

```bash
git add apps/web/src/app/analytics/page.tsx apps/web/src/components/trackinghub/analytics-workbench.tsx apps/web/src/components/trackinghub/analytics-workbench-client.test.tsx
git commit -m "feat: 展示用户维度分布"
```

## Task 3: SDK Device Context Contract Tests

**Files:**
- Modify: `packages/web-sdk/src/index.test.ts`
- Modify: `packages/flutter-sdk/test/trackinghub_client_test.dart`

- [ ] **Step 1: Update Web SDK envelope contract test**

In `packages/web-sdk/src/index.test.ts`, update the first test client context:

```ts
context: {
  locale: "en-US",
  timezone: "Asia/Shanghai",
  os_name: "iOS",
  os_version: "18.4",
  device_model: "iPhone16,2",
},
```

Update the expected `context` object:

```ts
context: {
  locale: "en-US",
  timezone: "Asia/Shanghai",
  os_name: "iOS",
  os_version: "18.4",
  device_model: "iPhone16,2",
},
```

- [ ] **Step 2: Run Web SDK focused test**

Run:

```bash
pnpm --filter @trackinghub/web-sdk test
```

Expected: PASS. This should pass without implementation changes because the Web SDK already merges and forwards `context`.

- [ ] **Step 3: Update Flutter SDK envelope contract test**

In `packages/flutter-sdk/test/trackinghub_client_test.dart`, update the first test event context:

```dart
context: const {
  'locale': 'en-US',
  'timezone': 'Asia/Shanghai',
  'os_name': 'iOS',
  'os_version': '18.4',
  'device_model': 'iPhone16,2',
},
```

Update the expected `context` map:

```dart
'context': {
  'locale': 'en-US',
  'timezone': 'Asia/Shanghai',
  'os_name': 'iOS',
  'os_version': '18.4',
  'device_model': 'iPhone16,2',
},
```

- [ ] **Step 4: Run Flutter SDK focused tests**

Run:

```bash
cd packages/flutter-sdk && dart test
```

Expected: PASS. This should pass without implementation changes because the Flutter SDK already serializes `context`.

- [ ] **Step 5: Commit Task 3**

Stage only these files:

```bash
git add packages/web-sdk/src/index.test.ts packages/flutter-sdk/test/trackinghub_client_test.dart
git commit -m "test: 固定设备上下文采集契约"
```

## Task 4: Full Regression And Integration Review

**Files:**
- Review: `apps/web/src/lib/analytics/clickhouse-analytics.ts`
- Review: `apps/web/src/components/trackinghub/analytics-workbench.tsx`
- Review: `apps/web/src/app/analytics/page.tsx`
- Review: `packages/web-sdk/src/index.test.ts`
- Review: `packages/flutter-sdk/test/trackinghub_client_test.dart`

- [ ] **Step 1: Run focused web tests**

Run:

```bash
pnpm --filter web test -- src/lib/analytics/clickhouse-analytics.test.ts src/components/trackinghub/analytics-workbench-client.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run SDK tests**

Run:

```bash
pnpm --filter @trackinghub/web-sdk test
cd packages/flutter-sdk && dart test
```

Expected: PASS for both commands.

- [ ] **Step 3: Run full repo check**

Run from repo root:

```bash
pnpm run check
```

Expected: PASS for lint, tests, and Next build.

- [ ] **Step 4: Inspect final diff for scope**

Run:

```bash
git diff --stat HEAD
git diff -- apps/web/src/lib/analytics/clickhouse-analytics.ts apps/web/src/components/trackinghub/analytics-workbench.tsx
```

Expected: Diff only covers analytics dimension data, analytics UI rendering, and SDK contract tests. It should not include unrelated auth, navigation, report, or settings changes.

- [ ] **Step 5: Commit final fixes if any**

If Step 1-4 uncovered small fixes, stage only touched files and commit:

```bash
git add apps/web/src/lib/analytics/clickhouse-analytics.ts apps/web/src/lib/analytics/clickhouse-analytics.test.ts apps/web/src/app/analytics/page.tsx apps/web/src/components/trackinghub/analytics-workbench.tsx apps/web/src/components/trackinghub/analytics-workbench-client.test.tsx packages/web-sdk/src/index.test.ts packages/flutter-sdk/test/trackinghub_client_test.dart
git commit -m "fix: 收口分析维度分布"
```

Skip this commit if there are no additional fixes after Task 1-3 commits.

## Self-Review

- Spec coverage:
  - App版本、用户地区、渠道、设备系统、设备型号：Task 1 implements configured dimensions.
  - 统一后端模型：Task 1 adds `dimensionGroups` and mapping.
  - `/analytics` 用户分布区域：Task 2 renders distribution cards.
  - 设备字段从 `context` 抽取：Task 1 uses `JSONExtractString(context, ...)`.
  - SDK 采集契约：Task 3 fixes pass-through tests for Web and Flutter SDKs.
  - 不改 ClickHouse 表结构、不改报告生成：No task touches schema or reports.
- Placeholder scan:
  - No deferred implementation placeholders.
  - Each code-changing step includes concrete snippets and commands.
- Type consistency:
  - `AnalyticsDimensionKey`、`AnalyticsDimensionItem`、`AnalyticsDimensionGroup` are defined in Task 1 before being imported in Task 2.
  - `dimensionGroups` is added to `AnalyticsData`, server fallback, component props, state, and API refresh payload handling.
