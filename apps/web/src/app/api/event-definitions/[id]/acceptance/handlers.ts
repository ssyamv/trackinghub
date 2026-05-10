import { jsonError, jsonOk, mapApiError } from "@/lib/api/http";
import { assertCanWrite, type AuthenticatedUser } from "@/lib/auth/permissions";
import type { MetadataStore } from "@/lib/metadata/metadata-store";

const ACCEPTANCE_STATUSES = ["accepted", "rejected", "needs_fix"] as const;

type AcceptanceStatus = (typeof ACCEPTANCE_STATUSES)[number];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAcceptanceStatus(value: unknown): value is AcceptanceStatus {
  return (
    typeof value === "string" &&
    ACCEPTANCE_STATUSES.some((status) => status === value)
  );
}

export async function handleEventDefinitionAcceptancePost(
  request: Request,
  {
    store,
    user,
    eventDefinitionId,
  }: {
    store: MetadataStore;
    user: AuthenticatedUser | null;
    eventDefinitionId: string;
  },
) {
  try {
    assertCanWrite(user);
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError(400, "VALIDATION_ERROR", "请求体必须是合法 JSON");
    }

    if (!isObject(body)) {
      return jsonError(400, "VALIDATION_ERROR", "请求体必须是对象");
    }

    if (!isAcceptanceStatus(body.status)) {
      return jsonError(400, "VALIDATION_ERROR", "验收状态不正确");
    }

    const acceptance = await store.createAcceptanceRecord(eventDefinitionId, {
      actorUserId: user?.id ?? null,
      status: body.status,
      note: typeof body.note === "string" ? body.note : "",
    });

    return jsonOk({ acceptance }, { status: 201 });
  } catch (error) {
    return mapApiError(error);
  }
}
