import { describe, expect, it } from "vitest";
import {
  assertCanWrite,
  canManageSdkKeys,
  canWriteMetadata,
  type UserRole,
} from "./permissions";
import {
  createSessionCookie,
  parseSessionCookie,
  SESSION_COOKIE_NAME,
} from "./session";

describe("auth permissions", () => {
  it("allows admin and editor to write metadata", () => {
    expect(canWriteMetadata("admin")).toBe(true);
    expect(canWriteMetadata("editor")).toBe(true);
    expect(canWriteMetadata("viewer")).toBe(false);
  });

  it("only allows admin to manage SDK keys", () => {
    expect(canManageSdkKeys("admin")).toBe(true);
    expect(canManageSdkKeys("editor")).toBe(false);
    expect(canManageSdkKeys("viewer")).toBe(false);
  });

  it("throws stable forbidden errors for blocked writes", () => {
    expect(() => assertCanWrite({ role: "viewer" as UserRole })).toThrow(
      "FORBIDDEN",
    );
  });
});

describe("session cookies", () => {
  it("creates and parses httpOnly session cookies", () => {
    const cookie = createSessionCookie(
      "token_123",
      new Date("2026-05-11T00:00:00.000Z"),
    );

    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=token_123`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(
      parseSessionCookie(`${SESSION_COOKIE_NAME}=token_123; theme=dark`),
    ).toBe("token_123");
  });
});
