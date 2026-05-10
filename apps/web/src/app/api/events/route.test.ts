import { describe, expect, it } from "vitest";

import { POST } from "./route";

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
});
