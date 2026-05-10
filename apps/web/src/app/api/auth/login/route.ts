import { jsonError, jsonOk, mapApiError } from "@/lib/api/http";
import type { AuthStore } from "@/lib/auth/auth-store";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionCookie, sessionExpiresAt } from "@/lib/auth/session";

export const runtime = "nodejs";

type LoginDependencies = {
  store: AuthStore;
  now?: () => Date;
};

export async function handleLoginPost(
  request: Request,
  dependencies: LoginDependencies,
) {
  try {
    const body = await request.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return jsonError(400, "VALIDATION_ERROR", "邮箱和密码不能为空");
    }

    const user = await dependencies.store.findUserByEmail(email);

    if (
      !user ||
      !user.enabled ||
      !(await verifyPassword(password, user.passwordHash))
    ) {
      return jsonError(401, "UNAUTHENTICATED", "邮箱或密码不正确");
    }

    const expiresAt = sessionExpiresAt(dependencies.now?.() ?? new Date());
    const session = await dependencies.store.createSession(user.id, expiresAt);

    return jsonOk(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      {
        headers: {
          "Set-Cookie": createSessionCookie(session.token, expiresAt),
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

  return handleLoginPost(request, { store: defaultAuthStore });
}
