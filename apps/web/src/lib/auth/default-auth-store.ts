import { queryPostgres } from "@/lib/metadata/postgres";
import type { QueryResultRow } from "pg";
import {
  createSessionToken,
  hashSessionToken,
  type AuthStore,
  type AuthUserRecord,
} from "./auth-store";

type UserRow = QueryResultRow & {
  id: string;
  email: string;
  name: string;
  role: AuthUserRecord["role"];
  password_hash: string;
  enabled: boolean;
};

function toUser(row: UserRow): AuthUserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    passwordHash: row.password_hash,
    enabled: row.enabled,
  };
}

export const defaultAuthStore: AuthStore = {
  async findUserByEmail(email) {
    const result = await queryPostgres<UserRow>(
      "SELECT id, email, name, role, password_hash, enabled FROM users WHERE lower(email) = lower($1) LIMIT 1",
      [email],
    );
    return result.rows[0] ? toUser(result.rows[0]) : null;
  },

  async createSession(userId, expiresAt) {
    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    const result = await queryPostgres<{ id: string }>(
      "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING id",
      [userId, tokenHash, expiresAt.toISOString()],
    );
    return {
      id: result.rows[0].id,
      token,
      tokenHash,
      userId,
      expiresAt,
    };
  },

  async findUserBySessionToken(token, now = new Date()) {
    const result = await queryPostgres<UserRow>(
      `SELECT users.id, users.email, users.name, users.role, users.password_hash, users.enabled
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = $1 AND sessions.expires_at > $2 AND users.enabled = true
       LIMIT 1`,
      [hashSessionToken(token), now.toISOString()],
    );
    return result.rows[0] ? toUser(result.rows[0]) : null;
  },

  async deleteSession(token) {
    await queryPostgres("DELETE FROM sessions WHERE token_hash = $1", [
      hashSessionToken(token),
    ]);
  },

  async updateUserProfile(userId, input) {
    const result = await queryPostgres<UserRow>(
      `UPDATE users
       SET name = $2, updated_at = now()
       WHERE id = $1 AND enabled = true
       RETURNING id, email, name, role, password_hash, enabled`,
      [userId, input.name],
    );
    return result.rows[0] ? toUser(result.rows[0]) : null;
  },
};
