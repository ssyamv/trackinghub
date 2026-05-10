import { withApiUser } from "@/lib/api/auth";
import { defaultMetadataStore } from "@/lib/metadata/default-metadata-store";
import { handleSdkKeyPatch } from "./handlers";

export const runtime = "nodejs";

type SdkKeyRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: SdkKeyRouteContext) {
  const { id } = await params;

  return withApiUser(request, (user) =>
    handleSdkKeyPatch(request, {
      store: defaultMetadataStore,
      user,
      sdkKeyId: id,
    }),
  );
}
