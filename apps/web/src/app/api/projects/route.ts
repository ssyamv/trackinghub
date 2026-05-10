import { defaultAuthStore } from "@/lib/auth/default-auth-store";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { parseSessionCookie } from "@/lib/auth/session";
import { createMemoryMetadataStore } from "@/lib/metadata/metadata-store";
import { handleProjectsGet, handleProjectsPost } from "./handlers";

export const runtime = "nodejs";

const routeMetadataStore = createMemoryMetadataStore();

async function getCurrentUser(request: Request): Promise<AuthenticatedUser | null> {
  const token = parseSessionCookie(request.headers.get("cookie"));

  if (!token) {
    return null;
  }

  return defaultAuthStore.findUserBySessionToken(token);
}

export async function GET(request: Request) {
  return handleProjectsGet({
    store: routeMetadataStore,
    user: await getCurrentUser(request),
  });
}

export async function POST(request: Request) {
  return handleProjectsPost(request, {
    store: routeMetadataStore,
    user: await getCurrentUser(request),
  });
}
