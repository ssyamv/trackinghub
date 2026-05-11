"use client";

import { useEffect, useMemo, useRef } from "react";

import type { AnalyticsTrendItem } from "@/lib/trackinghub/types";

import { mountCanvasChart } from "./echarts-canvas";

type HomeEventTrendChartProps = {
  items: AnalyticsTrendItem[];
  rangeLabel: string;
};

type TrendBucket = {
  bucket: string;
  eventCountValue: number;
};

function aggregateTrendBuckets(items: AnalyticsTrendItem[]) {
  const buckets = new Map<string, TrendBucket>();

  for (const item of items) {
    const bucket = buckets.get(item.bucket) ?? {
      bucket: item.bucket,
      eventCountValue: 0,
    };

    bucket.eventCountValue += item.eventCountValue;
    buckets.set(item.bucket, bucket);
  }

  return Array.from(buckets.values()).reverse();
}

function trendOption(chartData: TrendBucket[]) {
  return {
    animationDuration: 700,
    color: ["#2c84e0"],
    grid: { bottom: 38, left: 52, right: 24, top: 28 },
    series: [
      {
        areaStyle: { opacity: 0.16 },
        data: chartData.map((item) => item.eventCountValue),
        emphasis: { focus: "series" },
        lineStyle: { width: 4 },
        name: "事件发生数量",
        showSymbol: true,
        smooth: 0.32,
        symbolSize: 8,
        type: "line",
      },
    ],
    tooltip: {
      axisPointer: { type: "line" },
      confine: true,
      trigger: "axis",
    },
    xAxis: {
      axisLabel: { color: "#6f746b", fontFamily: "monospace", fontSize: 12 },
      axisLine: { lineStyle: { color: "#d7d9d0" } },
      axisTick: { show: false },
      boundaryGap: false,
      data: chartData.map((item) => item.bucket.slice(0, 5)),
      type: "category",
    },
    yAxis: {
      axisLabel: { color: "#6f746b", fontSize: 12 },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: "#e3e4dc" } },
      type: "value",
    },
  };
}

export function HomeEventTrendChart({
  items,
  rangeLabel,
}: HomeEventTrendChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const chartData = useMemo(() => aggregateTrendBuckets(items), [items]);
  const option = useMemo(() => trendOption(chartData), [chartData]);
  const hasMultipleBuckets = chartData.length > 1;

  useEffect(() => mountCanvasChart(ref, option), [option]);

  return (
    <div
      aria-label="首页事件发生数量趋势图"
      className="rounded-lg border border-border bg-muted/20 p-5"
      role="img"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">事件发生数量</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasMultipleBuckets
              ? `${rangeLabel}，${chartData.length} 个时间点，按日聚合全部事件发生次数。`
              : "当前只有 1 个时间点，更多 demo 数据进入后会形成趋势曲线。"}
          </p>
        </div>
        <div className="text-xs text-muted-foreground">ECharts Canvas</div>
      </div>
      <div ref={ref} className="mt-4 h-80 w-full" />
    </div>
  );
}
