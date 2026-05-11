import { queryPostgres } from "@/lib/metadata/postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashSessionToken } from "./auth-store";
import { defaultAuthStore } from "./default-auth-store";

vi.mock("@/lib/metadata/postgres", () => ({
  queryPostgres: vi.fn(),
}));

const queryPostgresMock = vi.mocked(queryPostgres);

describe("default auth store", () => {
  beforeEach(() => {
    queryPostgresMock.mockReset();
  });

  it("maps a Postgres user row by email", async () => {
    queryPostgresMock.mockResolvedValueOnce({
      rows: [
        {
          id: "user_1",
          email: "owner@example.com",
          name: "Owner",
          role: "admin",
          password_hash: "hash_1",
          enabled: true,
        },
      ],
    } as never);

    await expect(
      defaultAuthStore.findUserByEmail("OWNER@example.com"),
    ).resolves.toEqual({
      id: "user_1",
      email: "owner@example.com",
      name: "Owner",
      role: "admin",
      passwordHash: "hash_1",
      enabled: true,
    });
    expect(queryPostgresMock).toHaveBeenCalledWith(
      "SELECT id, email, name, role, password_hash, enabled FROM users WHERE lower(email) = lower($1) LIMIT 1",
      ["OWNER@example.com"],
    );
  });

  it("creates a session with a stored token hash and returned plain token", async () => {
    const expiresAt = new Date("2026-05-11T00:00:00.000Z");
    queryPostgresMock.mockResolvedValueOnce({
      rows: [{ id: "session_1" }],
    } as never);

    const session = await defaultAuthStore.createSession("user_1", expiresAt);
    const [, values] = queryPostgresMock.mock.calls[0];

    expect(session.id).toBe("session_1");
    expect(session.userId).toBe("user_1");
    expect(session.expiresAt).toBe(expiresAt);
    expect(session.token).toEqual(expect.any(String));
    expect(session.tokenHash).toBe(hashSessionToken(session.token));
    expect(values).toEqual(["user_1", session.tokenHash, expiresAt.toISOString()]);
  });

  it("finds an enabled user by hashed session token", async () => {
    const now = new Date("2026-05-10T12:00:00.000Z");
    queryPostgresMock.mockResolvedValueOnce({
      rows: [
        {
          id: "user_2",
          email: "viewer@example.com",
          name: "Viewer",
          role: "viewer",
          password_hash: "hash_2",
          enabled: true,
        },
      ],
    } as never);

    await expect(
      defaultAuthStore.findUserBySessionToken("plain_token", now),
    ).resolves.toEqual({
      id: "user_2",
      email: "viewer@example.com",
      name: "Viewer",
      role: "viewer",
      passwordHash: "hash_2",
      enabled: true,
    });
    const [sql, values] = queryPostgresMock.mock.calls[0];
    expect(sql).toContain("sessions.expires_at > $2");
    expect(sql).toContain("users.enabled = true");
    expect(values).toEqual([hashSessionToken("plain_token"), now.toISOString()]);
  });

  it("deletes sessions by hashed token", async () => {
    queryPostgresMock.mockResolvedValueOnce({ rows: [] } as never);

    await defaultAuthStore.deleteSession("plain_token");

    expect(queryPostgresMock).toHaveBeenCalledWith(
      "DELETE FROM sessions WHERE token_hash = $1",
      [hashSessionToken("plain_token")],
    );
  });

  it("updates the user's display name and returns the public profile", async () => {
    queryPostgresMock.mockResolvedValueOnce({
      rows: [
        {
          id: "user_1",
          email: "admin@example.com",
          name: "运营管理员",
          role: "admin",
          password_hash: "hash_1",
          enabled: true,
        },
      ],
    } as never);

    await expect(
      defaultAuthStore.updateUserProfile("user_1", { name: "运营管理员" }),
    ).resolves.toEqual({
      id: "user_1",
      email: "admin@example.com",
      name: "运营管理员",
      role: "admin",
      passwordHash: "hash_1",
      enabled: true,
    });
    expect(queryPostgresMock).toHaveBeenCalledWith(
      `UPDATE users
       SET name = $2, updated_at = now()
       WHERE id = $1 AND enabled = true
       RETURNING id, email, name, role, password_hash, enabled`,
      ["user_1", "运营管理员"],
    );
  });
});
