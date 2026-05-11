import { withApiUser } from "@/lib/api/auth";
import { defaultMetadataStore } from "@/lib/metadata/default-metadata-store";
import { handleReportsGet, handleReportsPost } from "./handlers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiUser(request, (user) =>
    handleReportsGet(request, {
      store: defaultMetadataStore,
      user,
    }),
  );
}

export async function POST(request: Request) {
  return withApiUser(request, (user) =>
    handleReportsPost(request, {
      store: defaultMetadataStore,
      user,
    }),
  );
}
