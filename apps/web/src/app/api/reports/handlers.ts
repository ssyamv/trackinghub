import { jsonError, jsonOk, mapApiError } from "@/lib/api/http";
import {
  assertCanRead,
  assertCanWrite,
  type AuthenticatedUser,
} from "@/lib/auth/permissions";
import type {
  MetadataStore,
  ReportSourceQueryRef,
  ReportType,
} from "@/lib/metadata/metadata-store";

const REPORT_TYPES = [
  "daily",
  "weekly",
  "anomaly",
  "version_comparison",
  "campaign_comparison",
  "funnel_dropoff",
  "schema_quality",
] as const;

function isReportType(value: unknown): value is ReportType {
  return (
    typeof value === "string" &&
    REPORT_TYPES.some((reportType) => reportType === value)
  );
}

function readString(body: unknown, key: string) {
  if (typeof body !== "object" || body === null) {
    return "";
  }

  const value = (body as Record<string, unknown>)[key];

  return typeof value === "string" ? value.trim() : "";
}

function readSourceQueryRefs(body: unknown): ReportSourceQueryRef[] | null {
  if (
    typeof body !== "object" ||
    body === null ||
    !("sourceQueryRefs" in body) ||
    !Array.isArray(body.sourceQueryRefs)
  ) {
    return null;
  }

  if (
    !body.sourceQueryRefs.every(
      (item) => typeof item === "object" && item !== null && !Array.isArray(item),
    )
  ) {
    return null;
  }

  return body.sourceQueryRefs as ReportSourceQueryRef[];
}

function generatedBy(user: AuthenticatedUser) {
  return user.email ?? user.name ?? "codex";
}

export async function handleReportsGet(
  request: Request,
  { store, user }: { store: MetadataStore; user: AuthenticatedUser | null },
) {
  try {
    assertCanRead(user);
    const projectId = new URL(request.url).searchParams.get("project_id")?.trim();

    if (!projectId) {
      return jsonError(400, "VALIDATION_ERROR", "project_id 不能为空");
    }

    return jsonOk({ reports: await store.listReports(projectId) });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function handleReportsPost(
  request: Request,
  { store, user }: { store: MetadataStore; user: AuthenticatedUser | null },
) {
  try {
    assertCanWrite(user);
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError(400, "VALIDATION_ERROR", "请求体必须是合法 JSON");
    }

    const projectId = readString(body, "projectId");
    const title = readString(body, "title");
    const content = readString(body, "content");
    const typeValue =
      typeof body === "object" && body !== null && "type" in body
        ? body.type
        : undefined;
    const sourceQueryRefs = readSourceQueryRefs(body);

    if (!projectId || !title || !content || !isReportType(typeValue) || !sourceQueryRefs) {
      return jsonError(400, "VALIDATION_ERROR");
    }

    const report = await store.createReport({
      projectId,
      type: typeValue,
      title,
      content,
      sourceQueryRefs,
      generatedBy: generatedBy(user),
    });

    return jsonOk({ report }, { status: 201 });
  } catch (error) {
    return mapApiError(error);
  }
}
