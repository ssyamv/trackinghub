import { AppShell } from "@/components/trackinghub/app-shell";
import { AcceptanceTable } from "@/components/trackinghub/acceptance-table";
import { CodexSummaryCard } from "@/components/trackinghub/codex-summary-card";
import { MetricCard } from "@/components/trackinghub/metric-card";
import { PageHeader } from "@/components/trackinghub/page-header";
import { Button } from "@/components/ui/button";
import {
  acceptanceItems,
  reportItems,
  statusCards,
} from "@/lib/trackinghub/sample-data";

export default function Home() {
  return (
    <AppShell activeHref="/">
      <PageHeader
        eyebrow="跨项目状态"
        title="把埋点定义、接入验收和产品分析放在同一张工作台。"
        description="面向产品、运营、研发的内部分析平台，以事件字典为中心同步 Web 与 Flutter 数据契约。"
        actions={
          <>
            <Button type="button" variant="outline">
              新建需求
            </Button>
            <Button type="button">接收事件</Button>
          </>
        }
      />

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statusCards.map((card) => (
          <MetricCard
            detail={card.detail}
            key={card.label}
            label={card.label}
            tone={card.tone}
            value={card.value}
          />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <AcceptanceTable items={acceptanceItems} />
        <CodexSummaryCard items={reportItems} />
      </div>
    </AppShell>
  );
}
