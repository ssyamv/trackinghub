import { describe, expect, it } from "vitest";
import { createMemoryMetadataStore } from "@/lib/metadata/metadata-store";
import { handleProjectsGet, handleProjectsPost } from "./handlers";

describe("/api/projects", () => {
  it("lists project overview for viewers", async () => {
    const store = createMemoryMetadataStore();
    await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web"],
    });

    const response = await handleProjectsGet({
      store,
      user: { role: "viewer" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: {
        projects: [{ slug: "magic-frame" }],
      },
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
});
