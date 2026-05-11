import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { EditableEventDefinition } from "@/lib/trackinghub/event-dictionary-editor";
import { EventDictionaryEditor } from "./event-dictionary-editor";

const editableEventDefinitions: EditableEventDefinition[] = [
  {
    id: "photo_shared",
    eventName: "photo_shared",
    displayName: "照片分享",
    description: "用户分享照片时触发。",
    platforms: ["Web"],
    requiredProperties: ["photo_id"],
    status: "ready",
  },
];

describe("EventDictionaryEditor", () => {
  it("renders CRUD controls for event definitions, properties, platforms, and status", () => {
    const html = renderToStaticMarkup(
      <EventDictionaryEditor definitions={editableEventDefinitions} />,
    );

    expect(html).toContain("事件字典编辑");
    expect(html).toContain("新增事件");
    expect(html).toContain("必填属性");
    expect(html).toContain("平台覆盖");
    expect(html).toContain("状态流转");
    expect(html).toContain("编辑");
    expect(html).toContain("弃用");
  });
});
