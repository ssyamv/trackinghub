import { withApiUser } from "@/lib/api/auth";
import { defaultMetadataStore } from "@/lib/metadata/default-metadata-store";
import {
  handleEventDefinitionsGet,
  handleEventDefinitionsPost,
} from "./handlers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiUser(request, (user) =>
    handleEventDefinitionsGet({
      store: defaultMetadataStore,
      user,
    }),
  );
}

export async function POST(request: Request) {
  return withApiUser(request, (user) =>
    handleEventDefinitionsPost(request, {
      store: defaultMetadataStore,
      user,
    }),
  );
}
