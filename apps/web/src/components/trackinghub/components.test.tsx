import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";
import type { DailyReportDraft } from "@/lib/reports/report-draft";
import type { ReportPreviewData } from "@/lib/reports/report-preview";
import type {
  AnalyticsFunnelStep,
  AnalyticsTrendItem,
  EventDictionaryItem,
  GovernanceAcceptanceCheck,
  ProjectEnvironmentItem,
  ProjectItem,
  SdkKeyItem,
  StatusCard,
} from "@/lib/trackinghub/types";
import { AnalyticsWorkbench } from "./analytics-workbench";
import { EmptyPageState } from "./empty-page-state";
import { GovernanceWorkbench } from "./governance-workbench";
import { HomeEventTrendChart } from "./home-event-trend-chart";
import { HomeRangeSwitcher } from "./home-range-switcher";
import { LoginForm } from "./login-form";
import { LogsWorkbench } from "./logs-workbench";
import { MetricCard } from "./metric-card";
import { PageHeader } from "./page-header";
import { ProjectManagementWorkbench } from "./project-management-workbench";
import {
  buildProjectSwitchHref,
  ProjectSwitcher,
} from "./project-switcher";
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
    usersValue: 100,
    conversion: "100%",
    conversionRate: 1,
  },
  {
    step: "2",
    eventName: "pay_button_click",
    users: "80",
    usersValue: 80,
    conversion: "80.0%",
    conversionRate: 0.8,
  },
];

const analyticsTrendItems: AnalyticsTrendItem[] = [
  {
    bucket: "05-10 00:00",
    eventName: "homepage_view",
    environment: "prod",
    source: "web",
    eventCount: "26",
    eventCountValue: 26,
    uniqueUsers: "26",
    uniqueUsersValue: 26,
  },
  {
    bucket: "05-11 00:00",
    eventName: "homepage_view",
    environment: "prod",
    source: "flutter",
    eventCount: "13",
    eventCountValue: 13,
    uniqueUsers: "13",
    uniqueUsersValue: 13,
  },
  {
    bucket: "05-11 00:00",
    eventName: "signup_submit",
    environment: "prod",
    source: "web",
    eventCount: "64",
    eventCountValue: 64,
    uniqueUsers: "41",
    uniqueUsersValue: 41,
  },
];

