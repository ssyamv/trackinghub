import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function CodexSummaryCard({ items }: { items: string[] }) {
  return (
    <Card className="bg-foreground text-background">
      <CardHeader>
        <p className="text-xs font-bold uppercase leading-4 text-background/70">
          Codex Summary
        </p>
        <CardTitle className="text-xl font-bold leading-7 tracking-normal">
          分析摘要
        </CardTitle>
        <CardDescription className="text-background/80">
          事件质量整体健康。当前发布批次验收前，建议优先补齐活动 payload 在 Web
          与 Flutter 两端的一致性。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3">
          {items.map((item) => (
            <li
              className="rounded-lg border border-background/10 bg-background/10 px-3 py-3 text-sm leading-5"
              key={item}
            >
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-5 rounded-lg bg-background/10 p-4 font-mono text-[13px] leading-6">
          <p>track(&quot;campaign_card_view&quot;, {"{"}</p>
          <p className="pl-4 text-background/80">platform: &quot;web&quot;,</p>
          <p className="pl-4 text-background/80">env: &quot;prod&quot;</p>
          <p>{"}"});</p>
        </div>
      </CardContent>
    </Card>
  );
}
