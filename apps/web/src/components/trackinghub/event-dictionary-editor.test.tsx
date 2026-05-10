import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { editableEventDefinitions } from "@/lib/trackinghub/sample-data";
import { EventDictionaryEditor } from "./event-dictionary-editor";

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
