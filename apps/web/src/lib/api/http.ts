import { AuthError } from "@/lib/auth/permissions";
import { MetadataStoreError } from "@/lib/metadata/metadata-store";

export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "DATABASE_UNAVAILABLE";

const DEFAULT_MESSAGES: Record<ApiErrorCode, string> = {
  UNAUTHENTICATED: "请先登录",
  FORBIDDEN: "当前账号没有权限执行此操作",
  VALIDATION_ERROR: "请求字段不完整或格式不正确",
  NOT_FOUND: "资源不存在",
  DATABASE_UNAVAILABLE: "元数据服务暂时不可用",
};

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return Response.json({ ok: true, data }, init);
}

export function jsonError(
  status: number,
  code: ApiErrorCode,
  message = DEFAULT_MESSAGES[code],
) {
  return Response.json(
    {
      ok: false,
      error: { code, message },
    },
    { status },
  );
}

export function mapApiError(error: unknown) {
  if (error instanceof AuthError) {
    return jsonError(error.code === "UNAUTHENTICATED" ? 401 : 403, error.code);
  }

  if (error instanceof MetadataStoreError) {
    return jsonError(404, "NOT_FOUND");
  }

  return jsonError(503, "DATABASE_UNAVAILABLE");
}
