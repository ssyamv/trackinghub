import { validateTrackingEnvelope } from "../../../lib/tracking/envelope";
import {
  createEventWriterFromEnv,
  type EventWriter,
} from "../../../lib/tracking/event-writer";
import { defaultMetadataStore } from "@/lib/metadata/default-metadata-store";
import type { MetadataStore } from "@/lib/metadata/metadata-store";
import { hashSdkWriteKey } from "@/lib/metadata/metadata-store";
import { getPostgresConnectionString } from "@/lib/metadata/postgres";
import {
  eventDefinitionToSchema,
  validateEventSchema,
  type EventSchema,
} from "../../../lib/tracking/schema-validation";

export const runtime = "nodejs";

type EventPostDependencies = {
  eventWriter?: EventWriter;
  metadataStore?: MetadataStore | null;
  createEventId?: () => string;
  now?: () => Date;
};

const defaultEventWriter = createEventWriterFromEnv();

export async function handleEventPost(
  request: Request,
  dependencies: EventPostDependencies = {},
) {
  let payload: unknown;
  const eventWriter = dependencies.eventWriter ?? defaultEventWriter;
  const metadataStore =
    dependencies.metadataStore === undefined
      ? getPostgresConnectionString()
        ? defaultMetadataStore
        : null
      : dependencies.metadataStore;
  const createEventId =
    dependencies.createEventId ?? (() => crypto.randomUUID());
  const now = dependencies.now ?? (() => new Date());

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      {
        accepted: false,
        errors: ["request body must be valid JSON"],
      },
      { status: 400 },
    );
  }

  const result = validateTrackingEnvelope(payload);

  if (!result.ok) {
    return Response.json(
      {
        accepted: false,
        errors: result.errors,
      },
      { status: 400 },
    );
  }

  const eventId = createEventId();
  const receivedAt = now().toISOString();
  let runtimeSchema: EventSchema | null | undefined;

  if (metadataStore) {
    const writeKey = request.headers.get("x-trackinghub-write-key");

    if (!writeKey) {
      return Response.json(
        {
          accepted: false,
          errors: ["invalid write key"],
        },
        { status: 401 },
      );
    }

    try {
      const verification = await metadataStore.verifySdkWriteKey({
        projectId: result.value.project_id,
        environment: result.value.environment,
        source: result.value.source,
        keyHash: hashSdkWriteKey(writeKey),
      });

      if (!verification.valid) {
        return Response.json(
          {
            accepted: false,
            errors: ["invalid write key"],
          },
          { status: 401 },
        );
      }

      const definition = await metadataStore.findValidatableEventDefinition({
        projectId: result.value.project_id,
        eventName: result.value.event_name,
        source: result.value.source,
      });

      runtimeSchema = definition ? eventDefinitionToSchema(definition) : null;
    } catch {
      return Response.json(
        {
          accepted: false,
          errors: ["event metadata is unavailable"],
        },
        { status: 503 },
      );
    }
  }

  try {
    const validationResult = validateEventSchema(
      result.value,
      eventId,
      receivedAt,
      runtimeSchema,
    );

    await eventWriter.writeRawEvent({
      ...result.value,
      event_id: eventId,
      received_at: receivedAt,
    });
    await eventWriter.writeValidationResult(validationResult);
    await metadataStore?.recordValidationResult(validationResult);
  } catch {
    return Response.json(
      {
        accepted: false,
        errors: ["event persistence is unavailable"],
      },
      { status: 503 },
    );
  }

  return Response.json(
    {
      accepted: true,
      event_id: eventId,
      event_name: result.value.event_name,
      received_at: receivedAt,
    },
    { status: 202 },
  );
}

export async function POST(request: Request) {
  return handleEventPost(request);
}
