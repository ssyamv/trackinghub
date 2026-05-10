import { withApiUser } from "@/lib/api/auth";
import { defaultMetadataStore } from "@/lib/metadata/default-metadata-store";
import { handleProjectEnvironmentPost } from "./handlers";

export const runtime = "nodejs";

type ProjectEnvironmentRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  { params }: ProjectEnvironmentRouteContext,
) {
  const { id } = await params;

  return withApiUser(request, (user) =>
    handleProjectEnvironmentPost(request, {
      store: defaultMetadataStore,
      user,
      projectId: id,
    }),
  );
}
