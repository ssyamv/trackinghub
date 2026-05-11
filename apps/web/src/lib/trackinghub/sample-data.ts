import type { EditableEventDefinition } from "./event-dictionary-editor";

export type NavItem = {
  href: string;
  label: string;
  description: string;
};

export type StatusCard = {
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "purple" | "red";
};

export type AcceptanceTone = "success" | "warning" | "danger";

export type AcceptanceItem = {
  event: string;
  project: string;
  source: string;
  environment: string;
  status: string;
  tone: AcceptanceTone;
};

export type TimelineItem = {
  label: string;
  value: string;
  active: boolean;
};

export type PageShell = {
  title: string;
  eyebrow: string;
  description: string;
  badge: string;
  actionLabel: string;
  sections: string[];
};

export type EventDictionaryStatus = "ready" | "needs_fix" | "accepted";

export type EventDictionaryItem = {
  id: string;
  eventName: string;
  displayName: string;
  project: string;
  platforms: string;
  environment: string;
  owner: string;
  status: string;
  statusTone: AcceptanceTone;
  lastSeen: string;
};

export type EventProperty = {
  name: string;
  type: "string" | "number" | "boolean";
  description: string;
  example: string;
};

export type EventSampleStatus = {
  eventName: string;
  environment: string;
  source: string;
  status: "valid" | "invalid" | "unknown_event";
  errors: string[];
  sampleEventId: string;
  observedAt: string;
};

export type FeaturedEventDetail = {
  eventName: string;
  displayName: string;
  businessGoal: string;
  triggerTiming: string;
  platforms: string[];
  requiredProperties: EventProperty[];
  recentSamples?: EventSampleStatus[];
};

export type GovernanceAcceptanceCheck = {
  label: string;
  detail: string;
  tone: AcceptanceTone;
};

export type ProjectItem = {
  name: string;
  slug: string;
  description: string;
  platforms: string;
  status: string;
  owner: string;
  events: string;
};

export type ProjectEnvironmentItem = {
  project: string;
  name: "dev" | "staging" | "prod" | "test" | "develop" | "production";
  enabled: boolean;
  lastEventAt: string;
  writeKeyStatus: string;
};

export type SdkKeyItem = {
  id: string;
  project: string;
  environment: string;
  source: "Web" | "Flutter";
  maskedKey: string;
  status: "启用" | "轮换中" | "停用";
  lastUsed: string;
};

export type AnalyticsTemplateItem = {
  title: string;
  description: string;
  metric: string;
  filters: string[];
};

export type AnalyticsFunnelStep = {
  step: string;
  eventName: string;
  users: string;
  conversion: string;
};

export type AnalyticsTrendItem = {
  bucket: string;
  eventName: string;
  environment: string;
  source: string;
  eventCount: string;
  uniqueUsers: string;
};

export type ReportTemplateItem = {
  type: string;
  cadence: string;
  description: string;
  inputs: string[];
};

export type ReportTaskItem = {
  title: string;
  owner: "Codex" | "运营" | "产品";
  status: string;
  schedule: string;
};

export const navItems: NavItem[] = [
  { href: "/", label: "首页", description: "跨项目状态" },
  { href: "/projects", label: "项目", description: "产品与环境" },
  { href: "/governance", label: "埋点治理", description: "需求与事件字典" },
  { href: "/analytics", label: "分析", description: "指标与漏斗" },
  { href: "/reports", label: "报告", description: "日报与异常解释" },
  { href: "/settings", label: "设置", description: "成员与 SDK Key" },
];

export const statusCards: StatusCard[] = [
  { label: "活跃项目", value: "4", detail: "Web 2 个，Flutter 2 个", tone: "blue" },
  { label: "今日活跃用户", value: "18.4k", detail: "较昨日 +7.8%", tone: "green" },
  { label: "今日事件量", value: "2.7m", detail: "p95 写入延迟 1.8s", tone: "purple" },
  { label: "数据异常", value: "3", detail: "2 个 schema，1 个流量", tone: "red" },
];

export const acceptanceItems: AcceptanceItem[] = [
  {
    event: "pay_button_click",
    project: "Magic Frame",
    source: "Web + Flutter",
    environment: "预发 + 生产",
    status: "Flutter 缺少国家字段",
    tone: "warning",
  },
  {
    event: "campaign_card_view",
    project: "Homture",
    source: "Web",
    environment: "生产",
    status: "可验收",
    tone: "success",
  },
  {
    event: "subscription_success",
    project: "Magic Frame",
    source: "Flutter",
    environment: "生产",
    status: "Schema 不一致",
    tone: "danger",
  },
];

