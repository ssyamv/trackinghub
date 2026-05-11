import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";
import type { DailyReportDraft } from "@/lib/reports/report-draft";
import type { ReportPreviewData } from "@/lib/reports/report-preview";
import { analyticsTemplateItems } from "@/lib/trackinghub/analytics-templates";
import { reportTemplateItems } from "@/lib/trackinghub/report-templates";
import type {
  AnalyticsFunnelStep,
  EventDictionaryItem,
  FeaturedEventDetail,
  GovernanceAcceptanceCheck,
  ProjectEnvironmentItem,
  ProjectItem,
  SdkKeyItem,
  StatusCard,
} from "@/lib/trackinghub/types";
import { AnalyticsWorkbench } from "./analytics-workbench";
import { EmptyPageState } from "./empty-page-state";
import { GovernanceWorkbench } from "./governance-workbench";
import { LoginForm } from "./login-form";
import { MetricCard } from "./metric-card";
import { PageHeader } from "./page-header";
import { ProjectManagementWorkbench } from "./project-management-workbench";
import { ReportsWorkbench } from "./reports-workbench";
import { StatusBadge } from "./status-badge";

const governanceSummaryCards: StatusCard[] = [
  { label: "治理事件", value: "1", detail: "来自 Postgres 事件字典", tone: "blue" },
];

const eventDictionaryItems: EventDictionaryItem[] = [
  {
    id: "photo_shared",
    eventName: "photo_shared",
    displayName: "照片分享",
    project: "正式项目",
    platforms: "Web",
    environment: "按环境验证",
    owner: "增长",
    status: "待验收",
    statusTone: "warning",
    lastSeen: "暂无",
  },
];

const featuredEventDetail: FeaturedEventDetail = {
  eventName: "photo_shared",
  displayName: "照片分享",
  businessGoal: "验证真实事件定义展示。",
  triggerTiming: "用户分享照片时触发。",
  platforms: ["Web"],
  requiredProperties: [
    {
      name: "photo_id",
      type: "string",
      description: "照片 ID。",
      example: "photo_1",
    },
  ],
};

const governanceAcceptanceChecks: GovernanceAcceptanceCheck[] = [
  {
    label: "photo_shared / invalid",
    detail: "channel is required",
    tone: "danger",
  },
];

const projectSummaryCards: StatusCard[] = [
  { label: "项目总数", value: "1", detail: "来自 Postgres 元数据", tone: "blue" },
];

const projectItems: ProjectItem[] = [
  {
    name: "正式项目",
    slug: "official-project",
    description: "来自真实元数据的项目。",
    platforms: "Web",
    status: "运行中",
    owner: "产品",
    events: "等待事件字典关联",
  },
];

const projectEnvironmentItems: ProjectEnvironmentItem[] = [
  {
    project: "正式项目",
    name: "prod",
    enabled: true,
    lastEventAt: "暂无",
    writeKeyStatus: "启用",
  },
];

const sdkKeyItems: SdkKeyItem[] = [
  {
    id: "sdk_key_real_prod_web",
    project: "正式项目",
    environment: "prod",
    source: "Web",
    maskedKey: "write_key_••••91",
    status: "启用",
    lastUsed: "暂无",
  },
];

const analyticsMetricCards: StatusCard[] = [
  { label: "事件量", value: "120", detail: "最近 7 天接收事件", tone: "blue" },
  { label: "活跃用户", value: "88", detail: "最近 7 天去重用户", tone: "green" },
];

const analyticsFunnelSteps: AnalyticsFunnelStep[] = [
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
];

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
        label="事件量"
        value="120"
        detail="最近 7 天接收事件"
        tone="purple"
      />,
    );

    expect(html).toContain("事件量");
    expect(html).toContain("120");
    expect(html).toContain("最近 7 天接收事件");
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
    expect(html).toContain("photo_shared");
    expect(html).toContain("photo_id");
    expect(html).toContain("channel is required");
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
    expect(html).toContain("正式项目");
    expect(html).toContain("prod");
    expect(html).toContain("write_key_••••91");
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
        source="clickhouse"
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
    expect(html).toContain("已连接真实 ClickHouse 数据");
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
    expect(html).toContain("留存");
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

  it("renders report templates and report preview data", () => {
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
