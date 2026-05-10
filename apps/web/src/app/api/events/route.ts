import { validateTrackingEnvelope } from "../../../lib/tracking/envelope";

export async function POST(request: Request) {
  let payload: unknown;

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

  return Response.json(
    {
      accepted: true,
      event_id: crypto.randomUUID(),
      event_name: result.value.event_name,
      received_at: new Date().toISOString(),
    },
    { status: 202 },
  );
}
