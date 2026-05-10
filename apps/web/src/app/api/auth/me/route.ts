import { jsonError, jsonOk, mapApiError } from "@/lib/api/http";
import type { AuthStore } from "@/lib/auth/auth-store";
import { parseSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

type MeDependencies = {
  store: AuthStore;
};

export async function handleMeGet(
  request: Request,
  dependencies: MeDependencies,
) {
  try {
    const token = parseSessionCookie(request.headers.get("cookie"));

    if (!token) {
      return jsonError(401, "UNAUTHENTICATED");
    }

    const user = await dependencies.store.findUserBySessionToken(token);

    if (!user) {
      return jsonError(401, "UNAUTHENTICATED");
    }

    return jsonOk({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function GET(request: Request) {
  const { defaultAuthStore } = await import(
    ["@/lib/auth", "default-auth-store"].join("/")
  );

  return handleMeGet(request, { store: defaultAuthStore });
}
