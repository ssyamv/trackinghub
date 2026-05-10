import { jsonError, jsonOk, mapApiError } from "@/lib/api/http";
import {
  assertCanRead,
  assertCanWrite,
  type AuthenticatedUser,
} from "@/lib/auth/permissions";
import type {
  EventDefinitionStatus,
  EventPropertyRecord,
  MetadataStore,
  PlatformSource,
} from "@/lib/metadata/metadata-store";

const PLATFORM_SOURCES = ["web", "flutter"] as const;
const EVENT_DEFINITION_STATUSES = [
  "draft",
  "ready",
  "released",
  "accepted",
  "deprecated",
] as const;
const EVENT_PROPERTY_TYPES = [
  "string",
  "number",
  "boolean",
  "object",
  "array",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlatformSource(value: unknown): value is PlatformSource {
  return (
    typeof value === "string" &&
    PLATFORM_SOURCES.some((platform) => platform === value)
  );
}

function isEventDefinitionStatus(
  value: unknown,
): value is EventDefinitionStatus {
  return (
    typeof value === "string" &&
    EVENT_DEFINITION_STATUSES.some((status) => status === value)
  );
}

function isEventPropertyType(
  value: unknown,
): value is EventPropertyRecord["type"] {
  return (
    typeof value === "string" &&
    EVENT_PROPERTY_TYPES.some((propertyType) => propertyType === value)
  );
}

function parsePlatforms(value: unknown) {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || !value.every(isPlatformSource)) {
    return null;
  }

  return value;
}

function parseRequiredProperties(value: unknown): EventPropertyRecord[] | null {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const properties: EventPropertyRecord[] = [];

  for (const item of value) {
    if (!isObject(item)) {
      return null;
    }

    const type = item.type ?? "string";

    if (
      typeof item.name !== "string" ||
      !item.name.trim() ||
      !isEventPropertyType(type)
    ) {
      return null;
    }

    properties.push({
      name: item.name.trim(),
      type,
      required: typeof item.required === "boolean" ? item.required : true,
      description:
        typeof item.description === "string" ? item.description : "",
      exampleValue:
        typeof item.exampleValue === "string" ||
        typeof item.exampleValue === "number" ||
        typeof item.exampleValue === "boolean"
          ? item.exampleValue
          : null,
    });
  }

  return properties;
}

function readString(body: Record<string, unknown>, key: string) {
  const value = body[key];

  return typeof value === "string" ? value.trim() : "";
}

export async function handleEventDefinitionsGet({
  store,
  user,
}: {
  store: MetadataStore;
  user: AuthenticatedUser | null;
}) {
  try {
    assertCanRead(user);
    return jsonOk(await store.listEventDefinitions());
  } catch (error) {
    return mapApiError(error);
  }
}

export async function handleEventDefinitionsPost(
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

    if (!isObject(body)) {
      return jsonError(400, "VALIDATION_ERROR", "请求体必须是对象");
    }

    const projectId = readString(body, "projectId");
    const name = readString(body, "name");
    const displayName = readString(body, "displayName");

    if (!projectId || !name || !displayName) {
      return jsonError(400, "VALIDATION_ERROR", "项目、事件名和展示名不能为空");
    }

    const platforms = parsePlatforms(body.platforms);

    if (!platforms) {
      return jsonError(400, "VALIDATION_ERROR", "事件平台只支持 web 或 flutter");
    }

    const status = body.status ?? "draft";

    if (!isEventDefinitionStatus(status)) {
      return jsonError(400, "VALIDATION_ERROR", "事件状态不正确");
    }

    const requiredProperties = parseRequiredProperties(body.requiredProperties);

    if (!requiredProperties) {
      return jsonError(400, "VALIDATION_ERROR", "必填属性格式不正确");
    }

    const definition = await store.createEventDefinition({
      projectId,
      name,
      displayName,
      description: readString(body, "description"),
      triggerTiming: readString(body, "triggerTiming"),
      module: readString(body, "module"),
      platforms,
      status,
      requiredProperties,
    });

    return jsonOk({ definition }, { status: 201 });
  } catch (error) {
    return mapApiError(error);
  }
}
