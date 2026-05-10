import {
  Card,
  CardContent,
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
import type { AcceptanceItem } from "@/lib/trackinghub/sample-data";

import { StatusBadge } from "./status-badge";

export function AcceptanceTable({ items }: { items: AcceptanceItem[] }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border">
        <div>
          <p className="text-xs font-bold uppercase leading-4 text-muted-foreground">
            Acceptance
          </p>
          <CardTitle className="mt-1 text-xl font-bold leading-7 tracking-normal">
            待验收埋点
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div
          aria-label="移动端待验收埋点列表"
          className="divide-y divide-border md:hidden"
        >
          {items.map((item) => (
            <div
              className="space-y-3 p-4"
              key={`${item.project}-${item.event}-${item.source}-${item.environment}-mobile`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-mono text-sm font-semibold leading-5 text-foreground">
                    {item.event}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    {item.project}
                  </p>
                </div>
                <StatusBadge className="shrink-0" tone={item.tone}>
                  {item.status}
                </StatusBadge>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase leading-4 text-muted-foreground">
                    来源
                  </dt>
                  <dd className="mt-1 text-foreground">{item.source}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase leading-4 text-muted-foreground">
                    环境
                  </dt>
                  <dd className="mt-1 text-foreground">{item.environment}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
        <Table className="hidden md:table">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">事件</TableHead>
              <TableHead>来源</TableHead>
              <TableHead>环境</TableHead>
              <TableHead className="pr-4">状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={`${item.project}-${item.event}-${item.source}-${item.environment}`}
              >
                <TableCell className="min-w-48 max-w-[28rem] whitespace-normal pl-4 align-top">
                  <p className="whitespace-normal break-words font-mono text-sm font-semibold leading-5 text-foreground">
                    {item.event}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    {item.project}
                  </p>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.source}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.environment}
                </TableCell>
                <TableCell className="pr-4">
                  <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
