import { defaultAuthStore } from "@/lib/auth/default-auth-store";
import { handleLogoutPost } from "./handlers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleLogoutPost(request, { store: defaultAuthStore });
}
