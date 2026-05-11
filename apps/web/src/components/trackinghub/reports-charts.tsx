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
  return {
    animationDuration: 600,
    color: ["#2563eb", "#15803d"],
    grid: { bottom: 34, left: 44, right: 26, top: 20 },
    series: [
      {
        barMaxWidth: 26,
        data: chartData.map((item) => item.eventCountValue),
        name: "事件量",
        type: "bar",
      },
      {
        areaStyle: { opacity: 0.12 },
        data: chartData.map((item) => item.uniqueUsersValue),
        lineStyle: { width: 3 },
        name: "唯一用户",
        smooth: 0.25,
        symbolSize: 6,
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
      data: chartData.map((item) => item.bucket.slice(0, 8)),
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
    animationDuration: 600,
    color: ["#2563eb"],
    grid: { bottom: 18, left: 118, right: 30, top: 12 },
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
        width: 106,
      },
      axisLine: { show: false },
      axisTick: { show: false },
      data: steps.map((step) => `${step.step}. ${step.eventName}`),
      inverse: true,
      type: "category",
    },
  };
}

export function ReportsTrendChart({
  items,
}: {
  items: AnalyticsTrendItem[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartData = useMemo(() => aggregateTrendBuckets(items), [items]);
  const option = useMemo(() => trendOption(chartData), [chartData]);

  useEffect(() => mountCanvasChart(ref, option), [option]);

  return (
    <div aria-label="报告事件趋势图" className="h-72 w-full" role="img">
      <div ref={ref} className="h-full w-full" />
    </div>
  );
}

export function ReportsFunnelChart({
  steps,
}: {
  steps: AnalyticsFunnelStep[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const option = useMemo(() => funnelOption(steps), [steps]);

  useEffect(() => mountCanvasChart(ref, option), [option]);

  return (
    <div aria-label="报告漏斗转化图" className="h-64 w-full" role="img">
      <div ref={ref} className="h-full w-full" />
    </div>
  );
}
