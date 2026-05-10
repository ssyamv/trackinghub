import { describe, expect, it } from "vitest";
import { mapGovernanceOverviewToWorkbench } from "./governance-api";

describe("governance api mapper", () => {
  it("maps metadata event definitions into workbench props", () => {
    const result = mapGovernanceOverviewToWorkbench({
      definitions: [
        {
          id: "event_1",
          projectId: "project_1",
          projectName: "Magic Frame",
          name: "pay_button_click",
          displayName: "支付按钮点击",
          description: "点击支付按钮",
          triggerTiming: "点击支付主按钮",
          module: "checkout",
          platforms: ["web", "flutter"],
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
          optionalProperties: [],
          lastSeenAt: null,
        },
      ],
    });

    expect(result.events[0]).toMatchObject({
      eventName: "pay_button_click",
      project: "Magic Frame",
      platforms: "Web + Flutter",
      status: "待验收",
    });
    expect(result.eventDetail.requiredProperties[0].name).toBe("product_id");
    expect(result.editableDefinitions[0].eventName).toBe("pay_button_click");
  });

  it("preserves event ids and editable statuses from metadata definitions", () => {
    const result = mapGovernanceOverviewToWorkbench({
      definitions: [
        {
          id: "event_project_a",
          projectId: "project_a",
          projectName: "Magic Frame",
          name: "pay_button_click",
          displayName: "支付按钮点击",
          description: "点击支付按钮",
          triggerTiming: "点击支付主按钮",
          module: "checkout",
          platforms: ["web"],
          status: "draft",
          requiredProperties: [],
          optionalProperties: [],
          lastSeenAt: null,
        },
        {
          id: "event_project_b",
          projectId: "project_b",
          projectName: "Homture",
          name: "pay_button_click",
          displayName: "支付按钮点击",
          description: "官网支付按钮点击",
          triggerTiming: "点击官网支付主按钮",
          module: "website",
          platforms: ["flutter"],
          status: "deprecated",
          requiredProperties: [],
          optionalProperties: [],
          lastSeenAt: null,
        },
      ],
    });

    expect(result.events).toEqual([
      expect.objectContaining({ id: "event_project_a" }),
      expect.objectContaining({ id: "event_project_b" }),
    ]);
    expect(result.editableDefinitions.map((item) => item.status)).toEqual([
      "draft",
      "deprecated",
    ]);
  });
});
