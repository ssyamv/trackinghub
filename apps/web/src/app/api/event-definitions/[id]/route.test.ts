import { describe, expect, it } from "vitest";
import { createMemoryMetadataStore } from "@/lib/metadata/metadata-store";
import { handleEventDefinitionPatch } from "./handlers";

async function createDefinition() {
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

  return { store, definition };
}

describe("/api/event-definitions/[id]", () => {
  it("patches event definition status for editors", async () => {
    const { store, definition } = await createDefinition();

    const response = await handleEventDefinitionPatch(
      new Request(`http://localhost/api/event-definitions/${definition.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "accepted" }),
      }),
      { store, user: { role: "editor" }, eventDefinitionId: definition.id },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: { definition: { id: definition.id, status: "accepted" } },
    });
  });

  it("rejects viewers", async () => {
    const { store, definition } = await createDefinition();

    const response = await handleEventDefinitionPatch(
      new Request(`http://localhost/api/event-definitions/${definition.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "accepted" }),
      }),
      { store, user: { role: "viewer" }, eventDefinitionId: definition.id },
    );

    expect(response.status).toBe(403);
  });

  it("rejects malformed JSON", async () => {
    const { store, definition } = await createDefinition();

    const response = await handleEventDefinitionPatch(
      new Request(`http://localhost/api/event-definitions/${definition.id}`, {
        method: "PATCH",
        body: "{",
      }),
      { store, user: { role: "editor" }, eventDefinitionId: definition.id },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("rejects unsupported platforms and statuses", async () => {
    const { store, definition } = await createDefinition();

    const platformResponse = await handleEventDefinitionPatch(
      new Request(`http://localhost/api/event-definitions/${definition.id}`, {
        method: "PATCH",
        body: JSON.stringify({ platforms: ["ios"] }),
      }),
      { store, user: { role: "editor" }, eventDefinitionId: definition.id },
    );
    const statusResponse = await handleEventDefinitionPatch(
      new Request(`http://localhost/api/event-definitions/${definition.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "pending" }),
      }),
      { store, user: { role: "editor" }, eventDefinitionId: definition.id },
    );

    expect(platformResponse.status).toBe(400);
    expect(statusResponse.status).toBe(400);
  });
});
