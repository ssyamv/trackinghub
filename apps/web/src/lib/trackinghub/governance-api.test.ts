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

  it("maps real validation results into anomaly summary, error checks, and sample statuses", () => {
    const result = mapGovernanceOverviewToWorkbench({
      definitions: [
        {
          id: "event_1",
          projectId: "project_1",
          projectName: "Magic Frame",
          name: "photo_shared",
          displayName: "图片分享",
          description: "用户分享图片",
          triggerTiming: "分享成功后",
          module: "share",
          platforms: ["web"],
          status: "accepted",
          requiredProperties: [],
          optionalProperties: [],
          lastSeenAt: "2026-05-10T07:31:00.000Z",
        },
      ],
      validationResults: [
        {
          id: "validation_event_unknown",
          projectId: "project_1",
          eventDefinitionId: null,
          eventName: "unplanned_event",
          environment: "prod",
          source: "flutter",
          status: "unknown_event",
          errors: ["event definition not found"],
          sampleEventId: "event_unknown",
          observedAt: "2026-05-10T07:32:00.000Z",
        },
        {
          id: "validation_event_invalid",
          projectId: "project_1",
          eventDefinitionId: "event_1",
          eventName: "photo_shared",
          environment: "prod",
          source: "web",
          status: "invalid",
          errors: ["channel is required"],
          sampleEventId: "event_invalid",
          observedAt: "2026-05-10T07:31:00.000Z",
        },
        {
          id: "validation_event_valid",
          projectId: "project_1",
          eventDefinitionId: "event_1",
          eventName: "photo_shared",
          environment: "prod",
          source: "web",
          status: "valid",
          errors: [],
          sampleEventId: "event_valid",
          observedAt: "2026-05-10T07:30:00.000Z",
        },
      ],
    });

    expect(result.summaryCards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Schema 异常",
          value: "2",
          detail: "unplanned_event：event definition not found",
        }),
        expect.objectContaining({
          label: "最近接收",
          value: "2026-05-10T07:32:00.000Z",
          detail: "unplanned_event / prod",
        }),
      ]),
    );
    expect(result.acceptanceChecks).toEqual([
      {
        label: "unplanned_event / unknown_event",
        detail: "event definition not found",
        tone: "danger",
      },
      {
        label: "photo_shared / invalid",
        detail: "channel is required",
        tone: "danger",
      },
    ]);
    expect(result.eventDetail.recentSamples?.map((sample) => sample.status)).toEqual([
      "unknown_event",
      "invalid",
      "valid",
    ]);
  });
});
