"use client";

import { useEffect, useMemo, useRef } from "react";

import type {
  AnalyticsFunnelStep,
  AnalyticsTrendItem,
} from "@/lib/trackinghub/types";

import { mountCanvasChart } from "./echarts-canvas";

type TrendBucket = {
  bucket: string;
  eventCountValue: number;
  uniqueUsersValue: number;
};

function aggregateTrendBuckets(items: AnalyticsTrendItem[]) {
  const buckets = new Map<string, TrendBucket>();

  for (const item of items) {
    const bucket = buckets.get(item.bucket) ?? {
      bucket: item.bucket,
      eventCountValue: 0,
      uniqueUsersValue: 0,
    };

    bucket.eventCountValue += item.eventCountValue;
    bucket.uniqueUsersValue += item.uniqueUsersValue;
    buckets.set(item.bucket, bucket);
  }

  return Array.from(buckets.values()).reverse();
}

function trendOption(chartData: TrendBucket[]) {
  const labels = chartData.map((item) => item.bucket.slice(0, 8));

  return {
    animationDuration: 650,
    color: ["#2c84e0", "#2c8c66"],
    grid: { bottom: 36, left: 48, right: 34, top: 30 },
    legend: {
      icon: "roundRect",
      itemHeight: 8,
      itemWidth: 18,
      right: 4,
      textStyle: { color: "#6c6e63" },
      top: 0,
    },
    series: [
      {
        barMaxWidth: 32,
        data: chartData.map((item) => item.eventCountValue),
        emphasis: { focus: "series" },
        name: "事件量",
        type: "bar",
      },
      {
        areaStyle: { opacity: 0.14 },
        data: chartData.map((item) => item.uniqueUsersValue),
        lineStyle: { width: 3 },
        name: "唯一用户",
        smooth: 0.28,
        symbolSize: 7,
        type: "line",
      },
    ],
    tooltip: {
      axisPointer: { type: "shadow" },
      confine: true,
      trigger: "axis",
    },
    xAxis: {
      axisLabel: { color: "#6c6e63", fontFamily: "monospace", fontSize: 11 },
      axisLine: { lineStyle: { color: "#d7d9d0" } },
      axisTick: { show: false },
      data: labels,
      type: "category",
    },
    yAxis: {
      axisLabel: { color: "#6c6e63", fontSize: 11 },
      splitLine: { lineStyle: { color: "#e2e4db" } },
      type: "value",
    },
  };
}

function funnelOption(steps: AnalyticsFunnelStep[]) {
  return {
    animationDuration: 650,
    color: ["#2c84e0"],
    grid: { bottom: 22, left: 112, right: 26, top: 16 },
    series: [
      {
        barMaxWidth: 22,
        data: steps.map((step) => step.usersValue),
        label: {
          color: "#23251d",
          formatter: "{c}",
          position: "right",
        },
        type: "bar",
      },
    ],
    tooltip: {
      confine: true,
      formatter(params: { dataIndex: number; value: number }) {
        const step = steps[params.dataIndex];
        return `${step.eventName}<br/>用户数：${params.value}<br/>总转化：${step.conversion}`;
      },
    },
    xAxis: {
      axisLabel: { color: "#6c6e63", fontSize: 11 },
      splitLine: { lineStyle: { color: "#e2e4db" } },
      type: "value",
    },
    yAxis: {
      axisLabel: {
        color: "#6c6e63",
        fontFamily: "monospace",
        fontSize: 11,
        overflow: "truncate",
        width: 100,
      },
      axisLine: { show: false },
      axisTick: { show: false },
      data: steps.map((step) => `${step.step}. ${step.eventName}`),
      inverse: true,
      type: "category",
    },
  };
}

export function AnalyticsTrendChart({
  items,
}: {
  items: AnalyticsTrendItem[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartData = useMemo(() => aggregateTrendBuckets(items), [items]);
  const option = useMemo(() => trendOption(chartData), [chartData]);

  useEffect(() => mountCanvasChart(ref, option), [option]);

  return (
    <div
      aria-label="事件趋势图"
      className="rounded-lg border border-border bg-muted/20 p-4"
      role="img"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">事件量与唯一用户</div>
          <p className="mt-1 text-xs text-muted-foreground">
            按当前筛选口径聚合，适合快速定位增长、回落和异常波动。
          </p>
        </div>
        <div className="text-xs text-muted-foreground">ECharts Canvas</div>
      </div>
      <div ref={ref} className="mt-4 h-80 w-full" />
    </div>
  );
}

export function AnalyticsFunnelChart({
  steps,
}: {
  steps: AnalyticsFunnelStep[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const option = useMemo(() => funnelOption(steps), [steps]);

  useEffect(() => mountCanvasChart(ref, option), [option]);

  return (
    <div
      aria-label="漏斗转化图"
      className="rounded-lg border border-border bg-muted/20 p-4"
      role="img"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">漏斗转化</div>
          <p className="mt-1 text-xs text-muted-foreground">
            按用户首达步骤计算，突出每一步的相对规模和掉点。
          </p>
        </div>
        <div className="text-xs text-muted-foreground">ECharts Canvas</div>
      </div>
      <div ref={ref} className="mt-4 h-72 w-full" />
    </div>
  );
}
