import { withApiUser } from "@/lib/api/auth";
import { jsonError, jsonOk, mapApiError } from "@/lib/api/http";
import { assertCanRead, AuthError, type AuthenticatedUser } from "@/lib/auth/permissions";
import {
  createClickHouseLogsClientFromEnv,
  normalizeLogsFilters,
  type ClickHouseLogsClient,
  type LogsFilterInput,
} from "@/lib/logs/clickhouse-logs";
import { validateLogEnvelope } from "@/lib/logs/envelope";
import {
  createLogWriterFromEnv,
  type LogWriter,
} from "@/lib/logs/log-writer";
import { defaultMetadataStore } from "@/lib/metadata/default-metadata-store";
import type { MetadataStore } from "@/lib/metadata/metadata-store";
import { hashSdkWriteKey } from "@/lib/metadata/metadata-store";
import { getPostgresConnectionString } from "@/lib/metadata/postgres";

export const runtime = "nodejs";

type LogPostDependencies = {
  logWriter?: LogWriter;
  metadataStore?: MetadataStore | null;
  createLogId?: () => string;
  now?: () => Date;
};

type LogGetDependencies = {
  client?: ClickHouseLogsClient | null;
  user: AuthenticatedUser | null;
};

const defaultLogWriter = createLogWriterFromEnv();

function filterInputFromUrl(url: string): LogsFilterInput {
  const searchParams = new URL(url).searchParams;
  const input: Record<string, string | string[]> = {};

  for (const [key, value] of searchParams.entries()) {
    const existing = input[key];

    if (Array.isArray(existing)) {
      existing.push(value);
    } else if (existing) {
      input[key] = [existing, value];
    } else {
      input[key] = value;
    }
  }

  return input;
}

export async function handleLogPost(
  request: Request,
  dependencies: LogPostDependencies = {},
) {
  let payload: unknown;
  const logWriter = dependencies.logWriter ?? defaultLogWriter;
  const metadataStore =
    dependencies.metadataStore === undefined
      ? getPostgresConnectionString()
        ? defaultMetadataStore
        : null
      : dependencies.metadataStore;
  const createLogId = dependencies.createLogId ?? (() => crypto.randomUUID());
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

  const result = validateLogEnvelope(payload);

  if (!result.ok) {
    return Response.json(
      {
        accepted: false,
        errors: result.errors,
      },
      { status: 400 },
    );
  }

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
    } catch {
      return Response.json(
        {
          accepted: false,
          errors: ["log metadata is unavailable"],
        },
        { status: 503 },
      );
    }
  }

  const logId = createLogId();
  const receivedAt = now().toISOString();

  try {
    await logWriter.writeLog({
      ...result.value,
      log_id: logId,
      received_at: receivedAt,
    });
  } catch {
    return Response.json(
      {
        accepted: false,
        errors: ["log persistence is unavailable"],
      },
      { status: 503 },
    );
  }

  return Response.json(
    {
      accepted: true,
      log_id: logId,
      level: result.value.level,
      received_at: receivedAt,
    },
    { status: 202 },
  );
}

export async function handleLogGet(
  request: Request,
  { client, user }: LogGetDependencies,
) {
  try {
    assertCanRead(user);

    const input = filterInputFromUrl(request.url);
    const logsClient = client ?? createClickHouseLogsClientFromEnv();
    const logs = logsClient
      ? await logsClient.loadLogs(input)
      : {
          source: "unavailable" as const,
          filters: normalizeLogsFilters(input),
          metrics: [],
          levelCounts: [],
          items: [],
        };

    return jsonOk({ logs });
  } catch (error) {
    if (error instanceof AuthError) {
      return mapApiError(error);
    }

    return jsonError(503, "DATABASE_UNAVAILABLE", "日志数据源暂时不可用");
  }
}

export async function GET(request: Request) {
  return withApiUser(request, (user) =>
    handleLogGet(request, {
      user,
    }),
  );
}

export async function POST(request: Request) {
  return handleLogPost(request);
}
