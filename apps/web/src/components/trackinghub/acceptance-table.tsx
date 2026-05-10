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
        <Table>
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
              <TableRow key={`${item.project}-${item.event}`}>
                <TableCell className="min-w-64 pl-4">
                  <p className="break-all font-mono text-sm font-semibold leading-5 text-foreground">
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
