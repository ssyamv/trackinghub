export type TrackingHubEnvironment =
  | "dev"
  | "staging"
  | "prod"
  | "test"
  | "develop"
  | "production";

export type TrackingHubContext = Record<string, unknown>;
export type TrackingHubProperties = Record<string, unknown>;

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
};

const SDK_VERSION = "0.1.0";

function fallbackId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Math.random().toString(36).slice(2)}`;
}

export function createTrackingHubClient(
  options: TrackingHubClientOptions,
): TrackingHubClient {
  const fetcher = options.fetch ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const anonymousId = options.anonymousId ?? fallbackId("anon");
  const sessionId = options.sessionId ?? fallbackId("session");
  const deviceId = options.deviceId;

  return {
    async track(eventName, properties = {}, trackOptions = {}) {
      const context = {
        ...options.context,
        ...trackOptions.context,
      };

      const body = {
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

      return fetcher(options.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-trackinghub-write-key": options.writeKey,
        },
        body: JSON.stringify(body),
      });
    },
  };
}
