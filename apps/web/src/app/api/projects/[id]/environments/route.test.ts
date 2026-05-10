import { describe, expect, it } from "vitest";
import { createMemoryMetadataStore } from "@/lib/metadata/metadata-store";
import { handleProjectEnvironmentPost } from "./handlers";

describe("/api/projects/[id]/environments", () => {
  it("lets editors create project environments", async () => {
    const store = createMemoryMetadataStore();
    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web"],
    });

    const response = await handleProjectEnvironmentPost(
      new Request("http://localhost/api/projects/project_1/environments", {
        method: "POST",
        body: JSON.stringify({ name: "prod", enabled: true }),
      }),
      {
        store,
        user: { role: "editor" },
        projectId: project.id,
      },
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: {
        environment: {
          projectId: project.id,
          name: "prod",
          enabled: true,
        },
      },
    });
  });

  it("blocks viewers from creating project environments", async () => {
    const response = await handleProjectEnvironmentPost(
      new Request("http://localhost/api/projects/project_1/environments", {
        method: "POST",
        body: JSON.stringify({ name: "prod", enabled: true }),
      }),
      {
        store: createMemoryMetadataStore(),
        user: { role: "viewer" },
        projectId: "project_1",
      },
    );

    expect(response.status).toBe(403);
  });
});
