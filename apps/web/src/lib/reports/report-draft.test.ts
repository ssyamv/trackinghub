import { describe, expect, it } from "vitest";

import type { ReportPreviewData } from "./report-preview";
import {
  buildDailyReportSavePayload,
  buildDailyReportDraftHref,
  generateDailyReportDraft,
  shouldGenerateDailyReportDraft,
} from "./report-draft";

const preview: ReportPreviewData = {
  source: "clickhouse",
  rangeLabel: "最近 7 天",
  filters: {
    projectId: "magic_frame",
    environment: "prod",
    source: "web",
    eventName: undefined,
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
    fromStep: "1",
    fromEventName: "product_detail_view",
    toStep: "2",
    toEventName: "pay_button_click",
    dropoff: "20.0%",
    conversion: "80.0%",
  },
};

describe("generateDailyReportDraft", () => {
  it("builds a deterministic Chinese daily report draft from preview data", () => {
    const draft = generateDailyReportDraft(preview);

    expect(draft.title).toBe("magic_frame / prod / web 日报草稿");
    expect(draft.summary).toContain("最近 7 天");
    expect(draft.summary).toContain("事件量 2.7k");
    expect(draft.highlights).toEqual([
      "事件量：2.7k（最近 7 天接收事件）",
      "活跃用户：184（最近 7 天去重用户）",
      "异常占比：15.0%（3 / 20 条验证异常）",
    ]);
    expect(draft.trendExplanation).toBe(
      "趋势重点：05-10 00:00 的 pay_button_click 事件量 120，唯一用户 88，是本次草稿优先解释的变化入口。",
    );
    expect(draft.funnelExplanation).toBe(
      "漏斗掉点：Step 1 product_detail_view 到 Step 2 pay_button_click 掉点 20.0%，当前转化 80.0%，建议优先拆解页面入口、渠道、版本和关键属性。",
    );
    expect(draft.nextActions).toEqual([
      "复核异常样本，确认是否由 Schema、版本或渠道流量变化导致。",
      "围绕 pay_button_click 补充渠道、版本、页面来源维度拆解。",
      "针对 product_detail_view -> pay_button_click 最大掉点补充漏斗解释。",
    ]);
  });

  it("preserves report filters when building the draft action href", () => {
    expect(buildDailyReportDraftHref(preview)).toBe(
      "/reports?project_id=magic_frame&environment=prod&source=web&funnel_steps=product_detail_view%2Cpay_button_click%2Ccheckout_submit&range=7d&granularity=day&report_action=daily_draft",
    );
  });

  it("accepts only the daily draft action flag", () => {
    expect(shouldGenerateDailyReportDraft({ report_action: "daily_draft" })).toBe(
      true,
    );
    expect(shouldGenerateDailyReportDraft({ report_action: "other" })).toBe(false);
    expect(shouldGenerateDailyReportDraft({})).toBe(false);
  });

  it("builds a report save payload only when project_id is scoped", () => {
    const draft = generateDailyReportDraft(preview);

    expect(buildDailyReportSavePayload(preview, draft)).toEqual({
      projectId: "magic_frame",
      type: "daily",
      title: "magic_frame / prod / web 日报草稿",
      content: [
        "最近 7 天内，事件量 2.7k，活跃用户 184，异常占比 15.0%。",
        "",
        "指标摘要：",
        "- 事件量：2.7k（最近 7 天接收事件）",
        "- 活跃用户：184（最近 7 天去重用户）",
        "- 异常占比：15.0%（3 / 20 条验证异常）",
        "",
        "解释草稿：",
        "趋势重点：05-10 00:00 的 pay_button_click 事件量 120，唯一用户 88，是本次草稿优先解释的变化入口。",
        "漏斗掉点：Step 1 product_detail_view 到 Step 2 pay_button_click 掉点 20.0%，当前转化 80.0%，建议优先拆解页面入口、渠道、版本和关键属性。",
        "",
        "建议下一步：",
        "- 复核异常样本，确认是否由 Schema、版本或渠道流量变化导致。",
        "- 围绕 pay_button_click 补充渠道、版本、页面来源维度拆解。",
        "- 针对 product_detail_view -> pay_button_click 最大掉点补充漏斗解释。",
      ].join("\n"),
      sourceQueryRefs: [
        {
          dataSource: "clickhouse",
          range: "7d",
          granularity: "day",
          environment: "prod",
          source: "web",
          eventName: undefined,
          funnelSteps: [
            "product_detail_view",
            "pay_button_click",
            "checkout_submit",
          ],
        },
      ],
    });

    expect(
      buildDailyReportSavePayload(
        {
          ...preview,
          filters: {
            ...preview.filters,
            projectId: undefined,
          },
        },
        draft,
      ),
    ).toBeNull();
  });
});
