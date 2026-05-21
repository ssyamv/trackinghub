import { describe, expect, it } from "vitest";

import { createTrackingHubClient } from "./index";

describe("createTrackingHubClient", () => {
  it("sends a shared Web event envelope to the ingestion endpoint", async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init: init ?? {} });
      return new Response(JSON.stringify({ accepted: true }), { status: 202 });
    };

    const client = createTrackingHubClient({
      endpoint: "https://tracking.example.com/api/events",
      projectId: "project_x",
      environment: "prod",
      writeKey: "write_key",
      fetch: fetcher,
      now: () => 1710000000000,
      anonymousId: "anon_123",
      sessionId: "session_789",
      context: {
        locale: "en-US",
        timezone: "Asia/Shanghai",
        os_name: "iOS",
        os_version: "18.4",
        device_model: "iPhone16,2",
      },
    });

    await client.track("pay_button_click", { product_id: "p_123" });

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("https://tracking.example.com/api/events");
    expect(requests[0].init.method).toBe("POST");
    expect(requests[0].init.headers).toEqual({
      "content-type": "application/json",
      "x-trackinghub-write-key": "write_key",
    });
    expect(JSON.parse(String(requests[0].init.body))).toMatchObject({
      project_id: "project_x",
      environment: "prod",
      source: "web",
      event_name: "pay_button_click",
      anonymous_id: "anon_123",
      session_id: "session_789",
      timestamp: 1710000000000,
      sdk_version: "0.1.0",
      properties: { product_id: "p_123" },
      context: {
        locale: "en-US",
        timezone: "Asia/Shanghai",
        os_name: "iOS",
        os_version: "18.4",
        device_model: "iPhone16,2",
      },
    });
  });

  it("sends SDK logs to the logs endpoint", async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init: init ?? {} });
      return new Response(JSON.stringify({ accepted: true }), { status: 202 });
    };

    const client = createTrackingHubClient({
      endpoint: "https://tracking.example.com/api/events",
      logsEndpoint: "https://tracking.example.com/api/logs",
      projectId: "project_x",
      environment: "prod",
      writeKey: "write_key",
      fetch: fetcher,
      now: () => 1710000000000,
      anonymousId: "anon_123",
      sessionId: "session_789",
      context: { locale: "en-US" },
    });

    await client.log("error", "Checkout failed", {
      logger: "checkout",
      attributes: { order_id: "order_123" },
      error: new Error("payment timeout"),
      traceId: "trace_123",
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("https://tracking.example.com/api/logs");
    expect(requests[0].init.method).toBe("POST");
    expect(requests[0].init.headers).toEqual({
      "content-type": "application/json",
      "x-trackinghub-write-key": "write_key",
    });
    expect(JSON.parse(String(requests[0].init.body))).toMatchObject({
      project_id: "project_x",
      environment: "prod",
      source: "web",
      level: "error",
      message: "Checkout failed",
      logger: "checkout",
      anonymous_id: "anon_123",
      session_id: "session_789",
      timestamp: 1710000000000,
      sdk_version: "0.1.0",
      trace_id: "trace_123",
      error_name: "Error",
      error_message: "payment timeout",
      attributes: { order_id: "order_123" },
      context: { locale: "en-US" },
    });
  });

  it("infers the logs endpoint from the events endpoint", async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const client = createTrackingHubClient({
      endpoint: "https://tracking.example.com/api/events",
      projectId: "project_x",
      environment: "prod",
      writeKey: "write_key",
      fetch: async (url, init) => {
        requests.push({ url: String(url), init: init ?? {} });
        return new Response(JSON.stringify({ accepted: true }), { status: 202 });
      },
    });

    await client.log("info", "ready");

    expect(requests[0].url).toBe("https://tracking.example.com/api/logs");
  });

  it("keeps direct delivery mode when queue options are omitted", async () => {
    const storage = createMemoryStorage();
    const previousLocalStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: storage,
    });
    const client = createTrackingHubClient({
      endpoint: "https://tracking.example.com/api/events",
      projectId: "project_x",
      environment: "prod",
      writeKey: "write_key",
      fetch: async () => {
        throw new TypeError("offline");
      },
    });

    try {
      await expect(client.track("frame_enter")).rejects.toThrow("offline");
      expect(storage.getItem("trackinghub:event-queue")).toBeNull();
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: previousLocalStorage,
      });
    }
  });

  it("queues transient failures and flushes them after the network recovers", async () => {
    const storage = createMemoryStorage();
    const requests: Array<Record<string, unknown>> = [];
    let online = false;
    const fetcher = async (_url: string | URL | Request, init?: RequestInit) => {
      if (!online) {
        throw new TypeError("Failed to fetch");
      }
      requests.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ accepted: true }), { status: 202 });
    };
    const client = createTrackingHubClient({
      endpoint: "https://tracking.example.com/api/events",
      projectId: "project_x",
      environment: "prod",
      writeKey: "write_key",
      fetch: fetcher,
      now: () => 1710000000000,
      queue: {
        storage,
        retryDelaysMs: [30_000],
      },
    });

    await client.track("frame_enter", { frame_id: "1" });

    expect(requests).toHaveLength(0);
    expect(await client.pendingCount()).toBe(1);

    online = true;
    const result = await client.flush();

    expect(result.delivered).toBe(1);
    expect(await client.pendingCount()).toBe(0);
    expect(requests[0].event_name).toBe("frame_enter");
  });

  it("retries retryable server failures without leaving delivered events queued", async () => {
    let attempts = 0;
    const client = createTrackingHubClient({
      endpoint: "https://tracking.example.com/api/events",
      projectId: "project_x",
      environment: "prod",
      writeKey: "write_key",
      fetch: async () => {
        attempts += 1;
        if (attempts === 1) {
          return new Response(JSON.stringify({ accepted: false }), { status: 503 });
        }
        return new Response(JSON.stringify({ accepted: true }), { status: 202 });
      },
      queue: {
        storage: createMemoryStorage(),
        retryDelaysMs: [0],
        maxAttempts: 3,
      },
    });

    await client.track("frame_enter");

    expect(attempts).toBe(2);
    expect(await client.pendingCount()).toBe(0);
  });

  it("drops non-retryable write key failures from the queue", async () => {
    let attempts = 0;
    const client = createTrackingHubClient({
      endpoint: "https://tracking.example.com/api/events",
      projectId: "project_x",
      environment: "prod",
      writeKey: "bad_write_key",
      fetch: async () => {
        attempts += 1;
        return new Response(JSON.stringify({ accepted: false }), { status: 401 });
      },
      queue: {
        storage: createMemoryStorage(),
      },
    });

    await client.track("frame_enter");

    expect(attempts).toBe(1);
    expect(await client.pendingCount()).toBe(0);
  });

  it("restores queued events from browser storage after client recreation", async () => {
    const storage = createMemoryStorage();
    const firstClient = createTrackingHubClient({
      endpoint: "https://tracking.example.com/api/events",
      projectId: "project_x",
      environment: "prod",
      writeKey: "write_key",
      fetch: async () => {
        throw new TypeError("offline");
      },
      queue: {
        storage,
      },
    });

    await firstClient.track("frame_enter");
    expect(await firstClient.pendingCount()).toBe(1);

    const requests: Array<Record<string, unknown>> = [];
    const restoredClient = createTrackingHubClient({
      endpoint: "https://tracking.example.com/api/events",
      projectId: "project_x",
      environment: "prod",
      writeKey: "write_key",
      fetch: async (_url, init) => {
        requests.push(JSON.parse(String(init?.body)));
        return new Response(JSON.stringify({ accepted: true }), { status: 202 });
      },
      queue: {
        storage,
      },
    });

    const result = await restoredClient.flush();

    expect(result.delivered).toBe(1);
    expect(requests[0].event_name).toBe("frame_enter");
    expect(await restoredClient.pendingCount()).toBe(0);
  });
});

function createMemoryStorage(): Storage {
  const data = new Map<string, string>();

  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
  };
}
