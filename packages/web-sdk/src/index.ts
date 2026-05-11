export type TrackingHubEnvironment =
  | "dev"
  | "staging"
  | "prod"
  | "test"
  | "develop"
  | "production";

export type TrackingHubContext = Record<string, unknown>;
export type TrackingHubProperties = Record<string, unknown>;
export type TrackingHubStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type TrackingHubQueueOptions = {
  storage?: TrackingHubStorage;
  storageKey?: string;
  maxAttempts?: number;
  maxQueueSize?: number;
  eventTtlMs?: number;
  retryDelaysMs?: number[];
};

export type TrackingHubFlushResult = {
  delivered: number;
  deferred: number;
  dropped: number;
};

export type TrackingHubClientOptions = {
  endpoint: string;
  projectId: string;
  environment: TrackingHubEnvironment;
  writeKey: string;
  fetch?: typeof fetch;
  now?: () => number;
  anonymousId?: string;
  sessionId?: string;
  deviceId?: string;
  userId?: string;
  appVersion?: string;
  channel?: string;
  campaign?: string;
  country?: string;
  context?: TrackingHubContext;
  queue?: TrackingHubQueueOptions;
};

export type TrackOptions = {
  userId?: string;
  anonymousId?: string;
  deviceId?: string;
  sessionId?: string;
  appVersion?: string;
  channel?: string;
  campaign?: string;
  country?: string;
  context?: TrackingHubContext;
};

export type TrackingHubClient = {
  track: (
    eventName: string,
    properties?: TrackingHubProperties,
    options?: TrackOptions,
  ) => Promise<Response>;
  flush: (options?: { force?: boolean }) => Promise<TrackingHubFlushResult>;
  pendingCount: () => Promise<number>;
};

const SDK_VERSION = "0.1.0";
const DEFAULT_STORAGE_KEY = "trackinghub:event-queue";
const DEFAULT_RETRY_DELAYS_MS = [30_000, 120_000, 600_000, 1_800_000];
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_MAX_QUEUE_SIZE = 1000;
const DEFAULT_EVENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type TrackingHubQueuedEvent = {
  id: string;
  endpoint: string;
  body: Record<string, unknown>;
  headers: Record<string, string>;
  createdAt: number;
  attempts: number;
  nextAttemptAt?: number;
};

