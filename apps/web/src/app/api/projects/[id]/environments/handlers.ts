import { jsonError, jsonOk, mapApiError } from "@/lib/api/http";
import { assertCanWrite, type AuthenticatedUser } from "@/lib/auth/permissions";
import type {
  MetadataStore,
  ProjectEnvironmentName,
} from "@/lib/metadata/metadata-store";

const PROJECT_ENVIRONMENT_NAMES = ["dev", "staging", "prod"] as const;

function isProjectEnvironmentName(
  value: string,
): value is ProjectEnvironmentName {
  return PROJECT_ENVIRONMENT_NAMES.some((name) => name === value);
}

export async function handleProjectEnvironmentPost(
  request: Request,
  {
    store,
    user,
    projectId,
  }: {
    store: MetadataStore;
    user: AuthenticatedUser | null;
    projectId: string;
  },
) {
  try {
    assertCanWrite(user);
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError(400, "VALIDATION_ERROR", "请求体必须是合法 JSON");
    }

    const name =
      typeof body === "object" &&
      body !== null &&
      "name" in body &&
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    if (!isProjectEnvironmentName(name)) {
      return jsonError(400, "VALIDATION_ERROR", "环境名称必须是 dev、staging 或 prod");
    }

    const environment = await store.upsertEnvironment(projectId, {
      name,
      enabled:
        typeof body === "object" &&
        body !== null &&
        "enabled" in body &&
        typeof body.enabled === "boolean"
          ? body.enabled
          : true,
      lastEventAt: null,
    });

    return jsonOk({ environment }, { status: 201 });
  } catch (error) {
    return mapApiError(error);
  }
}
