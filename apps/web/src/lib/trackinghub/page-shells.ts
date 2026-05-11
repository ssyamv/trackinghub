import type { PageShell } from "./types";

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
