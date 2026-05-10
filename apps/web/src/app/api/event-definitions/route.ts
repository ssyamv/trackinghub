import { defaultAuthStore } from "@/lib/auth/default-auth-store";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { parseSessionCookie } from "@/lib/auth/session";
import { defaultMetadataStore } from "@/lib/metadata/default-metadata-store";
import { handleEventDefinitionsGet, handleEventDefinitionsPost } from "./handlers";

export const runtime = "nodejs";

async function getCurrentUser(
  request: Request,
): Promise<AuthenticatedUser | null> {
  const token = parseSessionCookie(request.headers.get("cookie"));

  if (!token) {
    return null;
  }

  return defaultAuthStore.findUserBySessionToken(token);
}

export async function GET(request: Request) {
  return handleEventDefinitionsGet({
    store: defaultMetadataStore,
    user: await getCurrentUser(request),
  });
}

export async function POST(request: Request) {
  return handleEventDefinitionsPost(request, {
    store: defaultMetadataStore,
    user: await getCurrentUser(request),
  });
}
