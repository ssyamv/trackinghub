import { defaultAuthStore } from "@/lib/auth/default-auth-store";
import { handleMeGet, handleMePatch } from "./handlers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleMeGet(request, { store: defaultAuthStore });
}

export async function PATCH(request: Request) {
  return handleMePatch(request, { store: defaultAuthStore });
}
