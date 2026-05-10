import { createHash, randomBytes } from "node:crypto";
import type { AuthenticatedUser, UserRole } from "./permissions";

export type AuthUserRecord = AuthenticatedUser & {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  enabled: boolean;
};

export type SessionRecord = {
  id: string;
  token: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
};

export type AuthStore = {
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  createSession(userId: string, expiresAt: Date): Promise<SessionRecord>;
  findUserBySessionToken(
    token: string,
    now?: Date,
  ): Promise<AuthenticatedUser | null>;
  deleteSession(token: string): Promise<void>;
};

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
