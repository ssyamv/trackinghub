import { describe, expect, it } from "vitest";

import { eventDefinitionToSchema, validateEventSchema } from "./schema-validation";
import type { TrackingEnvelope } from "./envelope";

const payload: TrackingEnvelope = {
  project_id: "project_x",
  environment: "prod",
  source: "web",
  event_name: "pay_button_click",
  timestamp: 1710000000000,
  sdk_version: "0.1.0",
  properties: {
    product_id: "p_123",
    price: 19.9,
    currency: "USD",
    source_page: "product_detail",
  },
  context: {},
};

describe("validateEventSchema", () => {
  it("marks known events with matching required properties as valid", () => {
    expect(validateEventSchema(payload, "event_123", "2026-05-10T07:30:00.000Z")).toEqual({
      id: "validation_event_123",
      project_id: "project_x",
      event_definition_id: "pay_button_click",
      event_name: "pay_button_click",
      environment: "prod",
      source: "web",
      status: "valid",
      errors: [],
      sample_event_id: "event_123",
      observed_at: "2026-05-10T07:30:00.000Z",
    });
  });

  it("captures missing required properties and type mismatches", () => {
    const result = validateEventSchema(
      {
        ...payload,
        properties: {
          product_id: "p_123",
          price: "19.9",
        },
      },
      "event_123",
      "2026-05-10T07:30:00.000Z",
    );

    expect(result.status).toBe("invalid");
    expect(result.errors).toEqual([
      "price must be number",
      "currency is required",
      "source_page is required",
    ]);
  });

  it("marks unknown events explicitly", () => {
    const result = validateEventSchema(
      { ...payload, event_name: "unknown_event" },
      "event_123",
      "2026-05-10T07:30:00.000Z",
    );

    expect(result.status).toBe("unknown_event");
    expect(result.errors).toEqual(["event definition not found"]);
    expect(result.event_definition_id).toBeNull();
  });

  it("validates events with a schema converted from metadata definitions", () => {
    const metadataSchema = eventDefinitionToSchema({
      id: "event_definition_1",
      projectId: "project_x",
      projectName: "Magic Frame",
      name: "photo_shared",
      displayName: "图片分享",
      description: "用户分享图片",
      triggerTiming: "分享成功后",
      module: "share",
      platforms: ["web"],
      status: "accepted",
      requiredProperties: [
        {
          name: "channel",
          type: "string",
          required: true,
          description: "分享渠道",
          exampleValue: "wechat",
        },
      ],
      optionalProperties: [],
      lastSeenAt: null,
    });

    expect(
      validateEventSchema(
        {
          ...payload,
          event_name: "photo_shared",
          properties: { channel: "wechat" },
        },
        "event_456",
        "2026-05-10T07:31:00.000Z",
        metadataSchema,
      ),
    ).toMatchObject({
      event_definition_id: "event_definition_1",
      event_name: "photo_shared",
      status: "valid",
      errors: [],
    });
  });
});
