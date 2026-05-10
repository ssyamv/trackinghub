import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";
import type { AcceptanceItem } from "@/lib/trackinghub/sample-data";
import { acceptanceItems, reportItems } from "@/lib/trackinghub/sample-data";
import { AcceptanceTable } from "./acceptance-table";
import { CodexSummaryCard } from "./codex-summary-card";
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
    expect(html).toContain("border-b border-border");
  });

  it("renders business status badges", () => {
    const html = renderToStaticMarkup(
      <StatusBadge tone="danger">Schema 不一致</StatusBadge>,
    );

    expect(html).toContain("Schema 不一致");
    expect(html).toContain('data-slot="badge"');
    expect(html).toContain("bg-destructive");
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
    expect(html).toContain('data-slot="card"');
    expect(html).toContain("bg-chart-4/20");
  });

  it("renders the shared empty page state", () => {
    const html = renderToStaticMarkup(
      <EmptyPageState
        badge="分析工作台"
        title="分析"
        description="查看产品指标、事件趋势、漏斗转化和留存表现。"
        action={<Button type="button">创建分析视图</Button>}
        sections={["概览", "事件分析", "漏斗", "留存"]}
      />,
    );

    expect(html).toContain("分析工作台");
    expect(html).toContain("创建分析视图");
    expect(html).toContain("事件分析");
    expect(html).toContain('data-slot="card"');
    expect(html.split("rounded-lg border border-border bg-muted/40").length - 1).toBe(
      4,
    );
  });
});

describe("TrackingHub dashboard components", () => {
  it("renders acceptance rows", () => {
    const html = renderToStaticMarkup(
      <AcceptanceTable items={acceptanceItems} />,
    );

    expect(html).toContain("pay_button_click");
    expect(html).toContain("Flutter 缺少国家字段");
    expect(html).toContain("移动端待验收埋点列表");
    expect(html).toContain("md:hidden");
  });

  it("allows long event names to wrap without hiding environment or status", () => {
    const longEventItems: AcceptanceItem[] = [
      {
        event:
          "subscription_checkout_payment_button_click_from_mobile_campaign_detail_sheet",
        project: "Magic Frame",
        source: "Flutter",
        environment: "生产",
        status: "Schema 不一致",
        tone: "danger",
      },
    ];

    const html = renderToStaticMarkup(
      <AcceptanceTable items={longEventItems} />,
    );

    expect(html).toContain("whitespace-normal");
    expect(html).toContain(
      "subscription_checkout_payment_button_click_from_mobile_campaign_detail_sheet",
    );
    expect(html).toContain("生产");
    expect(html).toContain("Schema 不一致");
  });

  it("renders Codex summary report items", () => {
    const html = renderToStaticMarkup(<CodexSummaryCard items={reportItems} />);

    expect(html).toContain("分析摘要");
    expect(html).toContain("spring_sale 活动转化率提升 12.4%");
  });
});
