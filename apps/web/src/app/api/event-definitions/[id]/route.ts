import { defaultAuthStore } from "@/lib/auth/default-auth-store";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { parseSessionCookie } from "@/lib/auth/session";
import { defaultMetadataStore } from "@/lib/metadata/default-metadata-store";
import { handleEventDefinitionPatch } from "./handlers";

export const runtime = "nodejs";

type EventDefinitionRouteContext = {
  params: Promise<{ id: string }>;
};

async function getCurrentUser(
  request: Request,
): Promise<AuthenticatedUser | null> {
  const token = parseSessionCookie(request.headers.get("cookie"));

  if (!token) {
    return null;
  }

  return defaultAuthStore.findUserBySessionToken(token);
}

export async function PATCH(
  request: Request,
  { params }: EventDefinitionRouteContext,
) {
  const { id } = await params;

  return handleEventDefinitionPatch(request, {
    store: defaultMetadataStore,
    user: await getCurrentUser(request),
    eventDefinitionId: id,
  });
}