describe("TrackingHub components", () => {
  it("renders a page header with actions", () => {
    const html = renderToStaticMarkup(
      <PageHeader
        eyebrow="Projects"
        title="项目"
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

  it("renders home event count trend as a single ECharts canvas chart", () => {
    const html = renderToStaticMarkup(
      <HomeEventTrendChart items={analyticsTrendItems} rangeLabel="最近 30 天" />,
    );

    expect(html).toContain('aria-label="首页事件发生数量趋势图"');
    expect(html).toContain("事件发生数量");
    expect(html).toContain("最近 30 天");
    expect(html).toContain("按日聚合全部事件发生次数");
    expect(html).toContain("ECharts Canvas");
    expect(html).not.toContain("事件排行");
    expect(html).not.toContain("<svg");
  });

  it("renders home range switch links and preserves project context", () => {
    const html = renderToStaticMarkup(
      <HomeRangeSwitcher
        currentRange="30d"
        dateFrom="2026-05-05"
        dateTo="2026-05-11"
        projectId="28024e55-0ff3-455a-87e1-750af9a5c49a"
      />,
    );

    expect(html).toContain('aria-label="选择首页图表时间段"');
    expect(html).toContain("近 7 天");
    expect(html).toContain("近 30 天");
    expect(html).toContain(
      'href="/?project_id=28024e55-0ff3-455a-87e1-750af9a5c49a&amp;range=7d"',
    );
    expect(html).toContain('name="date_from"');
    expect(html).toContain('name="date_to"');
    expect(html).toContain('value="2026-05-05"');
    expect(html).toContain('value="2026-05-11"');
    expect(html).toContain('name="project_id"');
    expect(html).toContain("自定义");
    expect(html).not.toContain('aria-current="true"');
  });

  it("renders home range switcher as buttons when client refresh is enabled", () => {
    const html = renderToStaticMarkup(
      <HomeRangeSwitcher currentRange="7d" onRangeChange={() => undefined} />,
    );

    expect(html).toContain("<button");
    expect(html).toContain("近 7 天");
    expect(html).toContain('aria-current="true"');
    expect(html).not.toContain('href="/?range=7d"');
  });

  it("explains when home event trend only has a single time bucket", () => {
    const html = renderToStaticMarkup(
      <HomeEventTrendChart
        items={[
          {
            bucket: "05-11 00:00",
            eventName: "app_open",
            environment: "prod",
            source: "flutter",
            eventCount: "26",
            eventCountValue: 26,
            uniqueUsers: "26",
            uniqueUsersValue: 26,
          },
          {
            bucket: "05-11 00:00",
            eventName: "homepage_view",
            environment: "prod",
            source: "web",
            eventCount: "13",
            eventCountValue: 13,
            uniqueUsers: "13",
            uniqueUsersValue: 13,
          },
        ]}
        rangeLabel="最近 7 天"
      />,
    );

    expect(html).toContain("当前只有 1 个时间点");
    expect(html).toContain("更多 demo 数据进入后会形成趋势曲线");
    expect(html).not.toContain("高频事件");
    expect(html).not.toContain("05-11 00:00 / p");
  });

  it("renders the project switcher and preserves page filters", () => {
    const html = renderToStaticMarkup(
      <ProjectSwitcher
        initialProjects={[
          {
            id: "project_demo",
            name: "TrackingHub Demo",
            slug: "trackinghub_demo_showcase",
          },
        ]}
      />,
    );

    expect(html).toContain("当前项目");
    expect(html).toContain("全部项目");
    expect(html).toContain("min-h-[76px]");
    expect(html).toContain('aria-label="切换项目"');
    expect(
      buildProjectSwitchHref(
        "http://localhost/analytics?range=30d&page=4&project_id=old",
        "project_demo",
      ),
    ).toBe("/analytics?range=30d&project_id=project_demo");
    expect(
      buildProjectSwitchHref(
        "http://localhost/reports?range=7d&project_id=project_demo",
        "",
      ),
    ).toBe("/reports?range=7d");
  });

  it("keeps the project switcher space while projects are loading", () => {
    const html = renderToStaticMarkup(<ProjectSwitcher />);

    expect(html).toContain("当前项目");
    expect(html).toContain("正在加载项目");
    expect(html).toContain("min-h-[76px]");
    expect(html).toContain('aria-label="切换项目"');
  });

  it("renders the shared empty page state", () => {
    const html = renderToStaticMarkup(
      <EmptyPageState
        badge="分析工作台"
        title="分析"
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
  it("renders the governance workbench with dictionary and active problems", () => {
    const html = renderToStaticMarkup(
      <GovernanceWorkbench
        acceptanceChecks={governanceAcceptanceChecks}
        events={eventDictionaryItems}
        dictionaryFilters={{
          page: 1,
          platform: "all",
          query: "",
          status: "all",
        }}
        summaryCards={governanceSummaryCards}
      />,
    );

    expect(html).toContain("事件字典");
    expect(html).toContain("操作");
    expect(html).not.toContain("浏览字典");
    expect(html).not.toContain("编辑定义");
    expect(html).toContain('name="q"');
    expect(html).toContain('name="status"');
    expect(html).toContain('name="platform"');
    expect(html).toContain("第 1 / 1 页");
    expect(html).toContain("待处理问题");
    expect(html).not.toContain("重点事件");
    expect(html).not.toContain("验收检查");
    expect(html).toContain("photo_shared");
    expect(html).toContain("channel is required");
    expect(html).toContain('data-slot="table"');
  });

  it("filters and paginates the governance event dictionary", () => {
    const manyEvents: EventDictionaryItem[] = Array.from(
      { length: 13 },
      (_, index) => ({
        id: `event_${index + 1}`,
        eventName:
          index === 12 ? "checkout_event_submit" : `frame_event_${index + 1}`,
        displayName: index === 12 ? "支付按钮点击" : `画框事件 ${index + 1}`,
        project: "Magic Frame App",
        platforms: index % 3 === 0 ? "Web" : "Flutter",
        environment: "按环境验证",
        owner: index === 12 ? "checkout" : "frame",
        status: index % 3 === 0 ? "待验收" : "草稿",
        statusTone: index % 3 === 0 ? "warning" : "warning",
        lastSeen: "暂无",
      }),
    );

    const html = renderToStaticMarkup(
      <GovernanceWorkbench
        acceptanceChecks={[]}
        dictionaryFilters={{
          page: 1,
          pageSize: 3,
          platform: "web",
          query: "event",
          status: "待验收",
        }}
        events={manyEvents}
        summaryCards={governanceSummaryCards}
      />,
    );

    expect(html).toContain("共 5 条匹配");
    expect(html).toContain("第 1 / 2 页");
    expect(html).toContain('value="event"');
    expect(html).toContain('value="待验收"');
    expect(html).toContain('value="web"');
    expect(html).toContain("frame_event_1");
    expect(html).not.toContain("frame_event_2");
    expect(html).not.toContain("frame_event_10");
    expect(html).not.toContain("pay_button_click");
    expect(html).toContain("下一页");
    expect(html).toContain("每页");
    expect(html).toContain('name="page_size"');
    expect(html).toContain('value="3"');
    expect(html).toContain("跳至");
    expect(html).toContain('name="target_page"');
    expect(html).toContain("跳页");
    expect(html).toContain("操作");
    expect(html).not.toContain("待处理问题");
    expect(html).not.toContain('action="/governance"');
    expect(html).not.toContain('href="/governance');
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

  it("renders analytics filters, metrics, trend chart, and funnel chart", () => {
    const html = renderToStaticMarkup(
      <AnalyticsWorkbench
        filters={{
          eventName: "pay_button_click",
          funnelSteps: [
            "product_detail_view",
            "pay_button_click",
            "checkout_submit",
          ],
          granularity: "day",
          range: "7d",
        }}
        funnelSteps={analyticsFunnelSteps}
        dimensionGroups={[]}
        metrics={analyticsMetricCards}
        propertyKeyCount={2}
        propertyItems={[
          {
            distinctValues: 2,
            eventCount: "120",
            eventCountValue: 120,
            propertyKey: "source_page",
            propertyValue: "home",
            uniqueUsers: "88",
            uniqueUsersValue: 88,
          },
          {
            distinctValues: 2,
            eventCount: "80",
            eventCountValue: 80,
            propertyKey: "source_page",
            propertyValue: "detail",
            uniqueUsers: "51",
            uniqueUsersValue: 51,
          },
          {
            distinctValues: 1,
            eventCount: "42",
            eventCountValue: 42,
            propertyKey: "button_type",
            propertyValue: "primary",
            uniqueUsers: "34",
            uniqueUsersValue: 34,
          },
        ]}
        source="clickhouse"
        trendItems={[
          {
            bucket: "05-10 00:00",
            eventName: "pay_button_click",
            environment: "prod",
            source: "web",
            eventCount: "120",
            eventCountValue: 120,
            uniqueUsers: "88",
            uniqueUsersValue: 88,
          },
        ]}
      />,
    );

    expect(html).not.toContain("已连接真实 ClickHouse 数据");
    expect(html).not.toContain('name="project_id"');
    expect(html).toContain('name="environment"');
    expect(html).toContain('name="source"');
    expect(html).toContain('name="event_name"');
    expect(html).toContain('name="funnel_steps"');
    expect(html).toContain("分析步骤");
    expect(html).not.toContain("漏斗步骤");
    expect(html).toContain("product_detail_view, pay_button_click, checkout_submit");
    expect(html).toContain('name="range"');
    expect(html).toContain("自定义");
    expect(html).not.toContain('name="date_from"');
    expect(html).not.toContain('name="date_to"');
    expect(html).toContain('name="granularity"');
    expect(html).not.toContain("分析指挥台");
    expect(html).not.toContain("产品健康");
    expect(html).not.toContain("实时排障");
    expect(html).not.toContain("核心漏斗");
    expect(html).not.toContain("日报口径");
    expect(html).not.toContain('href="/analytics?');
    expect(html).not.toContain('action="/analytics"');
    expect(html).toContain("事件趋势与维度拆分");
    expect(html).toContain("事件量与唯一用户");
    expect(html).toContain("ECharts Canvas");
    expect(html).toContain('aria-label="事件趋势图"');
    expect(html).toContain("pay_button_click");
    expect(html).toContain("唯一用户");
    expect(html).toContain("维度拆分");
    expect(html).toContain("高频事件");
    expect(html).toContain("事件参数分析");
    expect(html).toContain("参数数量");
    expect(html).toContain("不同取值");
    expect(html).toContain("source_page");
    expect(html).toContain("home");
    expect(html).toContain("detail");
    expect(html).not.toContain("最近时间点");
    expect(html).not.toContain("主平台");
    expect(html).not.toContain("趋势点");
    expect(html).toContain("漏斗转化诊断");
    expect(html).toContain("掉点诊断");
    expect(html).toContain('aria-label="漏斗转化图"');
    expect(html).not.toContain("留存同期群");
    expect(html).not.toContain("分析模板");
    expect(html).not.toContain("查询条件会同步到地址栏");
    expect(html).not.toContain("当前页面只读取 ClickHouse");
    expect(html).not.toContain("当前口径");
    expect(html).not.toContain("从埋点质量、用户行为到转化掉点的一屏诊断");
    expect(html).not.toContain("参考成熟产品分析平台的信息架构");
  });

  it("renders analytics trend pagination as local table controls", () => {
    const trendItems = Array.from({ length: 12 }, (_, index) => ({
      bucket: `05-${String(index + 1).padStart(2, "0")} 00:00`,
      eventName: `event_${index + 1}`,
      environment: "prod",
      source: "web",
      eventCount: String(index + 1),
      eventCountValue: index + 1,
      uniqueUsers: String(index + 1),
      uniqueUsersValue: index + 1,
    })) satisfies AnalyticsTrendItem[];

    const html = renderToStaticMarkup(
      <AnalyticsWorkbench
        filters={{
          environment: "prod",
          eventName: "event",
          funnelSteps: ["event_1", "event_2"],
          granularity: "day",
          projectId: "project_demo",
          range: "7d",
          source: "web",
        }}
        funnelSteps={analyticsFunnelSteps}
        dimensionGroups={[]}
        metrics={analyticsMetricCards}
        propertyKeyCount={0}
        propertyItems={[]}
        source="clickhouse"
        trendItems={trendItems}
      />,
    );

    expect(html).toContain("当前显示第 1 - 10 条，共 12 条");
    expect(html).toContain("第 1 / 2 页");
    expect(html).toContain("event_1");
    expect(html).toContain("event_10");
    expect(html).not.toContain("event_page");
    expect(html).toContain("翻页只更新当前表格，不重新加载分析页");
    expect(html).toContain("上一页");
    expect(html).toContain("下一页");
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
        dimensionGroups={[]}
        metrics={[]}
        propertyKeyCount={0}
        propertyItems={[]}
        source="unavailable"
        trendItems={[]}
      />,
    );

    expect(html).not.toContain("真实数据源不可用");
    expect(html).not.toContain("当前环境未读取到真实数据");
    expect(html).toContain("暂不能生成指标卡片");
    expect(html).toContain("当前筛选范围暂无漏斗数据。");
    expect(html).not.toContain("当前筛选范围暂无留存数据。");
  });

  it("renders logs filters, metrics, level distribution, and recent rows", () => {
    const html = renderToStaticMarkup(
      <LogsWorkbench
        logs={{
          source: "clickhouse",
          filters: {
            projectId: "project_x",
            level: "error",
            q: "checkout",
            range: "7d",
          },
          metrics: [
            {
              label: "日志量",
              value: "42",
              detail: "最近 7 天接收日志",
              tone: "blue",
            },
          ],
          levelCounts: [{ level: "error", count: 7, share: "16.7%" }],
          items: [
            {
              logId: "log_123",
              level: "error",
              message: "Checkout failed",
              logger: "checkout",
              environment: "prod",
              source: "web",
              timestamp: "05-21 10:00",
              receivedAt: "05-21 10:00",
              identity: "u_123",
              appVersion: "1.2.0",
              traceId: "trace_123",
              errorSummary: "CheckoutError: payment timeout",
            },
          ],
        }}
      />,
    );

    expect(html).toContain("项目 ID");
    expect(html).toContain("级别分布");
    expect(html).toContain("最近日志");
    expect(html).toContain("Checkout failed");
    expect(html).toContain("CheckoutError: payment timeout");
    expect(html).toContain("trace_123");
  });

  it("renders report preview data", () => {
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
      dataHealth: {
        label: "数据需复核",
        detail: "异常占比 15.0%，建议先确认 Schema、版本或渠道变化。",
        tone: "warning",
      },
      executiveSummary: [
        "最近 7 天内，事件量 2.7k，活跃用户 184，异常占比 15.0%。",
        "主要变化入口是 05-10 00:00 的 pay_button_click，事件量 120，唯一用户 88。",
        "最大漏斗掉点出现在 product_detail_view -> pay_button_click，掉点 20.0%，当前转化 80.0%。",
        "2026-05-10 同期群 Day 1 留存 42.0%，样本 100 人。",
      ],
      insightCards: [
        {
          title: "趋势入口",
          detail: "05-10 00:00 的 pay_button_click 事件量 120，唯一用户 88。",
          tone: "neutral",
        },
        {
          title: "最大掉点",
          detail: "product_detail_view -> pay_button_click 掉点 20.0%，当前转化 80.0%。",
          tone: "warning",
        },
        {
          title: "留存观察",
          detail: "2026-05-10 同期群 Day 1 留存 42.0%，样本 100 人。",
          tone: "success",
        },
      ],
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
          eventCountValue: 120,
          uniqueUsers: "88",
          uniqueUsersValue: 88,
        },
      ],
      trendChartItems: [
        {
          bucket: "05-10 00:00",
          eventName: "pay_button_click",
          environment: "prod",
          source: "web",
          eventCount: "120",
          eventCountValue: 120,
          uniqueUsers: "88",
          uniqueUsersValue: 88,
        },
      ],
      funnelSteps: [
        {
          step: "1",
          eventName: "product_detail_view",
          users: "100",
          usersValue: 100,
          conversion: "100%",
          conversionRate: 1,
        },
        {
          step: "2",
          eventName: "pay_button_click",
          users: "80",
          usersValue: 80,
          conversion: "80.0%",
          conversionRate: 0.8,
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
      retentionItems: [
        {
          cohort: "2026-05-10",
          day: 1,
          cohortUsers: "100",
          cohortUsersValue: 100,
          retainedUsers: "42",
          retainedUsersValue: 42,
          retention: "42.0%",
          retentionRate: 0.42,
        },
      ],
      retentionSummary: "2026-05-10 同期群 Day 1 留存 42.0%，样本 100 人。",
    };
    const html = renderToStaticMarkup(
      <ReportsWorkbench
        dailyDraft={draft}
        preview={preview}
        projectOptions={[
          {
            id: "magic_frame",
            name: "Magic Frame App",
            slug: "magic_frame_app",
          },
        ]}
      />,
    );

    expect(html).toContain("生成日报草稿");
    expect(html).not.toContain('href="/reports?report_action=daily_draft"');
    expect(html).not.toContain('action="/reports"');
    expect(html).toContain('name="project_id"');
    expect(html).toContain("Magic Frame App");
    expect(html).not.toContain("全部项目");
    expect(html).not.toContain("项目 UUID");
    expect(html).toContain('name="environment"');
    expect(html).toContain('name="source"');
    expect(html).toContain('name="event_name"');
    expect(html).toContain('name="funnel_steps"');
    expect(html).toContain("分析路径");
    expect(html).toContain("更新路径");
    expect(html).not.toContain("漏斗步骤");
    expect(html).toContain('name="range"');
    expect(html).toContain('name="granularity"');
    expect(html).toContain("查询");
    expect(html).toContain("重置");
    expect(html).toContain("日报草稿");
    expect(html).toContain("保存日报");
    expect(html).toContain("magic_frame / prod / web 日报草稿");
    expect(html).toContain("建议下一步");
    expect(html).toContain("运营日报工作台");
    expect(html).toContain("数据可信度");
    expect(html).toContain("数据需复核");
    expect(html).toContain("执行摘要");
    expect(html).toContain("主要变化入口");
    expect(html).toContain("趋势分析");
    expect(html).toContain('aria-label="报告事件趋势图"');
    expect(html).toContain("转化漏斗");
    expect(html).toContain('aria-label="报告漏斗转化图"');
    expect(html).toContain("留存观察");
    expect(html).toContain("已连接真实 ClickHouse 数据");
    expect(html).toContain("事件量");
    expect(html).toContain("活跃用户");
    expect(html).toContain("异常占比");
    expect(html).toContain("趋势分析");
    expect(html).toContain("pay_button_click");
    expect(html).toContain("转化漏斗");
    expect(html).toContain("product_detail_view");
    expect(html).toContain("20.0%");
    expect(html).not.toContain("ECharts Canvas");
  });

  it("renders the internal login form", () => {
    const html = renderToStaticMarkup(<LoginForm />);

    expect(html).toContain("登录 TrackingHub");
    expect(html).toContain('name="email"');
    expect(html).toContain('name="password"');
    expect(html).toContain("进入工作台");
  });
});
