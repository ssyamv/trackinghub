import { validateTrackingEnvelope } from "../../../lib/tracking/envelope";
import {
  createEventWriterFromEnv,
  type EventWriter,
} from "../../../lib/tracking/event-writer";
import { validateEventSchema } from "../../../lib/tracking/schema-validation";

export const runtime = "nodejs";

type EventPostDependencies = {
  eventWriter?: EventWriter;
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

  try {
    await eventWriter.writeRawEvent({
      ...result.value,
      event_id: eventId,
      received_at: receivedAt,
    });
    await eventWriter.writeValidationResult(
      validateEventSchema(result.value, eventId, receivedAt),
    );
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
