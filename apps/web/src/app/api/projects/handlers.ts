import { jsonError, jsonOk, mapApiError } from "@/lib/api/http";
import { assertCanWrite, type AuthenticatedUser } from "@/lib/auth/permissions";
import type { MetadataStore } from "@/lib/metadata/metadata-store";

export async function handleProjectsGet({
  store,
}: {
  store: MetadataStore;
  user: AuthenticatedUser | null;
}) {
  try {
    return jsonOk(await store.listProjectsOverview());
  } catch (error) {
    return mapApiError(error);
  }
}

export async function handleProjectsPost(
  request: Request,
  { store, user }: { store: MetadataStore; user: AuthenticatedUser | null },
) {
  try {
    assertCanWrite(user);
    const body: unknown = await request.json();
    const name =
      typeof body === "object" &&
      body !== null &&
      "name" in body &&
      typeof body.name === "string"
        ? body.name.trim()
        : "";
    const slug =
      typeof body === "object" &&
      body !== null &&
      "slug" in body &&
      typeof body.slug === "string"
        ? body.slug.trim()
        : "";

    if (!name || !slug) {
      return jsonError(400, "VALIDATION_ERROR", "项目名称和 slug 不能为空");
    }

    const project = await store.createProject({
      name,
      slug,
      description:
        typeof body === "object" &&
        body !== null &&
        "description" in body &&
        typeof body.description === "string"
          ? body.description
          : "",
      ownerName:
        typeof body === "object" &&
        body !== null &&
        "ownerName" in body &&
        typeof body.ownerName === "string"
          ? body.ownerName
          : "未分配",
      platforms:
        typeof body === "object" &&
        body !== null &&
        "platforms" in body &&
        Array.isArray(body.platforms)
          ? body.platforms
          : [],
    });

    return jsonOk({ project }, { status: 201 });
  } catch (error) {
    return mapApiError(error);
  }
}
