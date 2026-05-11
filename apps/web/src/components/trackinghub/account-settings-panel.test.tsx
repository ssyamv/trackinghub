/* @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AccountSettingsPanel } from "./account-settings-panel";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("AccountSettingsPanel", () => {
  it("saves the user's profile name through the account API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            user: {
              id: "user_1",
              email: "admin@example.com",
              name: "运营管理员",
              role: "admin",
            },
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        },
      ),
    );

    const container = document.createElement("div");
    const root = createRoot(container);
    document.body.append(container);

    await act(async () => {
      root.render(
        <AccountSettingsPanel
          user={{
            id: "user_1",
            email: "admin@example.com",
            name: "管理员",
            role: "admin",
          }}
        />,
      );
    });

    const nameInput = document.querySelector(
      'input[name="name"]',
    ) as HTMLInputElement | null;
    expect(nameInput).toBeTruthy();
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    valueSetter?.call(nameInput, "运营管理员");

    await act(async () => {
      nameInput?.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const submitButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("保存资料"),
    );
    expect(submitButton).toBeTruthy();

    await act(async () => {
      submitButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({
        body: JSON.stringify({ name: "运营管理员" }),
        credentials: "same-origin",
        method: "PATCH",
      }),
    );
    expect(document.body.textContent).toContain("个人信息已更新");
    expect(document.body.textContent).toContain("admin@example.com");
    expect(document.body.textContent).toContain("管理员");
  });
});
