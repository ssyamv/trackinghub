import { describe, expect, it } from "vitest";
import { createMemoryMetadataStore } from "@/lib/metadata/metadata-store";
import { handleEventDefinitionsGet, handleEventDefinitionsPost } from "./handlers";

describe("/api/event-definitions", () => {
  it("creates event definitions with required properties for editors", async () => {
    const store = createMemoryMetadataStore();
    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web"],
    });

    const response = await handleEventDefinitionsPost(
      new Request("http://localhost/api/event-definitions", {
        method: "POST",
        body: JSON.stringify({
          projectId: project.id,
          name: "pay_button_click",
          displayName: "支付按钮点击",
          module: "checkout",
          platforms: ["web"],
          requiredProperties: [
            { name: "product_id", type: "string", required: true },
          ],
        }),
      }),
      { store, user: { role: "editor" } },
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: {
        definition: {
          name: "pay_button_click",
          requiredProperties: [{ name: "product_id" }],
        },
      },
    });
  });

  it("lists event definitions for viewers", async () => {
    const response = await handleEventDefinitionsGet({
      store: createMemoryMetadataStore(),
      user: { role: "viewer" },
    });

    expect(response.status).toBe(200);
  });

  it("blocks anonymous users from listing event definitions", async () => {
    const response = await handleEventDefinitionsGet({
      store: createMemoryMetadataStore(),
      user: null,
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "UNAUTHENTICATED" },
    });
  });

  it("rejects malformed JSON", async () => {
    const response = await handleEventDefinitionsPost(
      new Request("http://localhost/api/event-definitions", {
        method: "POST",
        body: "{",
      }),
      { store: createMemoryMetadataStore(), user: { role: "editor" } },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("rejects unsupported platforms", async () => {
    const store = createMemoryMetadataStore();
    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web"],
    });

    const response = await handleEventDefinitionsPost(
      new Request("http://localhost/api/event-definitions", {
        method: "POST",
        body: JSON.stringify({
          projectId: project.id,
          name: "pay_button_click",
          displayName: "支付按钮点击",
          platforms: ["ios"],
        }),
      }),
      { store, user: { role: "editor" } },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("rejects unsupported statuses", async () => {
    const store = createMemoryMetadataStore();
    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web"],
    });

    const response = await handleEventDefinitionsPost(
      new Request("http://localhost/api/event-definitions", {
        method: "POST",
        body: JSON.stringify({
          projectId: project.id,
          name: "pay_button_click",
          displayName: "支付按钮点击",
          status: "pending",
        }),
      }),
      { store, user: { role: "editor" } },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });
});
