import { defaultAuthStore } from "@/lib/auth/default-auth-store";
import { handleLoginPost } from "./handlers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleLoginPost(request, { store: defaultAuthStore });
}
