import { describe, expect, it } from "vitest";
import { createMemoryMetadataStore } from "@/lib/metadata/metadata-store";
import { handleSdkKeyPatch } from "./handlers";

describe("/api/sdk-keys/[id]", () => {
  it("lets admins disable SDK keys", async () => {
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

    const response = await handleSdkKeyPatch(
      new Request("http://localhost/api/sdk-keys/sdk_key_1", {
        method: "PATCH",
        body: JSON.stringify({ status: "disabled" }),
      }),
      {
        store,
        user: { role: "admin" },
        sdkKeyId: sdkKey.id,
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: {
        sdkKey: {
          id: sdkKey.id,
          status: "disabled",
        },
      },
    });
  });

  it("blocks editors from changing SDK key status", async () => {
    const response = await handleSdkKeyPatch(
      new Request("http://localhost/api/sdk-keys/sdk_key_1", {
        method: "PATCH",
        body: JSON.stringify({ status: "disabled" }),
      }),
      {
        store: createMemoryMetadataStore(),
        user: { role: "editor" },
        sdkKeyId: "sdk_key_1",
      },
    );

    expect(response.status).toBe(403);
  });

  it("blocks viewers from changing SDK key status", async () => {
    const response = await handleSdkKeyPatch(
      new Request("http://localhost/api/sdk-keys/sdk_key_1", {
        method: "PATCH",
        body: JSON.stringify({ status: "disabled" }),
      }),
      {
        store: createMemoryMetadataStore(),
        user: { role: "viewer" },
        sdkKeyId: "sdk_key_1",
      },
    );

    expect(response.status).toBe(403);
  });

  it("returns validation error for malformed JSON", async () => {
    const response = await handleSdkKeyPatch(
      new Request("http://localhost/api/sdk-keys/sdk_key_1", {
        method: "PATCH",
        body: "{",
      }),
      {
        store: createMemoryMetadataStore(),
        user: { role: "admin" },
        sdkKeyId: "sdk_key_1",
      },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });
});
