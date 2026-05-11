import type { ReportTemplateItem } from "./types";

export const reportTemplateItems: ReportTemplateItem[] = [
  {
    type: "日报",
    cadence: "按需生成",
    description: "基于当前筛选范围的真实 ClickHouse 查询结果生成。",
    inputs: ["overview", "event_validation_results", "raw_events"],
  },
  {
    type: "异常解释",
    cadence: "按需生成",
    description: "解释真实验证结果中的 Schema 异常和事件质量问题。",
    inputs: ["event_validation_results", "event_schema"],
  },
  {
    type: "漏斗掉点解释",
    cadence: "按需生成",
    description: "结合当前漏斗步骤和真实趋势结果定位最大掉点。",
    inputs: ["funnel_steps", "raw_events"],
  },
];
