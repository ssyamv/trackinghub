import { describe, expect, it } from "vitest";

import {
  applyEventDictionaryAction,
  buildEventDefinitionPatchPayload,
  type EditableEventDefinition,
} from "./event-dictionary-editor";

const definitions: EditableEventDefinition[] = [
  {
    id: "pay_button_click",
    eventName: "pay_button_click",
    displayName: "支付按钮点击",
    description: "用户点击支付主按钮。",
    platforms: ["Web", "Flutter"],
    requiredProperties: ["product_id", "price"],
    status: "draft",
  },
];

describe("applyEventDictionaryAction", () => {
  it("creates an event definition with required properties and platform coverage", () => {
    const next = applyEventDictionaryAction(definitions, {
      type: "create",
      definition: {
        id: "campaign_card_view",
        eventName: "campaign_card_view",
        displayName: "活动卡片曝光",
        description: "活动卡片进入可视区域。",
        platforms: ["Web"],
        requiredProperties: ["campaign_id"],
        status: "draft",
      },
    });

    expect(next.map((item) => item.eventName)).toEqual([
      "pay_button_click",
      "campaign_card_view",
    ]);
  });

  it("updates event definition fields", () => {
    const next = applyEventDictionaryAction(definitions, {
      type: "update",
      id: "pay_button_click",
      changes: {
        displayName: "支付按钮点击（新版）",
        requiredProperties: ["product_id", "price", "currency"],
      },
    });

    expect(next[0].displayName).toBe("支付按钮点击（新版）");
    expect(next[0].requiredProperties).toEqual([
      "product_id",
      "price",
      "currency",
    ]);
  });

  it("moves definitions through the status flow and deprecates removed events", () => {
    const ready = applyEventDictionaryAction(definitions, {
      type: "transition",
      id: "pay_button_click",
      status: "ready",
    });
    const deprecated = applyEventDictionaryAction(ready, {
      type: "delete",
      id: "pay_button_click",
    });

    expect(ready[0].status).toBe("ready");
    expect(deprecated[0].status).toBe("deprecated");
  });
});

describe("buildEventDefinitionPatchPayload", () => {
  it("keeps existing property metadata when saving dictionary edits", () => {
    const payload = buildEventDefinitionPatchPayload(
      {
        displayName: "支付按钮点击",
        description: " 点击支付按钮 ",
        triggerTiming: "点击主按钮",
        module: "checkout",
        platforms: "Web, Flutter",
        requiredProperties: "product_id, price, currency",
        status: "ready",
      },
      {
        ...definitions[0],
        requiredPropertyDefinitions: [
          {
            name: "price",
            type: "number",
            required: true,
            description: "支付金额",
            exampleValue: 68,
          },
        ],
      },
    );

    expect(payload).toMatchObject({
      displayName: "支付按钮点击",
      description: "点击支付按钮",
      triggerTiming: "点击主按钮",
      module: "checkout",
      platforms: ["web", "flutter"],
      status: "ready",
    });
    expect(payload.requiredProperties).toEqual([
      {
        name: "product_id",
        type: "string",
        required: true,
        description: "",
        exampleValue: null,
      },
      {
        name: "price",
        type: "number",
        required: true,
        description: "支付金额",
        exampleValue: 68,
      },
      {
        name: "currency",
        type: "string",
        required: true,
        description: "",
        exampleValue: null,
      },
    ]);
  });
});
