import { jsonError, jsonOk, mapApiError } from "@/lib/api/http";
import {
  assertCanManageSdkKeys,
  type AuthenticatedUser,
} from "@/lib/auth/permissions";
import type { MetadataStore, SdkKeyStatus } from "@/lib/metadata/metadata-store";

const SDK_KEY_STATUSES = ["active", "rotating", "disabled"] as const;

function isSdkKeyStatus(value: string): value is SdkKeyStatus {
  return SDK_KEY_STATUSES.some((status) => status === value);
}

export async function handleSdkKeyPatch(
  request: Request,
  {
    store,
    user,
    sdkKeyId,
  }: {
    store: MetadataStore;
    user: AuthenticatedUser | null;
    sdkKeyId: string;
  },
) {
  try {
    assertCanManageSdkKeys(user);
    const body: unknown = await request.json();
    const status =
      typeof body === "object" &&
      body !== null &&
      "status" in body &&
      typeof body.status === "string"
        ? body.status.trim()
        : "";

    if (!isSdkKeyStatus(status)) {
      return jsonError(400, "VALIDATION_ERROR", "SDK Key 状态不正确");
    }

    const sdkKey = await store.updateSdkKeyStatus(sdkKeyId, status);

    return jsonOk({ sdkKey });
  } catch (error) {
    return mapApiError(error);
  }
}
