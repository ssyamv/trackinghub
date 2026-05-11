import { queryPostgres } from "@/lib/metadata/postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultMetadataStore,
  toEventDefinitionRecord,
  toProjectRecord,
  toSdkKeyRecord,
} from "./default-metadata-store";

vi.mock("@/lib/metadata/postgres", () => ({
  queryPostgres: vi.fn(),
}));

const queryPostgresMock = vi.mocked(queryPostgres);

describe("default metadata store mappers", () => {
  beforeEach(() => {
    queryPostgresMock.mockReset();
  });

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

  it("verifies SDK write keys with active key and enabled environment filters", async () => {
    queryPostgresMock.mockResolvedValueOnce({
      rows: [{ id: "sdk_key_1" }],
    } as never);

    await expect(
      defaultMetadataStore.verifySdkWriteKey({
        projectId: "project_1",
        environment: "prod",
        source: "web",
        keyHash: "hash_1",
      }),
    ).resolves.toEqual({ valid: true });

    const [sql, values] = queryPostgresMock.mock.calls[0];
    expect(sql).toContain("project_environments.enabled = true");
    expect(sql).toContain("sdk_keys.status = 'active'");
    expect(values).toEqual(["project_1", "prod", "web", "hash_1"]);
  });

  it("finds validatable event definitions with platform and status filters", async () => {
    queryPostgresMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: "event_definition_1",
            project_id: "project_1",
            project_name: "Magic Frame",
            name: "photo_shared",
            display_name: "图片分享",
            description: "用户分享图片",
            trigger_timing: "分享成功后",
            module: "share",
            platforms: ["web"],
            status: "accepted",
            last_seen_at: null,
          },
        ],
      } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            event_definition_id: "event_definition_1",
            name: "channel",
            type: "string",
            required: true,
            description: "分享渠道",
            example_value: "wechat",
          },
        ],
      } as never);

    await expect(
      defaultMetadataStore.findValidatableEventDefinition({
        projectId: "project_1",
        eventName: "photo_shared",
        source: "web",
      }),
    ).resolves.toMatchObject({
      id: "event_definition_1",
      name: "photo_shared",
      requiredProperties: [{ name: "channel" }],
    });

    const [definitionSql, definitionValues] = queryPostgresMock.mock.calls[0];
    expect(definitionSql).toContain("$3 = ANY(event_definitions.platforms)");
    expect(definitionSql).toContain(
      "event_definitions.status IN ('ready', 'released', 'accepted')",
    );
    expect(definitionValues).toEqual(["project_1", "photo_shared", "web"]);
  });

  it("groups environment overview by every project column used for ordering", async () => {
    queryPostgresMock
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);

    await defaultMetadataStore.listProjectsOverview();

    const [environmentSql] = queryPostgresMock.mock.calls[1];
    expect(environmentSql).toContain(
      "GROUP BY project_environments.id, projects.name, projects.created_at",
    );
    expect(environmentSql).toContain(
      "ORDER BY projects.created_at DESC, project_environments.name ASC",
    );
  });

  it("upserts validation results into Postgres for governance reads", async () => {
    queryPostgresMock.mockResolvedValueOnce({ rows: [] } as never);

    await defaultMetadataStore.recordValidationResult({
      id: "validation_event_123",
      project_id: "project_1",
      event_definition_id: "event_definition_1",
      event_name: "photo_shared",
      environment: "prod",
      source: "web",
      status: "invalid",
      errors: ["channel is required"],
      sample_event_id: "event_123",
      observed_at: "2026-05-10T07:31:00.000Z",
    });

    const [sql, values] = queryPostgresMock.mock.calls[0];
    expect(sql).toContain("INSERT INTO event_validation_results");
    expect(sql).toContain("ON CONFLICT (id) DO UPDATE");
    expect(values).toEqual([
      "validation_event_123",
      "project_1",
      "event_definition_1",
      "photo_shared",
      "prod",
      "web",
      "invalid",
      JSON.stringify(["channel is required"]),
      "event_123",
      "2026-05-10T07:31:00.000Z",
    ]);
  });
});
