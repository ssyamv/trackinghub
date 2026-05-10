import { describe, expect, it } from "vitest";
import { createMemoryMetadataStore } from "@/lib/metadata/metadata-store";
import { handleEventDefinitionAcceptancePost } from "./handlers";

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

describe("/api/event-definitions/[id]/acceptance", () => {
  it("creates acceptance records for editors", async () => {
    const { store, definition } = await createDefinition();

    const response = await handleEventDefinitionAcceptancePost(
      new Request(
        `http://localhost/api/event-definitions/${definition.id}/acceptance`,
        {
          method: "POST",
          body: JSON.stringify({ status: "accepted", note: "样本完整" }),
        },
      ),
      {
        store,
        user: { id: "user_1", role: "editor" },
        eventDefinitionId: definition.id,
      },
    );
    const governance = await store.listEventDefinitions();

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: {
        acceptance: {
          id: "acceptance_1",
          eventDefinitionId: definition.id,
          status: "accepted",
          note: "样本完整",
        },
      },
    });
    expect(governance.definitions[0].status).toBe("accepted");
  });

  it("rejects viewers", async () => {
    const { store, definition } = await createDefinition();

    const response = await handleEventDefinitionAcceptancePost(
      new Request(
        `http://localhost/api/event-definitions/${definition.id}/acceptance`,
        {
          method: "POST",
          body: JSON.stringify({ status: "accepted", note: "样本完整" }),
        },
      ),
      { store, user: { role: "viewer" }, eventDefinitionId: definition.id },
    );

    expect(response.status).toBe(403);
  });

  it("rejects malformed JSON", async () => {
    const { store, definition } = await createDefinition();

    const response = await handleEventDefinitionAcceptancePost(
      new Request(
        `http://localhost/api/event-definitions/${definition.id}/acceptance`,
        {
          method: "POST",
          body: "{",
        },
      ),
      { store, user: { role: "editor" }, eventDefinitionId: definition.id },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("rejects unsupported acceptance statuses", async () => {
    const { store, definition } = await createDefinition();

    const response = await handleEventDefinitionAcceptancePost(
      new Request(
        `http://localhost/api/event-definitions/${definition.id}/acceptance`,
        {
          method: "POST",
          body: JSON.stringify({ status: "pending", note: "样本完整" }),
        },
      ),
      { store, user: { role: "editor" }, eventDefinitionId: definition.id },
    );

    expect(response.status).toBe(400);
  });
});
