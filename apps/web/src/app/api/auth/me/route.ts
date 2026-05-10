import { defaultAuthStore } from "@/lib/auth/default-auth-store";
import { handleMeGet } from "./handlers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleMeGet(request, { store: defaultAuthStore });
}
