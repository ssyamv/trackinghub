export type UserRole = "admin" | "editor" | "viewer";

export type AuthenticatedUser = {
  id?: string;
  email?: string;
  name?: string;
  role: UserRole;
};

export class AuthError extends Error {
  constructor(
    public readonly code: "UNAUTHENTICATED" | "FORBIDDEN",
    message = code,
  ) {
    super(message);
  }
}

export function canWriteMetadata(role: UserRole) {
  return role === "admin" || role === "editor";
}

export function canManageSdkKeys(role: UserRole) {
  return role === "admin";
}

export function assertCanRead(user: AuthenticatedUser | null) {
  if (!user) {
    throw new AuthError("UNAUTHENTICATED");
  }
}

export function assertCanWrite(user: AuthenticatedUser | null) {
  if (!user) {
    throw new AuthError("UNAUTHENTICATED");
  }

  if (!canWriteMetadata(user.role)) {
    throw new AuthError("FORBIDDEN");
  }
}

export function assertCanManageSdkKeys(user: AuthenticatedUser | null) {
  if (!user) {
    throw new AuthError("UNAUTHENTICATED");
  }

  if (!canManageSdkKeys(user.role)) {
    throw new AuthError("FORBIDDEN");
  }
}
