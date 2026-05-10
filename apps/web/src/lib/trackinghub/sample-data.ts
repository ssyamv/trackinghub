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
