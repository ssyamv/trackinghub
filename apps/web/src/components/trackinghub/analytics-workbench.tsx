import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AnalyticsFunnelStep,
  AnalyticsTemplateItem,
  StatusCard,
} from "@/lib/trackinghub/sample-data";

import { MetricCard } from "./metric-card";

export function AnalyticsWorkbench({
  metrics,
  templates,
  funnelSteps,
}: {
  metrics: StatusCard[];
  templates: AnalyticsTemplateItem[];
  funnelSteps: AnalyticsFunnelStep[];
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard
            detail={metric.detail}
            key={metric.label}
            label={metric.label}
            tone={metric.tone}
            value={metric.value}
          />
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl tracking-normal">分析模板</CardTitle>
          <CardDescription>
            MVP 优先提供固定模板，覆盖概览、事件趋势、漏斗和留存。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {templates.map((template) => (
              <div
                className="rounded-lg border border-border bg-background p-4"
                key={template.title}
              >
                <div className="text-base font-semibold">{template.title}</div>
                <p className="mt-2 min-h-16 text-sm leading-6 text-muted-foreground">
                  {template.description}
                </p>
                <div className="mt-3 font-mono text-xs text-muted-foreground">
                  {template.metric}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {template.filters.map((filter) => (
                    <span
                      className="rounded-md bg-muted px-2 py-1 text-xs"
                      key={filter}
                    >
                      {filter}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl tracking-normal">漏斗步骤</CardTitle>
          <CardDescription>
            当前示例：商品详情页到订阅成功，用于检查核心商业化转化。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>步骤</TableHead>
                <TableHead>事件</TableHead>
                <TableHead>用户数</TableHead>
                <TableHead>转化率</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funnelSteps.map((step) => (
                <TableRow key={step.step}>
                  <TableCell>{step.step}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {step.eventName}
                  </TableCell>
                  <TableCell>{step.users}</TableCell>
                  <TableCell>{step.conversion}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
