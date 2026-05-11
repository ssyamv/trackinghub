/* @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnalyticsWorkbench } from "./analytics-workbench";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("AnalyticsWorkbench client refresh", () => {
  it("refreshes filters through the analytics API without page links", async () => {
    window.history.pushState({}, "", "/analytics?range=30d&granularity=hour");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            analytics: {
              source: "clickhouse",
              metrics: [
                {
                  detail: "局部刷新后的事件量",
                  label: "事件量",
                  tone: "blue",
                  value: "999",
                },
              ],
              trendItems: [
                {
                  bucket: "05-11 00:00",
                  environment: "prod",
                  eventCount: "999",
                  eventCountValue: 999,
                  eventName: "homepage_view",
                  source: "web",
                  uniqueUsers: "88",
                  uniqueUsersValue: 88,
                },
              ],
              funnelSteps: [],
              dimensionGroups: [
                {
                  key: "app_version",
                  label: "App 版本",
                  items: [
                    {
                      eventCount: "624",
                      eventCountValue: 624,
                      share: "62.4%",
                      shareValue: 0.624,
                      uniqueUsers: "320",
                      uniqueUsersValue: 320,
                      value: "1.5.1",
                    },
                  ],
                },
              ],
              propertyKeyCount: 0,
              propertyItems: [],
            },
            filters: {
              dateFrom: "2026-05-01",
              dateTo: "2026-05-11",
              funnelSteps: [],
              environment: "prod",
              granularity: "hour",
              range: "30d",
            },
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        },
      ),
    );

    const container = document.createElement("div");
    const root = createRoot(container);
    document.body.append(container);

    await act(async () => {
      root.render(
        <AnalyticsWorkbench
          filters={{
            dateFrom: "2026-05-01",
            dateTo: "2026-05-11",
            funnelSteps: [],
            granularity: "hour",
            range: "30d",
          }}
          funnelSteps={[]}
          dimensionGroups={[
            {
              key: "country",
              label: "用户地区",
              items: [
                {
                  eventCount: "480",
                  eventCountValue: 480,
                  share: "48.0%",
                  shareValue: 0.48,
                  uniqueUsers: "240",
                  uniqueUsersValue: 240,
                  value: "US",
                },
              ],
            },
          ]}
          metrics={[
            {
              detail: "初始事件量",
              label: "事件量",
              tone: "blue",
              value: "120",
            },
          ]}
          propertyKeyCount={0}
          propertyItems={[]}
          source="clickhouse"
          trendItems={[]}
        />,
      );
    });

    expect(document.querySelector('a[href^="/analytics?"]')).toBeNull();
    expect(document.body.textContent).not.toContain("产品健康");
    expect(document.body.textContent).not.toContain("实时排障");
    expect(document.body.textContent).not.toContain("核心漏斗");
    expect(document.body.textContent).not.toContain("日报口径");
    expect(document.body.textContent).toContain("自定义");
    expect(document.body.textContent).toContain("用户分布");
    expect(document.body.textContent).toContain("用户地区");
    expect(document.body.textContent).toContain("US");
    expect(document.body.textContent).toContain("48.0%");

    const environmentSelect = document.querySelector(
      'select[name="environment"]',
    ) as HTMLSelectElement | null;
    expect(environmentSelect).toBeTruthy();
    environmentSelect!.value = "prod";

    await act(async () => {
      environmentSelect?.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const dateFromInput = document.querySelector(
      'input[name="date_from"]',
    ) as HTMLInputElement | null;
    const dateToInput = document.querySelector(
      'input[name="date_to"]',
    ) as HTMLInputElement | null;
    expect(dateFromInput).toBeTruthy();
    expect(dateToInput).toBeTruthy();
    dateFromInput!.value = "2026-05-01";
    dateToInput!.value = "2026-05-11";

    await act(async () => {
      dateFromInput?.dispatchEvent(new Event("change", { bubbles: true }));
      dateToInput?.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const queryButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("查询"),
    );
    expect(queryButton).toBeTruthy();

    await act(async () => {
      queryButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analytics?environment=prod&range=30d&granularity=hour&date_from=2026-05-01&date_to=2026-05-11",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(`${window.location.pathname}${window.location.search}`).toBe(
      "/analytics?environment=prod&range=30d&granularity=hour&date_from=2026-05-01&date_to=2026-05-11",
    );
    expect(document.body.textContent).toContain("999");
    expect(document.body.textContent).toContain("App 版本");
    expect(document.body.textContent).toContain("1.5.1");
    expect(document.body.textContent).toContain("62.4%");
    expect(document.body.textContent).not.toContain("局部刷新失败");
  });
});
