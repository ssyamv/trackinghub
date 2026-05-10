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