export const reportItems = [
  "每日产品运营报告已排队，09:30 生成",
  "spring_sale 活动转化率提升 12.4%",
  "D7 留存下降，需要按渠道拆解",
];

export const timelineItems: TimelineItem[] = [
  { label: "需求", value: "24", active: true },
  { label: "定义", value: "19", active: true },
  { label: "接入", value: "12", active: true },
  { label: "验收", value: "7", active: false },
];

export const governanceSummaryCards: StatusCard[] = [
  { label: "治理事件", value: "19", detail: "覆盖 4 个内部项目", tone: "blue" },
  { label: "待验收", value: "7", detail: "3 个生产事件可确认", tone: "green" },
  { label: "Schema 异常", value: "3", detail: "Flutter 与 Web 字段不一致", tone: "red" },
  { label: "最近接收", value: "2 分钟前", detail: "pay_button_click / prod", tone: "purple" },
];

export const eventDictionaryItems: EventDictionaryItem[] = [
  {
    id: "sample_pay_button_click_magic_frame",
    eventName: "pay_button_click",
    displayName: "支付按钮点击",
    project: "Magic Frame",
    platforms: "Web + Flutter",
    environment: "staging + prod",
    owner: "产品增长",
    status: "待修复",
    statusTone: "warning",
    lastSeen: "2 分钟前",
  },
  {
    id: "sample_campaign_card_view_homture",
    eventName: "campaign_card_view",
    displayName: "活动卡片曝光",
    project: "Homture",
    platforms: "Web",
    environment: "prod",
    owner: "运营",
    status: "可验收",
    statusTone: "success",
    lastSeen: "8 分钟前",
  },
  {
    id: "sample_subscription_success_magic_frame",
    eventName: "subscription_success",
    displayName: "订阅成功",
    project: "Magic Frame",
    platforms: "Flutter",
    environment: "prod",
    owner: "商业化",
    status: "Schema 不一致",
    statusTone: "danger",
    lastSeen: "23 分钟前",
  },
  {
    id: "sample_onboarding_finish_local_drop",
    eventName: "onboarding_finish",
    displayName: "新手引导完成",
    project: "Local Drop",
    platforms: "Web + Flutter",
    environment: "staging",
    owner: "产品体验",
    status: "已验收",
    statusTone: "success",
    lastSeen: "1 小时前",
  },
];

export const featuredEventDetail: FeaturedEventDetail = {
  eventName: "pay_button_click",
  displayName: "支付按钮点击",
  businessGoal: "评估商品详情页到支付链路的转化质量，并按渠道、版本和国家拆解流失。",
  triggerTiming: "用户在商品详情页或活动落地页点击支付主按钮时触发。",
  platforms: ["Web", "Flutter"],
  requiredProperties: [
    {
      name: "product_id",
      type: "string",
      description: "被点击支付按钮对应的商品标识。",
      example: "p_123",
    },
    {
      name: "price",
      type: "number",
      description: "点击时展示的商品价格。",
      example: "19.9",
    },
    {
      name: "currency",
      type: "string",
      description: "价格币种，使用 ISO 货币代码。",
      example: "USD",
    },
    {
      name: "source_page",
      type: "string",
      description: "触发点击的页面或弹层来源。",
      example: "product_detail",
    },
  ],
};

export const governanceAcceptanceChecks: GovernanceAcceptanceCheck[] = [
  {
    label: "事件已接收",
    detail: "prod 最近 2 分钟内收到 Web 与 Flutter 上报。",
    tone: "success",
  },
  {
    label: "必填字段完整",
    detail: "Web payload 完整，Flutter 缺少 country 上下文字段。",
    tone: "warning",
  },
  {
    label: "属性类型匹配",
    detail: "price 在 Flutter 端偶发 string，需要统一为 number。",
    tone: "danger",
  },
  {
    label: "版本覆盖",
    detail: "Web 1.8.2 与 Flutter 2.1.0 均已有样本。",
    tone: "success",
  },
];

export const projectSummaryCards: StatusCard[] = [
  { label: "项目总数", value: "4", detail: "3 个生产接入，1 个预发验证", tone: "blue" },
  { label: "生产环境", value: "3", detail: "Magic Frame / Homture / Local Drop", tone: "green" },
  { label: "启用 SDK Key", value: "9", detail: "Web 5 个，Flutter 4 个", tone: "purple" },
  { label: "待处理接入", value: "5", detail: "2 个 key 需轮换，3 个事件待修复", tone: "red" },
];

