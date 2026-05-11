import type { RefObject } from "react";

type EChartsOption = Record<string, unknown>;

type EChartsInstance = {
  dispose: () => void;
  resize: () => void;
  setOption: (option: EChartsOption, options?: { notMerge?: boolean }) => void;
};

type EChartsApi = {
  init: (
    element: HTMLElement,
    theme?: string | null,
    options?: { renderer?: "canvas" | "svg" },
  ) => EChartsInstance;
};

declare global {
  interface Window {
    echarts?: EChartsApi;
    trackingHubEChartsPromise?: Promise<EChartsApi>;
  }
}

const ECHARTS_CDN =
  "https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js";

export async function loadECharts() {
  if (window.echarts) {
    return window.echarts;
  }

  window.trackingHubEChartsPromise ??= new Promise<EChartsApi>(
    (resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${ECHARTS_CDN}"]`,
      );

      if (existing) {
        existing.addEventListener("load", () => {
          if (window.echarts) {
            resolve(window.echarts);
            return;
          }

          reject(new Error("ECharts 加载失败"));
        });
        existing.addEventListener("error", () => reject(new Error("ECharts 加载失败")));
        return;
      }

      const script = document.createElement("script");
      script.async = true;
      script.src = ECHARTS_CDN;
      script.onload = () => {
        if (window.echarts) {
          resolve(window.echarts);
          return;
        }

        reject(new Error("ECharts 加载失败"));
      };
      script.onerror = () => reject(new Error("ECharts 加载失败"));
      document.head.appendChild(script);
    },
  );

  return window.trackingHubEChartsPromise;
}

export function mountCanvasChart(
  ref: RefObject<HTMLDivElement | null>,
  option: EChartsOption,
) {
  let cancelled = false;
  let chart: EChartsInstance | null = null;
  let observer: ResizeObserver | null = null;

  loadECharts()
    .then((echarts) => {
      if (cancelled || !ref.current) {
        return;
      }

      chart = echarts.init(ref.current, null, { renderer: "canvas" });
      chart.setOption(option, { notMerge: true });
      observer = new ResizeObserver(() => chart?.resize());
      observer.observe(ref.current);
    })
    .catch(() => undefined);

  return () => {
    cancelled = true;
    observer?.disconnect();
    chart?.dispose();
  };
}
