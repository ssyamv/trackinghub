import { describe, expect, it } from "vitest";
import {
  acceptanceItems,
  analyticsFunnelSteps,
  analyticsMetricCards,
  analyticsTemplateItems,
  eventDictionaryItems,
  featuredEventDetail,
  governanceAcceptanceChecks,
  governanceSummaryCards,
  reportTaskItems,
  reportTemplateItems,
  projectEnvironmentItems,
  projectItems,
  projectSummaryCards,
  navItems,
  pageShells,
  reportItems,
  sdkKeyItems,
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

  it("keeps governance workbench data ready for event dictionary and acceptance views", () => {
    expect(governanceSummaryCards.map((item) => item.label)).toEqual([
      "治理事件",
      "待验收",
      "Schema 异常",
      "最近接收",
    ]);
    expect(eventDictionaryItems.map((item) => item.eventName)).toContain(
      "pay_button_click",
    );
    expect(eventDictionaryItems.every((item) => item.id.length > 0)).toBe(true);
    expect(featuredEventDetail.eventName).toBe("pay_button_click");
    expect(featuredEventDetail.requiredProperties.map((item) => item.name)).toEqual([
      "product_id",
      "price",
      "currency",
      "source_page",
    ]);
    expect(governanceAcceptanceChecks).toHaveLength(4);
    expect(governanceAcceptanceChecks.some((item) => item.tone === "danger")).toBe(
      true,
    );
  });

  it("keeps project management data ready for projects, environments, and SDK keys", () => {
    expect(projectSummaryCards.map((item) => item.label)).toEqual([
      "项目总数",
      "生产环境",
      "启用 SDK Key",
      "待处理接入",
    ]);
    expect(projectItems.map((item) => item.slug)).toContain("magic-frame");
    expect(projectEnvironmentItems.map((item) => item.name)).toContain("prod");
    expect(sdkKeyItems.some((item) => item.status === "启用")).toBe(true);
    expect(sdkKeyItems.every((item) => item.id.length > 0)).toBe(true);
  });

  it("keeps analytics templates and report tasks ready", () => {
    expect(analyticsMetricCards.map((item) => item.label)).toEqual([
      "活跃用户",
      "事件量",
      "漏斗转化",
      "D7 留存",
    ]);
    expect(analyticsTemplateItems.map((item) => item.title)).toEqual([
      "概览",
      "事件趋势",
      "漏斗",
      "留存",
    ]);
    expect(analyticsFunnelSteps.map((item) => item.eventName)).toContain(
      "pay_button_click",
    );
    expect(reportTemplateItems.map((item) => item.type)).toContain("异常解释");
    expect(reportTaskItems.some((item) => item.owner === "Codex")).toBe(true);
  });
});
