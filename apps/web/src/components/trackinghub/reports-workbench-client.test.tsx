/* @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ReportPreviewData } from "@/lib/reports/report-preview";

import { ReportsWorkbench } from "./reports-workbench";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

class ResizeObserverStub {
  constructor(callback: ResizeObserverCallback) {
    void callback;
  }

  observe() {}
  disconnect() {}
  unobserve() {}
}

function previewFixture(
  overrides: Partial<ReportPreviewData> = {},
): ReportPreviewData {
  return {
    source: "clickhouse",
    rangeLabel: "最近 7 天",
    filters: {
      funnelSteps: ["product_detail_view", "pay_button_click"],
      granularity: "day",
      projectId: "project_a",
      range: "7d",
      ...overrides.filters,
    },
    dataHealth: {
      detail: "当前筛选范围已连接真实数据，未发现验证异常。",
      label: "可用于报告",
      tone: "success",
    },
    executiveSummary: ["最近 7 天内，事件量 120，活跃用户 88，异常占比 0%。"],
    insightCards: [],
    metrics: [
      {
        detail: "最近 7 天接收事件",
        label: "事件量",
        tone: "blue",
        value: "120",
      },
    ],
    trendChartItems: [],
    trendItems: [],
    funnelSteps: [],
    funnelDropoff: null,
    retentionItems: [],
    retentionSummary: "当前范围暂无留存同期群数据。",
    ...overrides,
  };
}

beforeEach(() => {
  window.history.pushState({}, "", "/reports?project_id=project_a");
  window.echarts = {
    init: () => ({
      dispose: vi.fn(),
      resize: vi.fn(),
      setOption: vi.fn(),
    }),
  };
  window.ResizeObserver = ResizeObserverStub;
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
  window.echarts = undefined;
  window.trackingHubEChartsPromise = undefined;
});

describe("ReportsWorkbench client refresh", () => {
  it("refreshes report filters through the preview API without page links", async () => {
    const nextPreview = previewFixture({
      rangeLabel: "最近 30 天",
      filters: {
        environment: "prod",
        funnelSteps: ["product_detail_view", "pay_button_click"],
        granularity: "hour",
        projectId: "project_a",
        range: "30d",
      },
      metrics: [
        {
          detail: "局部刷新后的事件量",
          label: "事件量",
          tone: "blue",
          value: "999",
        },
      ],
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            dailyDraft: null,
            preview: nextPreview,
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
      root.render(<ReportsWorkbench preview={previewFixture()} />);
    });

    expect(document.querySelector('a[href^="/reports"]')).toBeNull();
    expect(document.querySelector('form[action="/reports"]')).toBeNull();

    const environmentSelect = document.querySelector(
      'select[name="environment"]',
    ) as HTMLSelectElement | null;
    const rangeSelect = document.querySelector(
      'select[name="range"]',
    ) as HTMLSelectElement | null;
    const granularitySelect = document.querySelector(
      'select[name="granularity"]',
    ) as HTMLSelectElement | null;
    expect(environmentSelect).toBeTruthy();
    expect(rangeSelect).toBeTruthy();
    expect(granularitySelect).toBeTruthy();
    environmentSelect!.value = "prod";
    rangeSelect!.value = "30d";
    granularitySelect!.value = "hour";

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
      "/api/reports/preview?project_id=project_a&funnel_steps=product_detail_view%2Cpay_button_click&environment=prod&range=30d&granularity=hour",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(`${window.location.pathname}${window.location.search}`).toBe(
      "/reports?project_id=project_a&environment=prod&range=30d&granularity=hour&funnel_steps=product_detail_view%2Cpay_button_click",
    );
    expect(document.body.textContent).toContain("999");
    expect(document.body.textContent).not.toContain("局部刷新失败");
  });
});
