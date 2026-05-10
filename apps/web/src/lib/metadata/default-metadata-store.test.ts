import { describe, expect, it } from "vitest";
import {
  toEventDefinitionRecord,
  toProjectRecord,
  toSdkKeyRecord,
} from "./default-metadata-store";

describe("default metadata store mappers", () => {
  it("maps postgres project rows to project records", () => {
    expect(
      toProjectRecord({
        id: "project_1",
        name: "Magic Frame",
        slug: "magic-frame",
        description: "AI 相框分析",
        owner_name: "增长产品",
        platforms: ["web", "flutter"],
        status: "active",
      }),
    ).toEqual({
      id: "project_1",
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web", "flutter"],
      status: "active",
    });
  });

  it("maps postgres SDK key rows to SDK key records", () => {
    expect(
      toSdkKeyRecord({
        id: "sdk_key_1",
        project_id: "project_1",
        project_name: "Magic Frame",
        environment: "prod",
        source: "flutter",
        masked_key: "th_live_****1234",
        status: "active",
        last_used_at: "2026-05-10T08:00:00.000Z",
        key_hash: "hash_1",
      }),
    ).toEqual({
      id: "sdk_key_1",
      projectId: "project_1",
      projectName: "Magic Frame",
      environment: "prod",
      source: "flutter",
      maskedKey: "th_live_****1234",
      status: "active",
      lastUsedAt: "2026-05-10T08:00:00.000Z",
      keyHash: "hash_1",
    });
  });

  it("maps postgres event definition and property rows to event definition records", () => {
    expect(
      toEventDefinitionRecord(
        {
          id: "event_definition_1",
          project_id: "project_1",
          project_name: "Magic Frame",
          name: "photo_shared",
          display_name: "图片分享",
          description: "用户分享 AI 相框图片",
          trigger_timing: "分享成功后",
          module: "share",
          platforms: ["web", "flutter"],
          status: "ready",
          last_seen_at: null,
        },
        [
          {
            name: "channel",
            type: "string",
            required: true,
            description: "分享渠道",
            example_value: "wechat",
          },
          {
            name: "metadata",
            type: "object",
            required: false,
            description: "扩展信息",
            example_value: { source: "album" },
          },
        ],
      ),
    ).toEqual({
      id: "event_definition_1",
      projectId: "project_1",
      projectName: "Magic Frame",
      name: "photo_shared",
      displayName: "图片分享",
      description: "用户分享 AI 相框图片",
      triggerTiming: "分享成功后",
      module: "share",
      platforms: ["web", "flutter"],
      status: "ready",
      requiredProperties: [
        {
          name: "channel",
          type: "string",
          required: true,
          description: "分享渠道",
          exampleValue: "wechat",
        },
      ],
      optionalProperties: [
        {
          name: "metadata",
          type: "object",
          required: false,
          description: "扩展信息",
          exampleValue: { source: "album" },
        },
      ],
      lastSeenAt: null,
    });
  });
});
