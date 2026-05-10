import { jsonError, jsonOk, mapApiError } from "@/lib/api/http";
import type { AuthStore } from "@/lib/auth/auth-store";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionCookie, sessionExpiresAt } from "@/lib/auth/session";

type LoginDependencies = {
  store: AuthStore;
  now?: () => Date;
};

export async function handleLoginPost(
  request: Request,
  dependencies: LoginDependencies,
) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "VALIDATION_ERROR", "请求体必须是合法 JSON");
  }

  try {
    const email =
      typeof body === "object" &&
      body !== null &&
      "email" in body &&
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";
    const password =
      typeof body === "object" &&
      body !== null &&
      "password" in body &&
      typeof body.password === "string"
        ? body.password
        : "";

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
