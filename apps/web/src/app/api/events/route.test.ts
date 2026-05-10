import { describe, expect, it } from "vitest";

import { handleEventPost, POST } from "./route";

const payload = {
  project_id: "project_x",
  environment: "prod",
  source: "web",
  event_name: "pay_button_click",
  user_id: "u_123",
  anonymous_id: "anon_123",
  device_id: "device_456",
  session_id: "session_789",
  timestamp: 1710000000000,
  app_version: "1.2.0",
  sdk_version: "0.1.0",
  channel: "google",
  campaign: "spring_sale",
  country: "US",
  properties: {
    product_id: "p_123",
  },
  context: {
    locale: "en-US",
  },
};

describe("POST /api/events", () => {
  it("accepts a valid event envelope", async () => {
    const response = await POST(
      new Request("http://localhost/api/events", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({
      accepted: true,
      event_name: "pay_button_click",
    });
  });

  it("returns validation errors for invalid event envelopes", async () => {
    const response = await POST(
      new Request("http://localhost/api/events", {
        method: "POST",
        body: JSON.stringify({ ...payload, event_name: "" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      accepted: false,
      errors: ["event_name is required"],
    });
  });

  it("returns malformed json errors", async () => {
    const response = await POST(
      new Request("http://localhost/api/events", {
        method: "POST",
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      accepted: false,
      errors: ["request body must be valid JSON"],
    });
  });

  it("persists valid event envelopes before accepting them", async () => {
    const persistedEvents: unknown[] = [];
    const validationResults: unknown[] = [];

    const response = await handleEventPost(
      new Request("http://localhost/api/events", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
      {
        eventWriter: {
          writeRawEvent: async (event) => {
            persistedEvents.push(event);
          },
          writeValidationResult: async (result) => {
            validationResults.push(result);
          },
        },
        createEventId: () => "event_123",
        now: () => new Date("2026-05-10T07:30:00.000Z"),
      },
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({
      accepted: true,
      event_id: "event_123",
      event_name: "pay_button_click",
      received_at: "2026-05-10T07:30:00.000Z",
    });
    expect(persistedEvents).toEqual([
      {
        ...payload,
        event_id: "event_123",
        received_at: "2026-05-10T07:30:00.000Z",
      },
    ]);
    expect(validationResults).toEqual([
      {
        id: "validation_event_123",
        project_id: "project_x",
        event_definition_id: "pay_button_click",
        event_name: "pay_button_click",
        environment: "prod",
        source: "web",
        status: "invalid",
        errors: [
          "price is required",
          "currency is required",
          "source_page is required",
        ],
        sample_event_id: "event_123",
        observed_at: "2026-05-10T07:30:00.000Z",
      },
    ]);
  });

  it("returns a persistence error when raw event storage fails", async () => {
    const response = await handleEventPost(
      new Request("http://localhost/api/events", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
      {
        eventWriter: {
          writeRawEvent: async () => {
            throw new Error("ClickHouse unavailable");
          },
        },
        createEventId: () => "event_123",
        now: () => new Date("2026-05-10T07:30:00.000Z"),
      },
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      accepted: false,
      errors: ["event persistence is unavailable"],
    });
  });
});
