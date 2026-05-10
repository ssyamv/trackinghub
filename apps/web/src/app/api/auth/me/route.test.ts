import { describe, expect, it } from "vitest";
import type { AuthStore } from "@/lib/auth/auth-store";
import { handleMeGet } from "./handlers";

const store: AuthStore = {
  findUserByEmail: async () => null,
  createSession: async () => {
    throw new Error("not used");
  },
  findUserBySessionToken: async (token) =>
    token === "token_123"
      ? {
          id: "user_1",
          email: "admin@example.com",
          name: "管理员",
          role: "admin",
        }
      : null,
  deleteSession: async () => undefined,
};

describe("GET /api/auth/me", () => {
  it("returns the current user for a valid session", async () => {
    const response = await handleMeGet(
      new Request("http://localhost/api/auth/me", {
        headers: { cookie: "trackinghub_session=token_123" },
      }),
      { store },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      data: {
        user: {
          id: "user_1",
          email: "admin@example.com",
          name: "管理员",
          role: "admin",
        },
      },
    });
  });

  it("returns 401 without a valid session", async () => {
    const response = await handleMeGet(
      new Request("http://localhost/api/auth/me"),
      { store },
    );

    expect(response.status).toBe(401);
  });
});
