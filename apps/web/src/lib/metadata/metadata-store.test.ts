import { describe, expect, it } from "vitest";
import {
  createMemoryMetadataStore,
  MetadataStoreError,
} from "./metadata-store";

describe("metadata store contract", () => {
  it("creates projects with environments and masked SDK keys", async () => {
    const store = createMemoryMetadataStore();

    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web", "flutter"],
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
      keyHash: "hash",
    });

    const overview = await store.listProjectsOverview();

    expect(overview.projects[0].slug).toBe("magic-frame");
    expect(overview.environments[0].name).toBe("prod");
    expect(overview.sdkKeys[0].maskedKey).toBe("write_key_live_****91");
  });

  it("creates event definitions with required properties", async () => {
    const store = createMemoryMetadataStore();
    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web"],
    });

    const definition = await store.createEventDefinition({
      projectId: project.id,
      name: "pay_button_click",
      displayName: "支付按钮点击",
      description: "点击支付按钮",
      triggerTiming: "点击支付主按钮",
      module: "checkout",
      platforms: ["web"],
      status: "ready",
      requiredProperties: [
        {
          name: "product_id",
          type: "string",
          required: true,
          description: "商品 ID",
          exampleValue: "p_123",
        },
      ],
    });

    const governance = await store.listEventDefinitions();

    expect(definition.name).toBe("pay_button_click");
    expect(governance.definitions[0].requiredProperties[0].name).toBe(
      "product_id",
    );
  });

  it("finds only validatable event definitions for ingestion schema checks", async () => {
    const store = createMemoryMetadataStore();
    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web", "flutter"],
    });
    await store.createEventDefinition({
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
    await store.createEventDefinition({
      projectId: project.id,
      name: "draft_event",
      displayName: "草稿事件",
      description: "尚未验收",
      triggerTiming: "测试",
      module: "draft",
      platforms: ["web"],
      status: "draft",
      requiredProperties: [],
    });

    await expect(
      store.findValidatableEventDefinition({
        projectId: project.id,
        eventName: "photo_shared",
        source: "web",
      }),
    ).resolves.toMatchObject({
      name: "photo_shared",
      requiredProperties: [{ name: "channel" }],
    });
    await expect(
      store.findValidatableEventDefinition({
        projectId: project.id,
        eventName: "photo_shared",
        source: "flutter",
      }),
    ).resolves.toBeNull();
    await expect(
      store.findValidatableEventDefinition({
        projectId: project.id,
        eventName: "draft_event",
        source: "web",
      }),
    ).resolves.toBeNull();
  });

  it("records validation results and exposes recent samples for governance", async () => {
    const store = createMemoryMetadataStore();
    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web", "flutter"],
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

    await store.recordValidationResult({
      id: "validation_event_valid",
      project_id: project.id,
      event_definition_id: definition.id,
      event_name: "photo_shared",
      environment: "prod",
      source: "web",
      status: "valid",
      errors: [],
      sample_event_id: "event_valid",
      observed_at: "2026-05-10T07:30:00.000Z",
    });
    await store.recordValidationResult({
      id: "validation_event_invalid",
      project_id: project.id,
      event_definition_id: definition.id,
      event_name: "photo_shared",
      environment: "prod",
      source: "web",
      status: "invalid",
      errors: ["channel is required"],
      sample_event_id: "event_invalid",
      observed_at: "2026-05-10T07:31:00.000Z",
    });
    await store.recordValidationResult({
      id: "validation_event_unknown",
      project_id: project.id,
      event_definition_id: null,
      event_name: "unplanned_event",
      environment: "prod",
      source: "flutter",
      status: "unknown_event",
      errors: ["event definition not found"],
      sample_event_id: "event_unknown",
      observed_at: "2026-05-10T07:32:00.000Z",
    });

    const governance = await store.listEventDefinitions();

    expect(governance.definitions[0].lastSeenAt).toBe(
      "2026-05-10T07:31:00.000Z",
    );
    const validationResults = governance.validationResults ?? [];
    expect(validationResults.map((result) => result.status)).toEqual([
      "unknown_event",
      "invalid",
      "valid",
    ]);
    expect(validationResults[1]).toMatchObject({
      eventDefinitionId: definition.id,
      eventName: "photo_shared",
      errors: ["channel is required"],
      sampleEventId: "event_invalid",
    });
  });

  it("persists generated reports with source query references", async () => {
    const store = createMemoryMetadataStore();
    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web"],
    });

    const report = await store.createReport({
      projectId: project.id,
      type: "daily",
      title: "Magic Frame 生产日报",
      content: "今日事件量 2.7k，异常占比 3.4%。",
      sourceQueryRefs: [
        {
          source: "clickhouse",
          range: "7d",
          environment: "prod",
          funnelSteps: ["product_detail_view", "pay_button_click"],
        },
      ],
      generatedBy: "codex",
      generatedAt: "2026-05-11T00:00:00.000Z",
    });

    const reports = await store.listReports(project.id);

    expect(report).toMatchObject({
      projectId: project.id,
      projectName: "Magic Frame",
      type: "daily",
      title: "Magic Frame 生产日报",
      generatedBy: "codex",
      generatedAt: "2026-05-11T00:00:00.000Z",
    });
    expect(reports).toEqual([report]);

    reports[0].sourceQueryRefs.push({ changed: true });
    await expect(store.listReports(project.id)).resolves.toEqual([report]);
  });

  it("does not expose internal project references from list results", async () => {
    const store = createMemoryMetadataStore();
    await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web"],
    });

    const overview = await store.listProjectsOverview();
    overview.projects[0].name = "Changed";
    overview.projects[0].platforms.push("flutter");

    const nextOverview = await store.listProjectsOverview();

    expect(nextOverview.projects[0].name).toBe("Magic Frame");
    expect(nextOverview.projects[0].platforms).toEqual(["web"]);
  });

  it("updates SDK key status", async () => {
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
    const sdkKey = await store.createSdkKey(project.id, "prod", {
      source: "web",
      maskedKey: "write_key_live_****91",
      status: "active",
      keyHash: "hash",
    });

    const updatedSdkKey = await store.updateSdkKeyStatus(
      sdkKey.id,
      "disabled",
    );
    const overview = await store.listProjectsOverview();

    expect(updatedSdkKey.status).toBe("disabled");
    expect(overview.sdkKeys[0].status).toBe("disabled");
  });

  it("verifies active SDK write keys against project, environment, and source", async () => {
    const store = createMemoryMetadataStore();
    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web", "flutter"],
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
      keyHash: "hash_live_key",
    });
    await store.createSdkKey(project.id, "prod", {
      source: "flutter",
      maskedKey: "write_key_app_****38",
      status: "disabled",
      keyHash: "hash_disabled_key",
    });

    await expect(
      store.verifySdkWriteKey({
        projectId: project.id,
        environment: "prod",
        source: "web",
        keyHash: "hash_live_key",
      }),
    ).resolves.toEqual({ valid: true });
    await expect(
      store.verifySdkWriteKey({
        projectId: project.id,
        environment: "prod",
        source: "flutter",
        keyHash: "hash_disabled_key",
      }),
    ).resolves.toEqual({ valid: false });
    await expect(
      store.verifySdkWriteKey({
        projectId: project.id,
        environment: "prod",
        source: "flutter",
        keyHash: "hash_live_key",
      }),
    ).resolves.toEqual({ valid: false });
  });

  it("does not expose internal event definition references from list results", async () => {
    const store = createMemoryMetadataStore();
    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web"],
    });
    await store.createEventDefinition({
      projectId: project.id,
      name: "pay_button_click",
      displayName: "支付按钮点击",
      description: "点击支付按钮",
      triggerTiming: "点击支付主按钮",
      module: "checkout",
      platforms: ["web"],
      status: "ready",
      requiredProperties: [
        {
          name: "product_id",
          type: "string",
          required: true,
          description: "商品 ID",
          exampleValue: "p_123",
        },
      ],
    });

    const governance = await store.listEventDefinitions();
    governance.definitions[0].requiredProperties.push({
      name: "polluted",
      type: "string",
      required: true,
      description: "污染字段",
      exampleValue: "bad",
    });

    const nextGovernance = await store.listEventDefinitions();

    expect(nextGovernance.definitions[0].requiredProperties).toHaveLength(1);
    expect(nextGovernance.definitions[0].requiredProperties[0].name).toBe(
      "product_id",
    );
  });

  it("updates event definitions with provided fields only", async () => {
    const store = createMemoryMetadataStore();
    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web"],
    });
    const definition = await store.createEventDefinition({
      projectId: project.id,
      name: "pay_button_click",
      displayName: "支付按钮点击",
      description: "点击支付按钮",
      triggerTiming: "点击支付主按钮",
      module: "checkout",
      platforms: ["web"],
      status: "draft",
      requiredProperties: [
        {
          name: "product_id",
          type: "string",
          required: true,
          description: "商品 ID",
          exampleValue: "p_123",
        },
      ],
    });

    const updated = await store.updateEventDefinition(definition.id, {
      status: "accepted",
      platforms: ["web", "flutter"],
    });
    const governance = await store.listEventDefinitions();

    expect(updated).toMatchObject({
      id: definition.id,
      name: "pay_button_click",
      displayName: "支付按钮点击",
      status: "accepted",
      platforms: ["web", "flutter"],
    });
    expect(governance.definitions[0].requiredProperties[0].name).toBe(
      "product_id",
    );
  });

  it("creates acceptance records and accepts definitions deterministically", async () => {
    const store = createMemoryMetadataStore();
    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web"],
    });
    const definition = await store.createEventDefinition({
      projectId: project.id,
      name: "pay_button_click",
      displayName: "支付按钮点击",
      description: "点击支付按钮",
      triggerTiming: "点击支付主按钮",
      module: "checkout",
      platforms: ["web"],
      status: "draft",
      requiredProperties: [],
    });

    const acceptance = await store.createAcceptanceRecord(definition.id, {
      actorUserId: "user_1",
      status: "accepted",
      note: "样本完整",
    });
    const governance = await store.listEventDefinitions();

    expect(acceptance).toEqual({
      id: "acceptance_1",
      eventDefinitionId: definition.id,
      status: "accepted",
      note: "样本完整",
    });
    expect(governance.definitions[0].status).toBe("accepted");
  });

  it("throws stable errors for missing event definition updates", async () => {
    const store = createMemoryMetadataStore();

    await expect(
      store.updateEventDefinition("missing", { status: "accepted" }),
    ).rejects.toMatchObject({
      code: "EVENT_DEFINITION_NOT_FOUND",
      name: "MetadataStoreError",
    });
    await expect(
      store.createAcceptanceRecord("missing", {
        actorUserId: null,
        status: "accepted",
        note: "样本完整",
      }),
    ).rejects.toMatchObject({
      code: "EVENT_DEFINITION_NOT_FOUND",
      name: "MetadataStoreError",
    });
  });

  it("does not expose internal references from create results", async () => {
    const store = createMemoryMetadataStore();
    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web"],
    });
    project.platforms.push("flutter");
    const definition = await store.createEventDefinition({
      projectId: project.id,
      name: "pay_button_click",
      displayName: "支付按钮点击",
      description: "点击支付按钮",
      triggerTiming: "点击支付主按钮",
      module: "checkout",
      platforms: ["web"],
      status: "ready",
      requiredProperties: [
        {
          name: "product_id",
          type: "string",
          required: true,
          description: "商品 ID",
          exampleValue: "p_123",
        },
      ],
    });
    definition.requiredProperties.push({
      name: "polluted",
      type: "string",
      required: true,
      description: "污染字段",
      exampleValue: "bad",
    });

    const overview = await store.listProjectsOverview();
    const governance = await store.listEventDefinitions();

    expect(overview.projects[0].platforms).toEqual(["web"]);
    expect(governance.definitions[0].requiredProperties).toHaveLength(1);
    expect(governance.definitions[0].requiredProperties[0].name).toBe(
      "product_id",
    );
  });

  it("throws stable metadata store errors", async () => {
    const store = createMemoryMetadataStore();
    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web"],
    });

    await expect(
      store.upsertEnvironment("missing", {
        name: "prod",
        enabled: true,
        lastEventAt: null,
      }),
    ).rejects.toMatchObject({
      code: "PROJECT_NOT_FOUND",
      name: "MetadataStoreError",
    });
    await expect(
      store.createSdkKey(project.id, "prod", {
        source: "web",
        maskedKey: "write_key_live_****91",
        status: "active",
        keyHash: "hash",
      }),
    ).rejects.toMatchObject({
      code: "ENVIRONMENT_NOT_FOUND",
      name: "MetadataStoreError",
    });

    expect(new MetadataStoreError("SDK_KEY_NOT_FOUND").code).toBe(
      "SDK_KEY_NOT_FOUND",
    );
    expect(new MetadataStoreError("EVENT_DEFINITION_NOT_FOUND").code).toBe(
      "EVENT_DEFINITION_NOT_FOUND",
    );
  });
});
