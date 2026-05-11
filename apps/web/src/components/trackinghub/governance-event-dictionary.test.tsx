/* @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { EditableEventDefinition } from "@/lib/trackinghub/event-dictionary-editor";
import type { EventDictionaryItem } from "@/lib/trackinghub/types";
import { GovernanceEventDictionary } from "./governance-event-dictionary";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

class TestPointerEvent extends MouseEvent {
  pointerType = "mouse";
}

Object.defineProperty(window, "PointerEvent", {
  configurable: true,
  value: TestPointerEvent,
});

const events: EventDictionaryItem[] = [
  {
    id: "event_photo_shared",
    eventName: "photo_shared",
    displayName: "照片分享",
    project: "Magic Frame App",
    platforms: "Web",
    environment: "按环境验证",
    owner: "growth",
    status: "待验收",
    statusTone: "warning",
    lastSeen: "暂无",
  },
];

const editableDefinitions: EditableEventDefinition[] = [
  {
    id: "event_photo_shared",
    eventName: "photo_shared",
    displayName: "照片分享",
    description: "用户分享照片时触发。",
    triggerTiming: "点击分享按钮",
    module: "growth",
    platforms: ["Web"],
    requiredProperties: ["photo_id"],
    status: "ready",
  },
];

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("GovernanceEventDictionary", () => {
  it("opens an edit form from the row operation menu", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    document.body.append(container);

    await act(async () => {
      root.render(
        <GovernanceEventDictionary
          editableDefinitions={editableDefinitions}
          events={events}
        />,
      );
    });

    const trigger = document.querySelector(
      'button[aria-label="操作 photo_shared"]',
    );
    expect(trigger).not.toBeNull();

    await act(async () => {
      trigger?.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, button: 0 }),
      );
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const editItem = Array.from(
      document.querySelectorAll('[data-slot="dropdown-menu-item"]'),
    ).find((item) => item.textContent === "编辑");
    expect(editItem).toBeTruthy();

    await act(async () => {
      editItem?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.textContent).toContain("保存编辑");
    expect(
      document.querySelector<HTMLInputElement>('input[value="照片分享"]'),
    ).not.toBeNull();
    expect(document.body.textContent).toContain("触发时机");
  });

  it("creates and deletes event definitions from the governance table", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    document.body.append(container);
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              definition: {
                id: "event_checkout_submit",
                projectId: "project_magic_frame",
                projectName: "Magic Frame App",
                name: "checkout_submit",
                displayName: "提交订单",
                description: "用户提交订单时触发。",
                triggerTiming: "点击提交订单按钮",
                module: "checkout",
                platforms: ["web"],
                status: "draft",
                requiredProperties: [
                  {
                    name: "order_id",
                    type: "string",
                    required: true,
                    description: "",
                    exampleValue: null,
                  },
                ],
                lastSeenAt: null,
              },
            },
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, data: { deleted: true } })),
      );
    vi.spyOn(window, "confirm").mockReturnValue(true);

    await act(async () => {
      root.render(
        <GovernanceEventDictionary
          editableDefinitions={editableDefinitions}
          events={events}
          projectOptions={[
            { id: "project_magic_frame", name: "Magic Frame App" },
          ]}
          selectedProjectId="project_magic_frame"
        />,
      );
    });

    const addButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "新增事件",
    );
    expect(addButton).toBeTruthy();

    await act(async () => {
      addButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const input = (label: string) =>
      document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
    const setInputValue = (element: HTMLInputElement, value: string) => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;

      setter?.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
    };

    await act(async () => {
      setInputValue(input("事件名")!, "checkout_submit");
      setInputValue(input("展示名")!, "提交订单");
      setInputValue(input("必填属性")!, "order_id");
    });

    const submitButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "保存新增",
    );
    await act(async () => {
      submitButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/event-definitions",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("checkout_submit"),
      }),
    );
    expect(document.body.textContent).toContain("提交订单");

    const createdTrigger = document.querySelector(
      'button[aria-label="操作 checkout_submit"]',
    );
    await act(async () => {
      createdTrigger?.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, button: 0 }),
      );
      createdTrigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const deleteItem = Array.from(
      document.querySelectorAll('[data-slot="dropdown-menu-item"]'),
    ).find((item) => item.textContent === "删除");
    await act(async () => {
      deleteItem?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/event-definitions/event_checkout_submit",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(document.body.textContent).not.toContain("提交订单");
    expect(document.body.textContent).toContain("事件定义已删除。");
  });
});
