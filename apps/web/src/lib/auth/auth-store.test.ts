import { describe, expect, it } from "vitest";
import {
  assertCanRead,
  assertCanWrite,
  canManageSdkKeys,
  canWriteMetadata,
  type UserRole,
} from "./permissions";
import {
  clearSessionCookie,
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

  it("requires a signed-in user to read internal metadata", () => {
    expect(() => assertCanRead(null)).toThrow("UNAUTHENTICATED");
    expect(() => assertCanRead({ role: "viewer" })).not.toThrow();
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

  it("returns null for malformed session cookie values", () => {
    expect(parseSessionCookie(`${SESSION_COOKIE_NAME}=%E0%A4%A`)).toBeNull();
  });

  it("clears secure session cookies when requested", () => {
    const cookie = clearSessionCookie(true);

    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Secure");
  });
});
