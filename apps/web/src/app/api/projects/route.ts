import { withApiUser } from "@/lib/api/auth";
import { defaultMetadataStore } from "@/lib/metadata/default-metadata-store";
import { handleProjectsGet, handleProjectsPost } from "./handlers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiUser(request, (user) =>
    handleProjectsGet({
      store: defaultMetadataStore,
      user,
    }),
  );
}

export async function POST(request: Request) {
  return withApiUser(request, (user) =>
    handleProjectsPost(request, {
      store: defaultMetadataStore,
      user,
    }),
  );
}
