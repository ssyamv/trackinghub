import { withApiUser } from "@/lib/api/auth";
import { defaultMetadataStore } from "@/lib/metadata/default-metadata-store";
import { handleEventDefinitionPatch } from "./handlers";

export const runtime = "nodejs";

type EventDefinitionRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  { params }: EventDefinitionRouteContext,
) {
  const { id } = await params;

  return withApiUser(request, (user) =>
    handleEventDefinitionPatch(request, {
      store: defaultMetadataStore,
      user,
      eventDefinitionId: id,
    }),
  );
}
