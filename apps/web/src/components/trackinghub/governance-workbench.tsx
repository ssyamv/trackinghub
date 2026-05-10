import { Badge } from "@/components/ui/badge";
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
  EventDictionaryItem,
  FeaturedEventDetail,
  GovernanceAcceptanceCheck,
  StatusCard,
} from "@/lib/trackinghub/sample-data";
import { MetricCard } from "./metric-card";
import { StatusBadge } from "./status-badge";

export type GovernanceWorkbenchProps = {
  summaryCards: StatusCard[];
  events: EventDictionaryItem[];
  eventDetail: FeaturedEventDetail;
  acceptanceChecks: GovernanceAcceptanceCheck[];
};

export function GovernanceWorkbench({
  summaryCards,
  events,
  eventDetail,
  acceptanceChecks,
}: GovernanceWorkbenchProps) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => (
          <MetricCard
            detail={item.detail}
            key={item.label}
            label={item.label}
            tone={item.tone}
            value={item.value}
          />
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl tracking-normal">事件字典</CardTitle>
          <CardDescription>
            产品、运营和工程共用的事件定义视图，先确认语义、平台覆盖和验收状态。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>事件</TableHead>
                <TableHead>项目</TableHead>
                <TableHead>平台</TableHead>
                <TableHead>环境</TableHead>
                <TableHead>负责人</TableHead>
                <TableHead>最近接收</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.eventName}>
                  <TableCell className="min-w-56 whitespace-normal">
                    <div className="font-semibold text-foreground">
                      {event.displayName}
                    </div>
                    <div className="mt-1 break-all font-mono text-xs text-muted-foreground">
                      {event.eventName}
                    </div>
                  </TableCell>
                  <TableCell>{event.project}</TableCell>
                  <TableCell>{event.platforms}</TableCell>
                  <TableCell>{event.environment}</TableCell>
                  <TableCell>{event.owner}</TableCell>
                  <TableCell>{event.lastSeen}</TableCell>
                  <TableCell>
                    <StatusBadge tone={event.statusTone}>{event.status}</StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <Badge className="w-fit" variant="secondary">
              重点事件
            </Badge>
            <CardTitle className="text-xl tracking-normal">
              {eventDetail.displayName}
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              {eventDetail.eventName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-muted-foreground">
                  业务目标
                </div>
                <p className="mt-2 text-sm leading-6">{eventDetail.businessGoal}</p>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground">
                  触发时机
                </div>
                <p className="mt-2 text-sm leading-6">{eventDetail.triggerTiming}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {eventDetail.platforms.map((platform) => (
                <Badge key={platform} variant="outline">
                  {platform}
                </Badge>
              ))}
            </div>
            <div>
              <div className="mb-3 text-sm font-semibold">必填属性</div>
              <div className="grid gap-3 md:grid-cols-2">
                {eventDetail.requiredProperties.map((property) => (
                  <div
                    className="rounded-lg border border-border bg-muted/30 p-3"
                    key={property.name}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="break-all font-mono text-sm font-semibold">
                        {property.name}
                      </span>
                      <Badge variant="secondary">{property.type}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {property.description}
                    </p>
                    <div className="mt-2 font-mono text-xs text-muted-foreground">
                      示例：{property.example}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">验收检查</CardTitle>
            <CardDescription>
              用最近接收结果对照事件定义，标记工程需要处理的差异。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {acceptanceChecks.map((check) => (
              <div
                className="rounded-lg border border-border bg-background p-4"
                key={check.label}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold">{check.label}</div>
                  <StatusBadge className="shrink-0" tone={check.tone}>
                    {check.tone === "success"
                      ? "通过"
                      : check.tone === "warning"
                        ? "待确认"
                        : "需修复"}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {check.detail}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
