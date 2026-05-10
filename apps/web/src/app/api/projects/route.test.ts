import { describe, expect, it } from "vitest";
import { createMemoryMetadataStore } from "@/lib/metadata/metadata-store";
import { handleProjectsGet, handleProjectsPost } from "./handlers";

describe("/api/projects", () => {
  it("lists project overview for viewers", async () => {
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
      keyHash: "hash_should_not_leave_server",
    });

    const response = await handleProjectsGet({
      store,
      user: { role: "viewer" },
    });

    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(payload).toMatchObject({
      ok: true,
      data: {
        projects: [{ slug: "magic-frame" }],
        sdkKeys: [{ maskedKey: "write_key_live_****91" }],
      },
    });
    expect(payload.data.sdkKeys[0]).not.toHaveProperty("keyHash");
  });

  it("blocks anonymous users from listing project overview", async () => {
    const response = await handleProjectsGet({
      store: createMemoryMetadataStore(),
      user: null,
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "UNAUTHENTICATED" },
    });
  });

  it("blocks viewers from creating projects", async () => {
    const response = await handleProjectsPost(
      new Request("http://localhost/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: "Magic Frame", slug: "magic-frame" }),
      }),
      {
        store: createMemoryMetadataStore(),
        user: { role: "viewer" },
      },
    );

    expect(response.status).toBe(403);
  });

  it("returns validation error for malformed JSON", async () => {
    const response = await handleProjectsPost(
      new Request("http://localhost/api/projects", {
        method: "POST",
        body: "{",
      }),
      {
        store: createMemoryMetadataStore(),
        user: { role: "editor" },
      },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("rejects unsupported project platforms", async () => {
    const response = await handleProjectsPost(
      new Request("http://localhost/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: "Magic Frame",
          slug: "magic-frame",
          platforms: ["web", "ios"],
        }),
      }),
      {
        store: createMemoryMetadataStore(),
        user: { role: "editor" },
      },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });
});
