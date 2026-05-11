import { jsonError, jsonOk, mapApiError } from "@/lib/api/http";
import type { AuthStore } from "@/lib/auth/auth-store";
import { parseSessionCookie } from "@/lib/auth/session";

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

async function readProfilePatchBody(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { error: "请求体必须是合法 JSON" as const };
  }

  if (!body || typeof body !== "object" || !("name" in body)) {
    return { error: "姓名不能为空" as const };
  }

  const name = String((body as { name: unknown }).name).trim();

  if (!name) {
    return { error: "姓名不能为空" as const };
  }

  if (name.length > 80) {
    return { error: "姓名不能超过 80 个字符" as const };
  }

  return { name };
}

export async function handleMePatch(
  request: Request,
  dependencies: MeDependencies,
) {
  try {
    const token = parseSessionCookie(request.headers.get("cookie"));

    if (!token) {
      return jsonError(401, "UNAUTHENTICATED");
    }

    const currentUser = await dependencies.store.findUserBySessionToken(token);

    if (!currentUser?.id) {
      return jsonError(401, "UNAUTHENTICATED");
    }

    const body = await readProfilePatchBody(request);

    if ("error" in body) {
      return jsonError(400, "VALIDATION_ERROR", body.error);
    }

    const user = await dependencies.store.updateUserProfile(currentUser.id, {
      name: body.name,
    });

    if (!user) {
      return jsonError(404, "NOT_FOUND");
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
