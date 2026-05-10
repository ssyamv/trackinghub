import { jsonOk, mapApiError } from "@/lib/api/http";
import type { AuthStore } from "@/lib/auth/auth-store";
import { clearSessionCookie, parseSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

type LogoutDependencies = {
  store: AuthStore;
};

export async function handleLogoutPost(
  request: Request,
  dependencies: LogoutDependencies,
) {
  try {
    const token = parseSessionCookie(request.headers.get("cookie"));

    if (token) {
      await dependencies.store.deleteSession(token);
    }

    return jsonOk(
      { loggedOut: true },
      {
        headers: {
          "Set-Cookie": clearSessionCookie(),
        },
      },
    );
  } catch (error) {
    return mapApiError(error);
  }
}

export async function POST(request: Request) {
  const { defaultAuthStore } = await import(
    ["@/lib/auth", "default-auth-store"].join("/")
  );

  return handleLogoutPost(request, { store: defaultAuthStore });
}
