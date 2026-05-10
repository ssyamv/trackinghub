import { describe, expect, it } from "vitest";
import { mapProjectsOverviewToWorkbench } from "./project-api";

describe("project api mapper", () => {
  it("maps metadata projects into existing workbench props", () => {
    const result = mapProjectsOverviewToWorkbench({
      projects: [
        {
          id: "project_1",
          name: "Magic Frame",
          slug: "magic-frame",
          description: "AI 相框分析",
          ownerName: "增长产品",
          platforms: ["web", "flutter"],
          status: "active",
        },
      ],
      environments: [
        {
          id: "env_1",
          projectId: "project_1",
          projectName: "Magic Frame",
          name: "prod",
          enabled: true,
          lastEventAt: null,
        },
      ],
      sdkKeys: [
        {
          id: "key_1",
          projectId: "project_1",
          projectName: "Magic Frame",
          environment: "prod",
          source: "web",
          maskedKey: "write_key_live_****91",
          status: "active",
          lastUsedAt: null,
        },
      ],
    });

    expect(result.projects[0]).toMatchObject({
      name: "Magic Frame",
      slug: "magic-frame",
      platforms: "Web + Flutter",
      status: "运行中",
      owner: "增长产品",
    });
    expect(result.environments[0].writeKeyStatus).toBe("启用");
    expect(result.sdkKeys[0].id).toBe("key_1");
    expect(result.sdkKeys[0].source).toBe("Web");
  });

  it("marks environment write key as rotating when only rotating keys exist", () => {
    const result = mapProjectsOverviewToWorkbench({
      projects: [
        {
          id: "project_1",
          name: "Magic Frame",
          slug: "magic-frame",
          description: "AI 相框分析",
          ownerName: "增长产品",
          platforms: ["web"],
          status: "active",
        },
      ],
      environments: [
        {
          id: "env_1",
          projectId: "project_1",
          projectName: "Magic Frame",
          name: "staging",
          enabled: true,
          lastEventAt: null,
        },
      ],
      sdkKeys: [
        {
          id: "key_1",
          projectId: "project_1",
          projectName: "Magic Frame",
          environment: "staging",
          source: "web",
          maskedKey: "write_key_stage_****16",
          status: "rotating",
          lastUsedAt: null,
        },
      ],
    });

    expect(result.environments[0].writeKeyStatus).toBe("轮换中");
  });
});
