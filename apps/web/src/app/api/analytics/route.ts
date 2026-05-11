import { withApiUser } from "@/lib/api/auth";
import { handleAnalyticsGet } from "./handlers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiUser(request, (user) =>
    handleAnalyticsGet(request, {
      user,
    }),
  );
}
