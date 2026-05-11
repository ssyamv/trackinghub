import type { NavItem } from "./types";

export const navItems: NavItem[] = [
  { href: "/", label: "首页", description: "跨项目状态" },
  { href: "/projects", label: "项目", description: "产品与环境" },
  { href: "/governance", label: "埋点治理", description: "需求与事件字典" },
  { href: "/analytics", label: "分析", description: "指标与漏斗" },
  { href: "/reports", label: "报告", description: "日报与异常解释" },
  { href: "/settings", label: "设置", description: "成员与 SDK Key" },
];