function fallbackId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Math.random().toString(36).slice(2)}`;
}

function resolveStorage(options?: TrackingHubQueueOptions) {
  if (!options) {
    return undefined;
  }

  if (options?.storage) {
    return options.storage;
  }

  if (typeof globalThis === "object" && "localStorage" in globalThis) {
    return globalThis.localStorage;
  }

  return undefined;
}

function queueKey(options?: TrackingHubQueueOptions) {
  return options?.storageKey ?? DEFAULT_STORAGE_KEY;
}

function retryDelays(options?: TrackingHubQueueOptions) {
  return options?.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
}

function maxAttempts(options?: TrackingHubQueueOptions) {
  return options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
}

function maxQueueSize(options?: TrackingHubQueueOptions) {
  return options?.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE;
}

function eventTtlMs(options?: TrackingHubQueueOptions) {
  return options?.eventTtlMs ?? DEFAULT_EVENT_TTL_MS;
}

function retryDelayForAttempt(options: TrackingHubQueueOptions | undefined, attempts: number) {
  const delays = retryDelays(options);
  if (delays.length === 0) {
    return 0;
  }

  return delays[Math.min(attempts - 1, delays.length - 1)] ?? 0;
}

function readQueue(
  storage: TrackingHubStorage | undefined,
  storageKey: string,
): TrackingHubQueuedEvent[] {
  if (!storage) {
    return [];
  }

  const raw = storage.getItem(storageKey);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isQueuedEvent);
  } catch {
    return [];
  }
}

function writeQueue(
  storage: TrackingHubStorage | undefined,
  storageKey: string,
  events: TrackingHubQueuedEvent[],
) {
  if (!storage) {
    return;
  }

  if (events.length === 0) {
    storage.removeItem(storageKey);
    return;
  }

  storage.setItem(storageKey, JSON.stringify(events));
}

function isQueuedEvent(input: unknown): input is TrackingHubQueuedEvent {
  if (typeof input !== "object" || input === null) {
    return false;
  }

  const item = input as TrackingHubQueuedEvent;
  return (
    typeof item.id === "string" &&
    typeof item.endpoint === "string" &&
    typeof item.createdAt === "number" &&
    typeof item.attempts === "number" &&
    typeof item.body === "object" &&
    item.body !== null &&
    typeof item.headers === "object" &&
    item.headers !== null
  );
}

function trimQueue(
  events: TrackingHubQueuedEvent[],
  now: number,
  queueOptions: TrackingHubQueueOptions | undefined,
) {
  const liveEvents = events.filter(
    (event) => now - event.createdAt <= eventTtlMs(queueOptions),
  );
  const limit = maxQueueSize(queueOptions);

  if (liveEvents.length <= limit) {
    return liveEvents;
  }

  return liveEvents.slice(liveEvents.length - limit);
}

async function postEvent(
  fetcher: typeof fetch,
  event: TrackingHubQueuedEvent,
) {
  const response = await fetcher(event.endpoint, {
    method: "POST",
    headers: event.headers,
    body: JSON.stringify(event.body),
  });

  if (!response.ok) {
    throw response;
  }

  return response;
}

function isRetryableError(error: unknown) {
  if (error instanceof Response) {
    return (
      error.status === 408 ||
      error.status === 425 ||
      error.status === 429 ||
      error.status >= 500
    );
  }

  return true;
}

function queuedResponse() {
  return new Response(JSON.stringify({ queued: true }), { status: 202 });
}

export function createTrackingHubClient(
  options: TrackingHubClientOptions,
): TrackingHubClient {
  const fetcher = options.fetch ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const anonymousId = options.anonymousId ?? fallbackId("anon");
  const sessionId = options.sessionId ?? fallbackId("session");
  const deviceId = options.deviceId;
  const storage = resolveStorage(options.queue);
  const storageKey = queueKey(options.queue);

  async function flush({ force = true }: { force?: boolean } = {}) {
    let delivered = 0;
    let deferred = 0;
    let dropped = 0;
    const pending = readQueue(storage, storageKey);
    const remaining: TrackingHubQueuedEvent[] = [];

    for (const queuedEvent of pending) {
      let event = queuedEvent;

      if (
        now() - event.createdAt > eventTtlMs(options.queue) ||
        event.attempts >= maxAttempts(options.queue)
      ) {
        dropped += 1;
        continue;
      }

      if (!force && event.nextAttemptAt && event.nextAttemptAt > now()) {
        deferred += 1;
        remaining.push(event);
        continue;
      }

      let settled = false;
      while (event.attempts < maxAttempts(options.queue) && !settled) {
        try {
          await postEvent(fetcher, event);
          delivered += 1;
          settled = true;
        } catch (error) {
          if (!isRetryableError(error)) {
            dropped += 1;
            settled = true;
            break;
          }

          const attempts = event.attempts + 1;
          if (attempts >= maxAttempts(options.queue)) {
            dropped += 1;
            settled = true;
            break;
          }

          const delay = retryDelayForAttempt(options.queue, attempts);
          event = {
            ...event,
            attempts,
            nextAttemptAt: now() + delay,
          };

          if (delay > 0) {
            deferred += 1;
            remaining.push(event);
            settled = true;
          }
        }
      }
    }

    writeQueue(storage, storageKey, trimQueue(remaining, now(), options.queue));

    return { delivered, deferred, dropped };
  }

  return {
    flush,
    async pendingCount() {
      return readQueue(storage, storageKey).length;
    },
    async track(eventName, properties = {}, trackOptions = {}) {
      const context = {
        ...options.context,
        ...trackOptions.context,
      };

      const body: Record<string, unknown> = {
        project_id: options.projectId,
        environment: options.environment,
        source: "web",
        event_name: eventName,
        user_id: trackOptions.userId ?? options.userId,
        anonymous_id: trackOptions.anonymousId ?? anonymousId,
        device_id: trackOptions.deviceId ?? deviceId,
        session_id: trackOptions.sessionId ?? sessionId,
        timestamp: now(),
        app_version: trackOptions.appVersion ?? options.appVersion,
        sdk_version: SDK_VERSION,
        channel: trackOptions.channel ?? options.channel,
        campaign: trackOptions.campaign ?? options.campaign,
        country: trackOptions.country ?? options.country,
        properties,
        context,
      };

      const headers = {
        "content-type": "application/json",
        "x-trackinghub-write-key": options.writeKey,
      };

      if (storage) {
        const queue = readQueue(storage, storageKey);
        queue.push({
          id: fallbackId("event"),
          endpoint: options.endpoint,
          body,
          headers,
          createdAt: now(),
          attempts: 0,
        });
        writeQueue(
          storage,
          storageKey,
          trimQueue(queue, now(), options.queue),
        );
        await flush({ force: false });
        return queuedResponse();
      }

      return fetcher(options.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    },
  };
}
