import { describe, expect, it } from "vitest";
import type { AuthStore } from "@/lib/auth/auth-store";
import { handleLoginPost } from "./handlers";

const user = {
  id: "user_1",
  email: "admin@example.com",
  name: "管理员",
  role: "admin" as const,
  passwordHash:
    "$2a$12$ZrM.EWpJ6S6XHh9Ec4G4zecqk7gDB589TRWfeJSpyt/Iiudz0HYTK", // password: secret123
  enabled: true,
};

describe("POST /api/auth/login", () => {
  it("creates a session cookie for valid credentials", async () => {
    const store: AuthStore = {
      findUserByEmail: async () => user,
      createSession: async (_userId, expiresAt) => ({
        id: "session_1",
        token: "token_123",
        tokenHash: "hash_123",
        userId: "user_1",
        expiresAt,
      }),
      findUserBySessionToken: async () => null,
      deleteSession: async () => undefined,
      updateUserProfile: async () => {
        throw new Error("not used");
      },
    };

    const response = await handleLoginPost(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "admin@example.com",
          password: "secret123",
        }),
      }),
      { store, now: () => new Date("2026-05-10T00:00:00.000Z") },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(
      "trackinghub_session=token_123",
    );
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

  it("returns validation error for malformed JSON body", async () => {
    const store: AuthStore = {
      findUserByEmail: async () => user,
      createSession: async () => {
        throw new Error("not used");
      },
      findUserBySessionToken: async () => null,
      deleteSession: async () => undefined,
      updateUserProfile: async () => {
        throw new Error("not used");
      },
    };

    const response = await handleLoginPost(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: "{",
      }),
      { store },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "请求体必须是合法 JSON",
      },
    });
  });
});
