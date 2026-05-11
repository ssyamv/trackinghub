import { describe, expect, it } from "vitest";
import type { AuthStore } from "@/lib/auth/auth-store";
import { handleMeGet, handleMePatch } from "./handlers";

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
          enabled: true,
          name: "管理员",
          passwordHash: "hash",
          role: "admin",
        }
      : null,
  deleteSession: async () => undefined,
  updateUserProfile: async (userId, input) => ({
    id: userId,
    email: "admin@example.com",
    enabled: true,
    name: input.name,
    passwordHash: "hash",
    role: "admin",
  }),
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

  it("updates the current user's profile name", async () => {
    const response = await handleMePatch(
      new Request("http://localhost/api/auth/me", {
        method: "PATCH",
        headers: { cookie: "trackinghub_session=token_123" },
        body: JSON.stringify({
          name: "运营管理员",
        }),
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
          name: "运营管理员",
          role: "admin",
        },
      },
    });
  });

  it("rejects an empty profile name", async () => {
    const response = await handleMePatch(
      new Request("http://localhost/api/auth/me", {
        method: "PATCH",
        headers: { cookie: "trackinghub_session=token_123" },
        body: JSON.stringify({
          name: "   ",
        }),
      }),
      { store },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "姓名不能为空",
      },
    });
  });
});