export const projectItems: ProjectItem[] = [
  {
    name: "Magic Frame",
    slug: "magic-frame",
    description: "AI 相框与订阅转化分析。",
    platforms: "Web + Flutter",
    status: "运行中",
    owner: "增长产品",
    events: "8 个治理事件",
  },
  {
    name: "Homture",
    slug: "homture",
    description: "官网线索、活动和内容转化分析。",
    platforms: "Web",
    status: "运行中",
    owner: "运营",
    events: "5 个治理事件",
  },
  {
    name: "Local Drop",
    slug: "local-drop",
    description: "跨端文件传输激活与留存分析。",
    platforms: "Web + Flutter",
    status: "预发验证",
    owner: "产品体验",
    events: "4 个治理事件",
  },
];

export const projectEnvironmentItems: ProjectEnvironmentItem[] = [
  {
    project: "Magic Frame",
    name: "prod",
    enabled: true,
    lastEventAt: "2 分钟前",
    writeKeyStatus: "启用",
  },
  {
    project: "Magic Frame",
    name: "staging",
    enabled: true,
    lastEventAt: "18 分钟前",
    writeKeyStatus: "轮换中",
  },
  {
    project: "Homture",
    name: "prod",
    enabled: true,
    lastEventAt: "8 分钟前",
    writeKeyStatus: "启用",
  },
  {
    project: "Local Drop",
    name: "dev",
    enabled: false,
    lastEventAt: "暂无",
    writeKeyStatus: "停用",
  },
];

export const sdkKeyItems: SdkKeyItem[] = [
  {
    id: "sample_sdk_key_magic_frame_prod_web",
    project: "Magic Frame",
    environment: "prod",
    source: "Web",
    maskedKey: "write_key_live_••••91",
    status: "启用",
    lastUsed: "2 分钟前",
  },
  {
    id: "sample_sdk_key_magic_frame_prod_flutter",
    project: "Magic Frame",
    environment: "prod",
    source: "Flutter",
    maskedKey: "write_key_app_••••38",
    status: "启用",
    lastUsed: "3 分钟前",
  },
  {
    id: "sample_sdk_key_magic_frame_staging_web",
    project: "Magic Frame",
    environment: "staging",
    source: "Web",
    maskedKey: "write_key_stage_••••16",
    status: "轮换中",
    lastUsed: "18 分钟前",
  },
  {
    id: "sample_sdk_key_local_drop_dev_flutter",
    project: "Local Drop",
    environment: "dev",
    source: "Flutter",
    maskedKey: "write_key_dev_••••04",
    status: "停用",
    lastUsed: "暂无",
  },
];

export const editableEventDefinitions: EditableEventDefinition[] = [
  {
    id: "pay_button_click",
    eventName: "pay_button_click",
    displayName: "支付按钮点击",
    description: "用户在商品详情页或活动落地页点击支付主按钮。",
    platforms: ["Web", "Flutter"],
    requiredProperties: ["product_id", "price", "currency", "source_page"],
    status: "ready",
  },
  {
    id: "campaign_card_view",
    eventName: "campaign_card_view",
    displayName: "活动卡片曝光",
    description: "活动卡片进入可视区域，用于评估渠道内容曝光。",
    platforms: ["Web"],
    requiredProperties: ["campaign_id"],
    status: "accepted",
  },
  {
    id: "subscription_success",
    eventName: "subscription_success",
    displayName: "订阅成功",
    description: "用户完成订阅支付后触发。",
    platforms: ["Flutter"],
    requiredProperties: ["plan_id", "amount", "currency"],
    status: "released",
  },
];

export const analyticsMetricCards: StatusCard[] = [
  { label: "活跃用户", value: "18.4k", detail: "DAU 较昨日 +7.8%", tone: "green" },
  { label: "事件量", value: "2.7m", detail: "核心事件 19 个", tone: "blue" },
  { label: "漏斗转化", value: "42.6%", detail: "商品详情 -> 支付成功", tone: "purple" },
  { label: "D7 留存", value: "31.2%", detail: "较上周 -2.1%", tone: "red" },
];

export const analyticsTemplateItems: AnalyticsTemplateItem[] = [
  {
    title: "概览",
    description: "按项目查看 DAU、事件量、转化和留存摘要。",
    metric: "DAU / WAU / 核心事件量",
    filters: ["项目", "环境", "平台", "版本"],
  },
  {
    title: "事件趋势",
    description: "观察单个事件的次数、用户数、会话数和属性拆解。",
    metric: "event_count / unique_users",
    filters: ["事件", "时间粒度", "渠道", "国家"],
  },
  {
    title: "漏斗",
    description: "按固定步骤查看转化率、掉点和平均转化耗时。",
    metric: "step_conversion / dropoff",
    filters: ["漏斗", "平台", "活动", "版本"],
  },
  {
    title: "留存",
    description: "按首日行为和渠道查看 D1、D3、D7 cohort 留存。",
    metric: "D1 / D3 / D7 retention",
    filters: ["cohort", "渠道", "首日事件", "平台"],
  },
];

