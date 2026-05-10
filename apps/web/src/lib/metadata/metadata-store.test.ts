import { describe, expect, it } from "vitest";
import { createMemoryMetadataStore } from "./metadata-store";

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
});
