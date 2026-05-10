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
      },
    });
  });
});
