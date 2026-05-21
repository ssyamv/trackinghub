import type { PageShell } from "./types";

export const pageShells = {
  projects: {
    title: "项目",
    eyebrow: "Projects",
    badge: "项目管理",
    actionLabel: "新建项目",
    sections: ["产品列表", "环境配置", "SDK Key", "接入状态"],
  },
  governance: {
    title: "埋点治理",
    eyebrow: "Tracking Governance",
    badge: "治理工作台",
    actionLabel: "新建埋点需求",
    sections: ["埋点需求", "事件字典", "事件 Schema", "验收结果"],
  },
  analytics: {
    title: "分析",
    eyebrow: "Analytics",
    badge: "分析工作台",
    actionLabel: "创建分析视图",
    sections: ["概览", "事件分析", "漏斗", "留存"],
  },
  reports: {
    title: "报告",
    eyebrow: "Reports",
    badge: "Codex 报告",
    actionLabel: "生成日报",
    sections: ["日报草稿", "报告记录"],
  },
  logs: {
    title: "日志",
    eyebrow: "Logs",
    badge: "诊断日志",
    actionLabel: "查询日志",
    sections: ["日志概览", "级别分布", "最近日志"],
  },
  settings: {
    title: "设置",
    eyebrow: "Settings",
    badge: "系统设置",
    actionLabel: "管理成员",
    sections: ["工作区", "成员", "环境", "数据保留"],
  },
} satisfies Record<string, PageShell>;
