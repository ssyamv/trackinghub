/* @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SidebarUserMenu } from "./sidebar-user-menu";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("SidebarUserMenu", () => {
  it("loads the current user and logs out through the logout API", async () => {
    const assignMock = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { assign: assignMock },
    });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              user: {
                id: "user_1",
                email: "admin@example.com",
                name: "管理员",
                role: "admin",
              },
            },
          }),
          {
            headers: { "Content-Type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, data: { loggedOut: true } }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }),
      );

    const container = document.createElement("div");
    const root = createRoot(container);
    document.body.append(container);

    await act(async () => {
      root.render(<SidebarUserMenu />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(document.body.textContent).toContain("管理员");
    expect(document.body.textContent).toContain("admin@example.com");

    const logoutButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("退出登录"),
    );
    expect(logoutButton).toBeTruthy();

    await act(async () => {
      logoutButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/auth/logout",
      expect.objectContaining({
        credentials: "same-origin",
        method: "POST",
      }),
    );
    expect(assignMock).toHaveBeenCalledWith("/login");
  });
});
