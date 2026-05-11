import { jsonError, jsonOk, mapApiError } from "@/lib/api/http";
import { assertCanWrite, type AuthenticatedUser } from "@/lib/auth/permissions";
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

function readOptionalString(
  body: Record<string, unknown>,
  key: string,
): string | undefined {
  if (!(key in body)) {
    return undefined;
  }

  const value = body[key];

  return typeof value === "string" ? value.trim() : "";
}

export async function handleEventDefinitionPatch(
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

    const input: Parameters<MetadataStore["updateEventDefinition"]>[1] = {};

    for (const key of [
      "displayName",
      "description",
      "triggerTiming",
      "module",
    ] as const) {
      const value = readOptionalString(body, key);

      if (value !== undefined) {
        input[key] = value;
      }
    }

    if ("platforms" in body) {
      if (
        !Array.isArray(body.platforms) ||
        !body.platforms.every(isPlatformSource)
      ) {
        return jsonError(400, "VALIDATION_ERROR", "事件平台只支持 web 或 flutter");
      }

      input.platforms = body.platforms;
    }

    if ("status" in body) {
      if (!isEventDefinitionStatus(body.status)) {
        return jsonError(400, "VALIDATION_ERROR", "事件状态不正确");
      }

      input.status = body.status;
    }

    if ("requiredProperties" in body) {
      const requiredProperties = parseRequiredProperties(body.requiredProperties);

      if (!requiredProperties) {
        return jsonError(400, "VALIDATION_ERROR", "必填属性格式不正确");
      }

      input.requiredProperties = requiredProperties;
    }

    const definition = await store.updateEventDefinition(
      eventDefinitionId,
      input,
    );

    return jsonOk({ definition });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function handleEventDefinitionDelete({
  store,
  user,
  eventDefinitionId,
}: {
  store: MetadataStore;
  user: AuthenticatedUser | null;
  eventDefinitionId: string;
}) {
  try {
    assertCanWrite(user);

    await store.deleteEventDefinition(eventDefinitionId);

    return jsonOk({ deleted: true });
  } catch (error) {
    return mapApiError(error);
  }
}
