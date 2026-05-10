import type { AuthStore } from "@/lib/auth/auth-store";
import { handleLogoutPost } from "./handlers";

export const runtime = "nodejs";

const unavailableAuthStore: AuthStore = {
  findUserByEmail: async () => {
    throw new Error("AUTH_STORE_UNAVAILABLE");
  },
  createSession: async () => {
    throw new Error("AUTH_STORE_UNAVAILABLE");
  },
  findUserBySessionToken: async () => {
    throw new Error("AUTH_STORE_UNAVAILABLE");
  },
  deleteSession: async () => {
    throw new Error("AUTH_STORE_UNAVAILABLE");
  },
};

export async function POST(request: Request) {
  return handleLogoutPost(request, { store: unavailableAuthStore });
}
