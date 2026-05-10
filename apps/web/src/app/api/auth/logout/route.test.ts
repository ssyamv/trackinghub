import { describe, expect, it } from "vitest";
import type { AuthStore } from "@/lib/auth/auth-store";
import { handleLogoutPost } from "./handlers";

describe("POST /api/auth/logout", () => {
  it("deletes the current session and clears the cookie", async () => {
    const deletedTokens: string[] = [];
    const store: AuthStore = {
      findUserByEmail: async () => null,
      createSession: async () => {
        throw new Error("not used");
      },
      findUserBySessionToken: async () => null,
      deleteSession: async (token) => {
        deletedTokens.push(token);
      },
    };

    const response = await handleLogoutPost(
      new Request("http://localhost/api/auth/logout", {
        method: "POST",
        headers: { cookie: "trackinghub_session=token_123" },
      }),
      { store },
    );

    expect(response.status).toBe(200);
    expect(deletedTokens).toEqual(["token_123"]);
    expect(response.headers.get("set-cookie")).toContain(
      "Expires=Thu, 01 Jan 1970",
    );
  });
});
