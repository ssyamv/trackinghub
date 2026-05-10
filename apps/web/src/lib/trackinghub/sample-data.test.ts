import { describe, expect, it } from "vitest";
import {
  acceptanceItems,
  navItems,
  pageShells,
  reportItems,
  statusCards,
  timelineItems,
} from "./sample-data";

describe("TrackingHub sample data", () => {
  it("defines the main admin navigation in product order", () => {
    expect(navItems.map((item) => item.href)).toEqual([
      "/",
      "/projects",
      "/governance",
      "/analytics",
      "/reports",
      "/settings",
    ]);
    expect(navItems.map((item) => item.label)).toEqual([
      "首页",
      "项目",
      "埋点治理",
      "分析",
      "报告",
      "设置",
    ]);
  });

  it("has page shells for every non-home navigation route", () => {
    expect(Object.keys(pageShells).sort()).toEqual([
      "analytics",
      "governance",
      "projects",
      "reports",
      "settings",
    ]);
  });

  it("keeps the home dashboard data populated", () => {
    expect(statusCards).toHaveLength(4);
    expect(acceptanceItems).toHaveLength(3);
    expect(reportItems.length).toBeGreaterThan(0);
    expect(timelineItems.map((item) => item.label)).toEqual([
      "需求",
      "定义",
      "接入",
      "验收",
    ]);
  });
});
