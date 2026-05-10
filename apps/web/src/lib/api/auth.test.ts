import { describe, expect, it } from "vitest";
import type { AuthStore } from "@/lib/auth/auth-store";
import {
  getCurrentUser,
  getCurrentUserFromCookieHeader,
  withApiUser,
} from "./auth";

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

describe("API auth helpers", () => {
  it("reads the current user from a valid session cookie", async () => {
    await expect(
      getCurrentUser(
        new Request("http://localhost/api/projects", {
          headers: { cookie: "trackinghub_session=token_123" },
        }),
        store,
      ),
    ).resolves.toMatchObject({
      id: "user_1",
      role: "admin",
    });
  });

  it("returns null without a session cookie", async () => {
    await expect(
      getCurrentUser(new Request("http://localhost/api/projects"), store),
    ).resolves.toBeNull();
  });

  it("reads the current user from a raw cookie header", async () => {
    await expect(
      getCurrentUserFromCookieHeader("trackinghub_session=token_123", store),
    ).resolves.toMatchObject({
      id: "user_1",
      role: "admin",
    });
  });

  it("maps session lookup failures to stable API errors", async () => {
    const response = await withApiUser(
      new Request("http://localhost/api/projects", {
        headers: { cookie: "trackinghub_session=token_123" },
      }),
      async () => Response.json({ ok: true }),
      {
        ...store,
        findUserBySessionToken: async () => {
          throw new Error("database offline");
        },
      },
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "DATABASE_UNAVAILABLE" },
    });
  });
});
