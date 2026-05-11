import type { AnalyticsTemplateItem } from "./types";

export const analyticsTemplateItems: AnalyticsTemplateItem[] = [
  {
    title: "概览",
    description: "按项目查看活跃用户、事件量、异常占比和最近接收时间。",
    metric: "active_users / event_count / invalid_rate",
    filters: ["项目", "环境", "平台", "事件"],
  },
  {
    title: "事件趋势",
    description: "观察单个事件的次数、用户数和环境来源拆解。",
    metric: "event_count / unique_users",
    filters: ["事件", "时间粒度", "环境", "平台"],
  },
  {
    title: "漏斗",
    description: "按查询中指定的事件步骤计算逐步转化。",
    metric: "step_conversion / dropoff",
    filters: ["漏斗步骤", "项目", "环境", "平台"],
  },
  {
    title: "留存",
    description: "预留为后续 cohort 查询模板，不展示未接入的结果。",
    metric: "cohort_retention",
    filters: ["cohort", "项目", "平台", "时间范围"],
  },
];
