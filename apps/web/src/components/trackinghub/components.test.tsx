import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EmptyPageState } from "./empty-page-state";
import { MetricCard } from "./metric-card";
import { PageHeader } from "./page-header";
import { StatusBadge } from "./status-badge";

describe("TrackingHub components", () => {
  it("renders a page header with actions", () => {
    const html = renderToStaticMarkup(
      <PageHeader
        eyebrow="Projects"
        title="项目"
        description="管理内部产品、环境和 SDK 接入信息。"
        actions={<button type="button">新建项目</button>}
      />,
    );

    expect(html).toContain("Projects");
    expect(html).toContain("项目");
    expect(html).toContain("新建项目");
  });

  it("renders business status badges", () => {
    expect(
      renderToStaticMarkup(<StatusBadge tone="danger">Schema 不一致</StatusBadge>),
    ).toContain("Schema 不一致");
  });

  it("renders a metric card value and detail", () => {
    const html = renderToStaticMarkup(
      <MetricCard
        label="今日事件量"
        value="2.7m"
        detail="p95 写入延迟 1.8s"
        tone="purple"
      />,
    );

    expect(html).toContain("今日事件量");
    expect(html).toContain("2.7m");
    expect(html).toContain("p95 写入延迟 1.8s");
  });

  it("renders the shared empty page state", () => {
    const html = renderToStaticMarkup(
      <EmptyPageState
        badge="分析工作台"
        title="分析"
        description="查看产品指标、事件趋势、漏斗转化和留存表现。"
        actionLabel="创建分析视图"
        sections={["概览", "事件分析", "漏斗", "留存"]}
      />,
    );

    expect(html).toContain("分析工作台");
    expect(html).toContain("创建分析视图");
    expect(html).toContain("事件分析");
  });
});
