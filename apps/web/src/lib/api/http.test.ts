import { describe, expect, it } from "vitest";
import { AuthError } from "@/lib/auth/permissions";
import { MetadataStoreError } from "@/lib/metadata/metadata-store";
import { jsonError, mapApiError } from "./http";

describe("api http helpers", () => {
  it("returns stable Chinese error payloads", async () => {
    const response = jsonError(400, "VALIDATION_ERROR", "字段格式不正确");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "字段格式不正确",
      },
    });
  });

  it("maps auth errors to 401 and 403", async () => {
    const unauthenticated = mapApiError(new AuthError("UNAUTHENTICATED"));
    const forbidden = mapApiError(new AuthError("FORBIDDEN"));

    expect(unauthenticated.status).toBe(401);
    expect(await unauthenticated.json()).toEqual({
      ok: false,
      error: { code: "UNAUTHENTICATED", message: "请先登录" },
    });
    expect(forbidden.status).toBe(403);
  });

  it("maps metadata missing resource errors to 404", async () => {
    for (const code of [
      "PROJECT_NOT_FOUND",
      "ENVIRONMENT_NOT_FOUND",
      "SDK_KEY_NOT_FOUND",
      "EVENT_DEFINITION_NOT_FOUND",
    ] as const) {
      const response = mapApiError(new MetadataStoreError(code));

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        ok: false,
        error: { code: "NOT_FOUND", message: "资源不存在" },
      });
    }
  });
});
