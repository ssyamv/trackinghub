import type { AuthStore } from "@/lib/auth/auth-store";
import { defaultAuthStore } from "@/lib/auth/default-auth-store";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { parseSessionCookie } from "@/lib/auth/session";
import { mapApiError } from "./http";

export async function getCurrentUser(
  request: Request,
  store: AuthStore = defaultAuthStore,
): Promise<AuthenticatedUser | null> {
  return getCurrentUserFromCookieHeader(request.headers.get("cookie"), store);
}

export async function getCurrentUserFromCookieHeader(
  cookieHeader: string | null,
  store: AuthStore = defaultAuthStore,
): Promise<AuthenticatedUser | null> {
  const token = parseSessionCookie(cookieHeader);

  if (!token) {
    return null;
  }

  return store.findUserBySessionToken(token);
}

export async function withApiUser(
  request: Request,
  handler: (user: AuthenticatedUser | null) => Promise<Response>,
  store: AuthStore = defaultAuthStore,
) {
  try {
    return await handler(await getCurrentUser(request, store));
  } catch (error) {
    return mapApiError(error);
  }
}
