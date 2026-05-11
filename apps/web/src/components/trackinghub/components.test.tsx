import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";
import type { DailyReportDraft } from "@/lib/reports/report-draft";
import type { ReportPreviewData } from "@/lib/reports/report-preview";
import type { AcceptanceItem } from "@/lib/trackinghub/sample-data";
import {
  acceptanceItems,
  analyticsFunnelSteps,
  analyticsMetricCards,
  analyticsTemplateItems,
  eventDictionaryItems,
  featuredEventDetail,
  governanceAcceptanceChecks,
  governanceSummaryCards,
  projectEnvironmentItems,
  projectItems,
  projectSummaryCards,
  reportTaskItems,
  reportTemplateItems,
  reportItems,
  sdkKeyItems,
} from "@/lib/trackinghub/sample-data";
import { AcceptanceTable } from "./acceptance-table";
import { AnalyticsWorkbench } from "./analytics-workbench";
import { CodexSummaryCard } from "./codex-summary-card";
import { EmptyPageState } from "./empty-page-state";
import { GovernanceWorkbench } from "./governance-workbench";
import { LoginForm } from "./login-form";
import { MetricCard } from "./metric-card";
import { PageHeader } from "./page-header";
import { ProjectManagementWorkbench } from "./project-management-workbench";
import { ReportsWorkbench } from "./reports-workbench";
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

  it("renders the governance workbench with dictionary, detail, and acceptance checks", () => {
    const html = renderToStaticMarkup(
      <GovernanceWorkbench
        acceptanceChecks={governanceAcceptanceChecks}
        eventDetail={{
          ...featuredEventDetail,
          recentSamples: [
            {
              eventName: "photo_shared",
              environment: "prod",
              source: "Web",
              status: "invalid",
              errors: ["channel is required"],
              sampleEventId: "event_invalid",
              observedAt: "2026-05-10T07:31:00.000Z",
            },
          ],
        }}
        events={eventDictionaryItems}
        summaryCards={governanceSummaryCards}
      />,
    );

    expect(html).toContain("事件字典");
    expect(html).toContain("重点事件");
    expect(html).toContain("验收检查");
    expect(html).toContain("pay_button_click");
    expect(html).toContain("product_id");
    expect(html).toContain("Schema 不一致");
    expect(html).toContain("最近样本");
    expect(html).toContain("channel is required");
    expect(html).toContain('data-slot="table"');
  });

  it("renders project management with projects, environments, and SDK key status", () => {
    const html = renderToStaticMarkup(
      <ProjectManagementWorkbench
        environments={projectEnvironmentItems}
        projects={projectItems}
        sdkKeys={sdkKeyItems}
        summaryCards={projectSummaryCards}
      />,
    );

    expect(html).toContain("项目列表");
    expect(html).toContain("环境配置");
    expect(html).toContain("SDK Key 状态");
    expect(html).toContain("Magic Frame");
    expect(html).toContain("prod");
    expect(html).toContain("write_key_live_••••91");
  });

  it("renders analytics templates for overview, trend, funnel, and retention", () => {
    const html = renderToStaticMarkup(
      <AnalyticsWorkbench
        filters={{
          eventName: "",
          funnelSteps: [
            "product_detail_view",
            "pay_button_click",
            "checkout_submit",
          ],
          granularity: "day",
          range: "7d",
        }}
        funnelSteps={analyticsFunnelSteps}
        metrics={analyticsMetricCards}
        source="sample"
        templates={analyticsTemplateItems}
        trendItems={[
          {
            bucket: "05-10 00:00",
            eventName: "pay_button_click",
            environment: "prod",
            source: "web",
            eventCount: "120",
            uniqueUsers: "88",
          },
        ]}
      />,
    );

    expect(html).toContain("分析模板");
    expect(html).toContain("当前显示占位数据");
    expect(html).toContain("项目 ID");
    expect(html).toContain('name="environment"');
    expect(html).toContain('name="source"');
    expect(html).toContain('name="event_name"');
    expect(html).toContain('name="funnel_steps"');
    expect(html).toContain("product_detail_view, pay_button_click, checkout_submit");
    expect(html).toContain('name="range"');
    expect(html).toContain('name="granularity"');
    expect(html).toContain("事件趋势");
    expect(html).toContain("pay_button_click");
    expect(html).toContain("唯一用户");
    expect(html).toContain("漏斗步骤");
    expect(html).toContain("D7 留存");
  });

  it("renders an explicit analytics unavailable state", () => {
    const html = renderToStaticMarkup(
      <AnalyticsWorkbench
        filters={{
          eventName: "",
          funnelSteps: [
            "product_detail_view",
            "pay_button_click",
            "checkout_submit",
          ],
          granularity: "day",
          range: "7d",
        }}
        funnelSteps={[]}
        metrics={[]}
        source="unavailable"
        templates={analyticsTemplateItems}
        trendItems={[]}
      />,
    );

    expect(html).toContain("真实数据源不可用");
    expect(html).toContain("当前环境未读取到真实数据");
    expect(html).toContain("暂不能生成指标卡片");
    expect(html).toContain("当前筛选范围暂无漏斗数据。");
  });

  it("renders report templates, report preview data, and Codex task queue", () => {
    const draft: DailyReportDraft = {
      title: "magic_frame / prod / web 日报草稿",
      summary: "最近 7 天内，事件量 2.7k，活跃用户 184，异常占比 15.0%。",
      highlights: [
        "事件量：2.7k（最近 7 天接收事件）",
        "活跃用户：184（最近 7 天去重用户）",
        "异常占比：15.0%（3 / 20 条验证异常）",
      ],
      trendExplanation:
        "趋势重点：05-10 00:00 的 pay_button_click 事件量 120，唯一用户 88，是本次草稿优先解释的变化入口。",
      funnelExplanation:
        "漏斗掉点：Step 1 product_detail_view 到 Step 2 pay_button_click 掉点 20.0%，当前转化 80.0%，建议优先拆解页面入口、渠道、版本和关键属性。",
      nextActions: [
        "复核异常样本，确认是否由 Schema、版本或渠道流量变化导致。",
        "围绕 pay_button_click 补充渠道、版本、页面来源维度拆解。",
        "针对 product_detail_view -> pay_button_click 最大掉点补充漏斗解释。",
      ],
    };
    const preview: ReportPreviewData = {
      source: "clickhouse",
      rangeLabel: "最近 7 天",
      filters: {
        projectId: "magic_frame",
        environment: "prod",
        source: "web",
        funnelSteps: [
          "product_detail_view",
          "pay_button_click",
          "checkout_submit",
        ],
        granularity: "day",
        range: "7d",
      },
      metrics: [
        {
          label: "事件量",
          value: "2.7k",
          detail: "最近 7 天接收事件",
          tone: "blue",
        },
        {
          label: "活跃用户",
          value: "184",
          detail: "最近 7 天去重用户",
          tone: "green",
        },
        {
          label: "异常占比",
          value: "15.0%",
          detail: "3 / 20 条验证异常",
          tone: "red",
        },
      ],
      trendItems: [
        {
          bucket: "05-10 00:00",
          eventName: "pay_button_click",
          environment: "prod",
          source: "web",
          eventCount: "120",
          uniqueUsers: "88",
        },
      ],
      funnelSteps: [
        {
          step: "1",
          eventName: "product_detail_view",
          users: "100",
          conversion: "100%",
        },
        {
          step: "2",
          eventName: "pay_button_click",
          users: "80",
          conversion: "80.0%",
        },
      ],
      funnelDropoff: {
        fromEventName: "product_detail_view",
        fromStep: "1",
        toEventName: "pay_button_click",
        toStep: "2",
        dropoff: "20.0%",
        conversion: "80.0%",
      },
    };
    const html = renderToStaticMarkup(
      <ReportsWorkbench
        dailyDraft={draft}
        dailyDraftHref="/reports?report_action=daily_draft"
        preview={preview}
        tasks={reportTaskItems}
        templates={reportTemplateItems}
      />,
    );

    expect(html).toContain("生成日报草稿");
    expect(html).toContain('href="/reports?report_action=daily_draft"');
    expect(html).toContain("日报草稿");
    expect(html).toContain("保存日报");
    expect(html).toContain("magic_frame / prod / web 日报草稿");
    expect(html).toContain("建议下一步");
    expect(html).toContain("日报数据预览");
    expect(html).toContain("已连接真实 ClickHouse 数据");
    expect(html).toContain("事件量");
    expect(html).toContain("活跃用户");
    expect(html).toContain("异常占比");
    expect(html).toContain("趋势 Top 事件");
    expect(html).toContain("pay_button_click");
    expect(html).toContain("漏斗掉点");
    expect(html).toContain("product_detail_view");
    expect(html).toContain("20.0%");
    expect(html).toContain("报告模板");
    expect(html).toContain("Codex 任务队列");
    expect(html).toContain("异常解释");
    expect(html).toContain("漏斗掉点解释");
  });

  it("renders the internal login form", () => {
    const html = renderToStaticMarkup(<LoginForm />);

    expect(html).toContain("登录 TrackingHub");
    expect(html).toContain('name="email"');
    expect(html).toContain('name="password"');
    expect(html).toContain("进入工作台");
    expect(html).toContain("内部项目埋点治理与分析平台");
  });
});
