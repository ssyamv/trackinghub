import { withApiUser } from "@/lib/api/auth";
import { handleReportPreviewGet } from "./handlers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiUser(request, (user) =>
    handleReportPreviewGet(request, {
      user,
    }),
  );
}
