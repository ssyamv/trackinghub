import { defaultAuthStore } from "@/lib/auth/default-auth-store";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { parseSessionCookie } from "@/lib/auth/session";
import { createMemoryMetadataStore } from "@/lib/metadata/metadata-store";
import { handleSdkKeyPatch } from "./handlers";

export const runtime = "nodejs";

const routeMetadataStore = createMemoryMetadataStore();

type SdkKeyRouteContext = {
  params: Promise<{ id: string }>;
};

async function getCurrentUser(request: Request): Promise<AuthenticatedUser | null> {
  const token = parseSessionCookie(request.headers.get("cookie"));

  if (!token) {
    return null;
  }

  return defaultAuthStore.findUserBySessionToken(token);
}

export async function PATCH(request: Request, { params }: SdkKeyRouteContext) {
  const { id } = await params;

  return handleSdkKeyPatch(request, {
    store: routeMetadataStore,
    user: await getCurrentUser(request),
    sdkKeyId: id,
  });
}
