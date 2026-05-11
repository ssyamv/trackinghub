import { describe, expect, it } from "vitest";

import { validateTrackingEnvelope } from "./envelope";

const validPayload = {
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
    price: 19.9,
    currency: "USD",
    source_page: "product_detail",
  },
  context: {
    locale: "en-US",
    timezone: "Asia/Shanghai",
  },
};

describe("validateTrackingEnvelope", () => {
  it("accepts a valid Web payload", () => {
    expect(validateTrackingEnvelope(validPayload)).toEqual({
      ok: true,
      value: validPayload,
    });
  });

  it("accepts Magic Frame App production environment names", () => {
    const payload = { ...validPayload, environment: "production" };

    expect(validateTrackingEnvelope(payload)).toEqual({
      ok: true,
      value: payload,
    });
  });

  it("rejects missing required fields", () => {
    const payload: Record<string, unknown> = { ...validPayload };
    delete payload.event_name;

    expect(validateTrackingEnvelope(payload)).toEqual({
      ok: false,
      errors: ["event_name is required"],
    });
  });

  it("rejects unsupported sources", () => {
    expect(validateTrackingEnvelope({ ...validPayload, source: "ios" })).toEqual({
      ok: false,
      errors: ["source must be one of web, flutter"],
    });
  });

  it("rejects invalid timestamp values", () => {
    expect(validateTrackingEnvelope({ ...validPayload, timestamp: "now" })).toEqual({
      ok: false,
      errors: ["timestamp must be an epoch millisecond number"],
    });
  });

  it("rejects non-object properties", () => {
    expect(validateTrackingEnvelope({ ...validPayload, properties: [] })).toEqual({
      ok: false,
      errors: ["properties must be an object"],
    });
  });
});
