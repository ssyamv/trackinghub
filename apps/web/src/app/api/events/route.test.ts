import { describe, expect, it } from "vitest";

import { handleEventPost, POST } from "./route";
import {
  createMemoryMetadataStore,
  hashSdkWriteKey,
} from "@/lib/metadata/metadata-store";

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

  it("rejects events when metadata-backed SDK write key validation fails", async () => {
    const store = createMemoryMetadataStore();
    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web"],
    });
    await store.upsertEnvironment(project.id, {
      name: "prod",
      enabled: true,
      lastEventAt: null,
    });
    await store.createSdkKey(project.id, "prod", {
      source: "web",
      maskedKey: "write_key_live_****91",
      status: "active",
      keyHash: hashSdkWriteKey("expected_write_key"),
    });

    const response = await handleEventPost(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "x-trackinghub-write-key": "wrong_write_key" },
        body: JSON.stringify({ ...payload, project_id: project.id }),
      }),
      {
        metadataStore: store,
        eventWriter: {
          writeRawEvent: async () => undefined,
          writeValidationResult: async () => undefined,
        },
      },
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      accepted: false,
      errors: ["invalid write key"],
    });
  });

  it("validates metadata-backed event definitions before persistence", async () => {
    const store = createMemoryMetadataStore();
    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web"],
    });
    await store.upsertEnvironment(project.id, {
      name: "prod",
      enabled: true,
      lastEventAt: null,
    });
    await store.createSdkKey(project.id, "prod", {
      source: "web",
      maskedKey: "write_key_live_****91",
      status: "active",
      keyHash: hashSdkWriteKey("expected_write_key"),
    });
    const definition = await store.createEventDefinition({
      projectId: project.id,
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
    });
    const validationResults: unknown[] = [];

    const response = await handleEventPost(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "x-trackinghub-write-key": "expected_write_key" },
        body: JSON.stringify({
          ...payload,
          project_id: project.id,
          event_name: "photo_shared",
          properties: { channel: "wechat" },
        }),
      }),
      {
        metadataStore: store,
        eventWriter: {
          writeRawEvent: async () => undefined,
          writeValidationResult: async (result) => {
            validationResults.push(result);
          },
        },
        createEventId: () => "event_456",
        now: () => new Date("2026-05-10T07:31:00.000Z"),
      },
    );

    expect(response.status).toBe(202);
    expect(validationResults).toEqual([
      {
        id: "validation_event_456",
        project_id: project.id,
        event_definition_id: definition.id,
        event_name: "photo_shared",
        environment: "prod",
        source: "web",
        status: "valid",
        errors: [],
        sample_event_id: "event_456",
        observed_at: "2026-05-10T07:31:00.000Z",
      },
    ]);
  });

  it("synchronously records metadata-backed validation results for governance", async () => {
    const store = createMemoryMetadataStore();
    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web"],
    });
    await store.upsertEnvironment(project.id, {
      name: "prod",
      enabled: true,
      lastEventAt: null,
    });
    await store.createSdkKey(project.id, "prod", {
      source: "web",
      maskedKey: "write_key_live_****91",
      status: "active",
      keyHash: hashSdkWriteKey("expected_write_key"),
    });
    const definition = await store.createEventDefinition({
      projectId: project.id,
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
    });

    const response = await handleEventPost(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "x-trackinghub-write-key": "expected_write_key" },
        body: JSON.stringify({
          ...payload,
          project_id: project.id,
          event_name: "photo_shared",
          properties: {},
        }),
      }),
      {
        metadataStore: store,
        eventWriter: {
          writeRawEvent: async () => undefined,
          writeValidationResult: async () => undefined,
        },
        createEventId: () => "event_invalid",
        now: () => new Date("2026-05-10T07:33:00.000Z"),
      },
    );

    const governance = await store.listEventDefinitions();

    expect(response.status).toBe(202);
    expect(governance.validationResults[0]).toMatchObject({
      eventDefinitionId: definition.id,
      eventName: "photo_shared",
      status: "invalid",
      errors: ["channel is required"],
      sampleEventId: "event_invalid",
      observedAt: "2026-05-10T07:33:00.000Z",
    });
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
