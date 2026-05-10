import { describe, expect, it } from "vitest";

import {
  createEventWriterFromEnv,
  type PersistedTrackingEvent,
} from "./event-writer";

const event: PersistedTrackingEvent = {
  event_id: "event_123",
  project_id: "project_x",
  environment: "prod",
  source: "web",
  event_name: "pay_button_click",
  user_id: "u_123",
  anonymous_id: "anon_123",
  device_id: "device_456",
  session_id: "session_789",
  timestamp: 1710000000000,
  received_at: "2026-05-10T07:30:00.000Z",
  app_version: "1.2.0",
  sdk_version: "0.1.0",
  channel: "google",
  campaign: "spring_sale",
  country: "US",
  properties: {
    product_id: "p_123",
    price: 19.9,
  },
  context: {
    locale: "en-US",
  },
};

describe("createEventWriterFromEnv", () => {
  it("uses a no-op writer when ClickHouse is not configured", async () => {
    const writer = createEventWriterFromEnv({}, async () => {
      throw new Error("fetch should not be called");
    });

    await expect(writer.writeRawEvent(event)).resolves.toBeUndefined();
  });

  it("inserts raw events into ClickHouse using JSONEachRow", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const writer = createEventWriterFromEnv(
      {
        TRACKINGHUB_CLICKHOUSE_URL: "https://clickhouse.example.com",
        TRACKINGHUB_CLICKHOUSE_DATABASE: "trackinghub",
        TRACKINGHUB_CLICKHOUSE_USERNAME: "writer",
        TRACKINGHUB_CLICKHOUSE_PASSWORD: "secret",
      },
      async (url, init) => {
        requests.push({ url: String(url), init });
        return new Response("Ok.", { status: 200 });
      },
    );

    await writer.writeRawEvent(event);

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toContain("database=trackinghub");
    expect(requests[0].url).toContain("INSERT+INTO+raw_events");
    expect(requests[0].init?.method).toBe("POST");
    expect(requests[0].init?.headers).toMatchObject({
      Authorization: "Basic d3JpdGVyOnNlY3JldA==",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(requests[0].init?.body))).toEqual({
      event_id: "event_123",
      project_id: "project_x",
      environment: "prod",
      source: "web",
      event_name: "pay_button_click",
      user_id: "u_123",
      anonymous_id: "anon_123",
      device_id: "device_456",
      session_id: "session_789",
      timestamp: "2024-03-09T16:00:00.000Z",
      received_at: "2026-05-10T07:30:00.000Z",
      app_version: "1.2.0",
      sdk_version: "0.1.0",
      channel: "google",
      campaign: "spring_sale",
      country: "US",
      properties: JSON.stringify(event.properties),
      context: JSON.stringify(event.context),
    });
  });

  it("inserts validation results into ClickHouse using JSONEachRow", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const writer = createEventWriterFromEnv(
      {
        TRACKINGHUB_CLICKHOUSE_URL: "https://clickhouse.example.com",
        TRACKINGHUB_CLICKHOUSE_DATABASE: "trackinghub",
      },
      async (url, init) => {
        requests.push({ url: String(url), init });
        return new Response("Ok.", { status: 200 });
      },
    );

    await writer.writeValidationResult({
      id: "validation_event_123",
      project_id: "project_x",
      event_definition_id: "pay_button_click",
      event_name: "pay_button_click",
      environment: "prod",
      source: "web",
      status: "invalid",
      errors: ["price must be number"],
      sample_event_id: "event_123",
      observed_at: "2026-05-10T07:30:00.000Z",
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toContain("INSERT+INTO+event_validation_results");
    expect(JSON.parse(String(requests[0].init?.body))).toEqual({
      id: "validation_event_123",
      project_id: "project_x",
      event_definition_id: "pay_button_click",
      event_name: "pay_button_click",
      environment: "prod",
      source: "web",
      status: "invalid",
      errors: JSON.stringify(["price must be number"]),
      sample_event_id: "event_123",
      observed_at: "2026-05-10T07:30:00.000Z",
    });
  });
});
