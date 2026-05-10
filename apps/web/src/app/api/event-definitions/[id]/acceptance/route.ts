import { withApiUser } from "@/lib/api/auth";
import { defaultMetadataStore } from "@/lib/metadata/default-metadata-store";
import { handleEventDefinitionAcceptancePost } from "./handlers";

export const runtime = "nodejs";

type EventDefinitionAcceptanceRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  { params }: EventDefinitionAcceptanceRouteContext,
) {
  const { id } = await params;

  return withApiUser(request, (user) =>
    handleEventDefinitionAcceptancePost(request, {
      store: defaultMetadataStore,
      user,
      eventDefinitionId: id,
    }),
  );
}
