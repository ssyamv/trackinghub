/* @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import type { AnalyticsTrendItem } from "@/lib/trackinghub/types";
import { AnalyticsEventTable } from "./analytics-event-table";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

function trendItems(count: number): AnalyticsTrendItem[] {
  return Array.from({ length: count }, (_, index) => ({
    bucket: `05-${String(index + 1).padStart(2, "0")} 00:00`,
    eventName: `event_${index + 1}`,
    environment: "prod",
    eventCount: String(index + 1),
    eventCountValue: index + 1,
    source: "web",
    uniqueUsers: String(index + 1),
    uniqueUsersValue: index + 1,
  }));
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("AnalyticsEventTable", () => {
  it("switches pages locally without navigating the analytics page", async () => {
    window.history.pushState(
      {},
      "",
      "/analytics?range=7d&granularity=day&event_page=2",
    );

    const container = document.createElement("div");
    const root = createRoot(container);
    document.body.append(container);

    await act(async () => {
      root.render(<AnalyticsEventTable items={trendItems(12)} />);
    });

    expect(document.body.textContent).toContain("当前显示第 1 - 10 条，共 12 条");
    expect(document.body.textContent).toContain("event_10");
    expect(document.body.textContent).not.toContain("event_11");
    expect(document.querySelector('a[href*="/analytics"]')).toBeNull();

    const nextButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "下一页",
    );
    expect(nextButton).toBeTruthy();

    await act(async () => {
      nextButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(`${window.location.pathname}${window.location.search}`).toBe(
      "/analytics?range=7d&granularity=day&event_page=2",
    );
    expect(document.body.textContent).toContain("当前显示第 11 - 12 条，共 12 条");
    expect(document.body.textContent).toContain("event_11");
    expect(document.body.textContent).toContain("event_12");
    expect(document.body.textContent).not.toContain("event_10");
  });
});
