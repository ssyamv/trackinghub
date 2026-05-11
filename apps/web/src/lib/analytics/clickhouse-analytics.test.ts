import { describe, expect, it } from "vitest";

import { createClickHouseAnalyticsClientFromEnv } from "./clickhouse-analytics";

describe("createClickHouseAnalyticsClientFromEnv", () => {
  it("returns null when ClickHouse is not configured", () => {
    expect(createClickHouseAnalyticsClientFromEnv({})).toBeNull();
  });

  it("loads overview and trend analytics without defaulting to fake funnel steps", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
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
    ];

    const client = createClickHouseAnalyticsClientFromEnv(
      {
        TRACKINGHUB_CLICKHOUSE_URL: "https://clickhouse.example.com",
        TRACKINGHUB_CLICKHOUSE_DATABASE: "trackinghub",
        TRACKINGHUB_CLICKHOUSE_USERNAME: "reader",
        TRACKINGHUB_CLICKHOUSE_PASSWORD: "secret",
      },
      async (url, init) => {
        requests.push({ url: String(url), init });
        const body = responses
          .shift()
          ?.map((row) => JSON.stringify(row))
          .join("\n");
        return new Response(`${body ?? ""}\n`, { status: 200 });
      },
    );

    const result = await client?.loadAnalytics();

    expect(result).toEqual({
      source: "clickhouse",
      metrics: [
        {
          label: "事件量",
          value: "2.7k",
          detail: "最近 7 天接收事件",
          tone: "blue",
        },
        {
          label: "活跃用户",
          value: "184",
          detail: "最近 7 天去重用户",
          tone: "green",
        },
        {
          label: "最近接收",
          value: "05-10 08:30",
          detail: "raw_events 最新 received_at",
          tone: "purple",
        },
        {
          label: "异常占比",
          value: "15.0%",
          detail: "3 / 20 条验证异常",
          tone: "red",
        },
      ],
      trendItems: [
        {
          bucket: "05-10 00:00",
          eventName: "pay_button_click",
          environment: "prod",
          source: "web",
          eventCount: "120",
          eventCountValue: 120,
          uniqueUsers: "88",
          uniqueUsersValue: 88,
        },
      ],
      propertyItems: [],
      propertyKeyCount: 0,
      funnelSteps: [],
      retentionItems: [
        {
          cohort: "2026-05-10",
          day: 1,
          cohortUsers: "100",
          cohortUsersValue: 100,
          retainedUsers: "42",
          retainedUsersValue: 42,
          retention: "42.0%",
          retentionRate: 0.42,
        },
      ],
    });
    expect(requests).toHaveLength(4);
    expect(requests[0].url).toContain("database=trackinghub");
    expect(requests[0].url).toContain("FROM+raw_events");
    expect(requests[1].url).toContain("FROM+event_validation_results");
    expect(requests[2].url).toContain("GROUP+BY+bucket%2C+event_name");
    expect(requests[3].url).toContain("cohort_sizes");
    expect(requests[0].init?.headers).toMatchObject({
      Authorization: "Basic cmVhZGVyOnNlY3JldA==",
    });
  });

  it("applies URL-level analytics filters to ClickHouse queries", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const responses = [
      [{ event_count: "42", active_users: "9", last_received_at: "" }],
      [{ validation_count: "4", invalid_count: "1" }],
      [],
      [],
    ];

    const client = createClickHouseAnalyticsClientFromEnv(
      {
        TRACKINGHUB_CLICKHOUSE_URL: "https://clickhouse.example.com",
      },
      async (url, init) => {
        requests.push({ url: String(url), init });
        const body = responses
          .shift()
          ?.map((row) => JSON.stringify(row))
          .join("\n");
        return new Response(`${body ?? ""}\n`, { status: 200 });
      },
    );

    const result = await client?.loadAnalytics({
      projectId: "project_a",
      environment: "prod",
      source: "web",
      eventName: "pay_button_click",
      granularity: "hour",
      range: "30d",
    });

    expect(result?.metrics[0]).toMatchObject({
      label: "事件量",
      detail: "最近 30 天接收事件",
    });

    const decodedQueries = requests.map((request) =>
      decodeURIComponent(new URL(request.url).searchParams.get("query") ?? ""),
    );

    expect(decodedQueries[0]).toContain("timestamp >= now() - INTERVAL 30 DAY");
    expect(decodedQueries[0]).toContain("project_id = 'project_a'");
    expect(decodedQueries[0]).toContain("environment = 'prod'");
    expect(decodedQueries[0]).toContain("source = 'web'");
    expect(decodedQueries[0]).toContain("event_name = 'pay_button_click'");
    expect(decodedQueries[1]).toContain("observed_at >= now() - INTERVAL 30 DAY");
    expect(decodedQueries[1]).toContain("project_id = 'project_a'");
    expect(decodedQueries[2]).toContain("toStartOfHour(timestamp) AS bucket");
    expect(decodedQueries[2]).toContain("event_name = 'pay_button_click'");
    expect(decodedQueries[2]).toContain("LIMIT 720");
    expect(decodedQueries[3]).toContain("cohort_sizes");
    expect(decodedQueries[3]).toContain("event_name = 'pay_button_click'");
    expect(decodedQueries[4]).toContain("JSONExtractKeysAndValuesRaw(properties)");
    expect(requests).toHaveLength(5);
  });

  it("applies custom date range filters to ClickHouse queries", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const responses = [
      [{ event_count: "3447", active_users: "217", last_received_at: "" }],
      [{ validation_count: "3447", invalid_count: "0" }],
      [],
      [],
    ];

    const client = createClickHouseAnalyticsClientFromEnv(
      {
        TRACKINGHUB_CLICKHOUSE_URL: "https://clickhouse.example.com",
      },
      async (url, init) => {
        requests.push({ url: String(url), init });
        const body = responses
          .shift()
          ?.map((row) => JSON.stringify(row))
          .join("\n");
        return new Response(`${body ?? ""}\n`, { status: 200 });
      },
    );

    const result = await client?.loadAnalytics({
      date_from: "2026-05-05",
      date_to: "2026-05-11",
    });

    expect(result?.metrics[0]).toMatchObject({
      label: "事件量",
      detail: "2026-05-05 至 2026-05-11 接收事件",
    });

    const decodedQueries = requests.map((request) =>
      decodeURIComponent(new URL(request.url).searchParams.get("query") ?? ""),
    );

    expect(decodedQueries[0]).toContain(
      "timestamp >= toDateTime64('2026-05-05 00:00:00', 3, 'UTC')",
    );
    expect(decodedQueries[0]).toContain(
      "timestamp < toDateTime64('2026-05-11 00:00:00', 3, 'UTC') + INTERVAL 1 DAY",
    );
    expect(decodedQueries[1]).toContain(
      "observed_at >= toDateTime64('2026-05-05 00:00:00', 3, 'UTC')",
    );
    expect(decodedQueries[2]).toContain("LIMIT 168");
    expect(decodedQueries[3]).toContain(
      "timestamp >= toDateTime64('2026-05-05 00:00:00', 3, 'UTC')",
    );
    expect(decodedQueries[0]).not.toContain("now() - INTERVAL");
  });

  it("uses configurable funnel steps from URL filters", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const responses = [
      [{ event_count: "10", active_users: "5", last_received_at: "" }],
      [{ validation_count: "0", invalid_count: "0" }],
      [],
      [],
      [
        { step: "3", event_name: "signup_success", users: "50" },
        { step: "1", event_name: "signup_view", users: "100" },
        { step: "2", event_name: "signup_submit", users: "75" },
      ],
    ];

    const client = createClickHouseAnalyticsClientFromEnv(
      {
        TRACKINGHUB_CLICKHOUSE_URL: "https://clickhouse.example.com",
      },
      async (url, init) => {
        requests.push({ url: String(url), init });
        const body = responses
          .shift()
          ?.map((row) => JSON.stringify(row))
          .join("\n");
        return new Response(`${body ?? ""}\n`, { status: 200 });
      },
    );

    const result = await client?.loadAnalytics({
      funnel_steps: "signup_view, signup_submit, signup_success",
      environment: "prod",
    });

    const funnelQuery = decodeURIComponent(
      new URL(requests[4].url).searchParams.get("query") ?? "",
    );

    expect(result?.funnelSteps).toEqual([
      {
        step: "1",
        eventName: "signup_view",
        users: "100",
        usersValue: 100,
        conversion: "100%",
        conversionRate: 1,
      },
      {
        step: "2",
        eventName: "signup_submit",
        users: "75",
        usersValue: 75,
        conversion: "75.0%",
        conversionRate: 0.75,
      },
      {
        step: "3",
        eventName: "signup_success",
        users: "50",
        usersValue: 50,
        conversion: "50.0%",
        conversionRate: 0.5,
      },
    ]);
    expect(funnelQuery).toContain(
      "event_name IN ('signup_view', 'signup_submit', 'signup_success')",
    );
    expect(funnelQuery).toContain(
      "SELECT '3' AS step, 'signup_success' AS event_name",
    );
    expect(funnelQuery).not.toContain("subscription_success");
    expect(funnelQuery).not.toContain("step_4_at");
  });

  it("loads all event property value distributions when an event is selected", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const responses = [
      [{ event_count: "240", active_users: "90", last_received_at: "" }],
      [{ validation_count: "240", invalid_count: "0" }],
      [],
      [],
      [
        {
          property_key: "source_page",
          property_value: "home",
          event_count: "120",
          unique_users: "70",
          distinct_values: "3",
        },
        {
          property_key: "source_page",
          property_value: "detail",
          event_count: "80",
          unique_users: "45",
          distinct_values: "3",
        },
        {
          property_key: "button_type",
          property_value: "primary",
          event_count: "60",
          unique_users: "40",
          distinct_values: "1",
        },
      ],
    ];

    const client = createClickHouseAnalyticsClientFromEnv(
      {
        TRACKINGHUB_CLICKHOUSE_URL: "https://clickhouse.example.com",
      },
      async (url, init) => {
        requests.push({ url: String(url), init });
        const body = responses
          .shift()
          ?.map((row) => JSON.stringify(row))
          .join("\n");
        return new Response(`${body ?? ""}\n`, { status: 200 });
      },
    );

    const result = await client?.loadAnalytics({
      event_name: "pay_button_click",
    });

    const propertyQuery = decodeURIComponent(
      new URL(requests[4].url).searchParams.get("query") ?? "",
    );

    expect(requests).toHaveLength(5);
    expect(propertyQuery).toContain("event_name = 'pay_button_click'");
    expect(propertyQuery).toContain("JSONExtractKeysAndValuesRaw(properties)");
    expect(propertyQuery).toContain("uniqExact(identity) AS unique_users");
    expect(result?.propertyKeyCount).toBe(2);
    expect(result?.propertyItems).toEqual([
      {
        distinctValues: 3,
        propertyKey: "source_page",
        propertyValue: "home",
        eventCount: "120",
        eventCountValue: 120,
        uniqueUsers: "70",
        uniqueUsersValue: 70,
      },
      {
        distinctValues: 3,
        propertyKey: "source_page",
        propertyValue: "detail",
        eventCount: "80",
        eventCountValue: 80,
        uniqueUsers: "45",
        uniqueUsersValue: 45,
      },
      {
        distinctValues: 1,
        propertyKey: "button_type",
        propertyValue: "primary",
        eventCount: "60",
        eventCountValue: 60,
        uniqueUsers: "40",
        uniqueUsersValue: 40,
      },
    ]);
  });
});