export const analyticsTrendItems: AnalyticsTrendItem[] = [
  {
    bucket: "05-10 00:00",
    eventName: "pay_button_click",
    environment: "prod",
    source: "web",
    eventCount: "12.4k",
    uniqueUsers: "7.8k",
  },
  {
    bucket: "05-10 00:00",
    eventName: "campaign_card_view",
    environment: "prod",
    source: "web",
    eventCount: "18.9k",
    uniqueUsers: "11.2k",
  },
  {
    bucket: "05-09 00:00",
    eventName: "subscription_success",
    environment: "prod",
    source: "flutter",
    eventCount: "3.1k",
    uniqueUsers: "3.1k",
  },
];

export const analyticsFunnelSteps: AnalyticsFunnelStep[] = [
  {
    step: "1",
    eventName: "product_detail_view",
    users: "12.8k",
    conversion: "100%",
  },
  {
    step: "2",
    eventName: "pay_button_click",
    users: "7.4k",
    conversion: "57.8%",
  },
  {
    step: "3",
    eventName: "checkout_submit",
    users: "5.2k",
    conversion: "40.6%",
  },
  {
    step: "4",
    eventName: "subscription_success",
    users: "3.1k",
    conversion: "24.2%",
  },
];

export const reportTemplateItems: ReportTemplateItem[] = [
  {
    type: "日报",
    cadence: "每天 09:30",
    description: "汇总项目活跃、事件质量、异常和增长建议。",
    inputs: ["overview", "event_validation_results", "raw_events"],
  },
  {
    type: "异常解释",
    cadence: "异常触发",
    description: "解释流量突变、Schema 异常和版本差异。",
    inputs: ["anomaly_window", "event_schema", "release_versions"],
  },
  {
    type: "漏斗掉点解释",
    cadence: "按需生成",
    description: "结合渠道、版本和属性拆解漏斗掉点原因。",
    inputs: ["funnel_steps", "dropoff_breakdown", "campaigns"],
  },
  {
    type: "版本对比",
    cadence: "发布后 24h",
    description: "比较新旧版本核心指标和异常事件。",
    inputs: ["app_version", "retention", "core_events"],
  },
];

export const reportTaskItems: ReportTaskItem[] = [
  {
    title: "Magic Frame 每日产品运营报告",
    owner: "Codex",
    status: "已排队",
    schedule: "明日 09:30",
  },
  {
    title: "spring_sale 活动转化解释",
    owner: "Codex",
    status: "生成中",
    schedule: "15 分钟内",
  },
  {
    title: "Flutter price 类型异常复盘",
    owner: "产品",
    status: "待确认",
    schedule: "今天",
  },
];

export const pageShells = {
  projects: {
    title: "项目",
    eyebrow: "Projects",
    description: "管理内部产品、环境、平台来源和 SDK 接入信息。",
    badge: "项目管理",
    actionLabel: "新建项目",
    sections: ["产品列表", "环境配置", "SDK Key", "接入状态"],
  },
  governance: {
    title: "埋点治理",
    eyebrow: "Tracking Governance",
    description: "统一管理埋点需求、事件字典、Schema 和验收状态。",
    badge: "治理工作台",
    actionLabel: "新建埋点需求",
    sections: ["埋点需求", "事件字典", "事件 Schema", "验收结果"],
  },
  analytics: {
    title: "分析",
    eyebrow: "Analytics",
    description: "查看产品指标、事件趋势、漏斗转化和留存表现。",
    badge: "分析工作台",
    actionLabel: "创建分析视图",
    sections: ["概览", "事件分析", "漏斗", "留存"],
  },
  reports: {
    title: "报告",
    eyebrow: "Reports",
    description: "沉淀日报、周报、异常解释、活动对比和版本分析。",
    badge: "Codex 报告",
    actionLabel: "生成报告",
    sections: ["日报", "周报", "异常解释", "版本对比"],
  },
  settings: {
    title: "设置",
    eyebrow: "Settings",
    description: "配置工作区、成员、环境、SDK Key 和数据保留策略。",
    badge: "系统设置",
    actionLabel: "管理成员",
    sections: ["工作区", "成员", "环境", "数据保留"],
  },
} satisfies Record<string, PageShell>;
