"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AnalyticsTrendItem } from "@/lib/trackinghub/types";

const eventTablePageSize = 10;

function clampedPage(page: number, totalPages: number) {
  return Math.min(totalPages, Math.max(1, Math.floor(page)));
}

export function AnalyticsEventTable({
  items,
}: {
  items: AnalyticsTrendItem[];
}) {
  const totalPages = Math.max(1, Math.ceil(items.length / eventTablePageSize));
  const [page, setPage] = useState(1);
  const currentPage = clampedPage(page, totalPages);
  const pageItems = useMemo(
    () =>
      items.slice(
        (currentPage - 1) * eventTablePageSize,
        currentPage * eventTablePageSize,
      ),
    [currentPage, items],
  );
  const startIndex =
    items.length > 0 ? (currentPage - 1) * eventTablePageSize + 1 : 0;
  const endIndex = Math.min(currentPage * eventTablePageSize, items.length);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          事件明细每页 {eventTablePageSize} 条，当前显示第 {startIndex} -{" "}
          {endIndex} 条，共 {items.length} 条。
        </p>
        {items.length > eventTablePageSize ? (
          <div className="text-sm text-muted-foreground">
            第 {currentPage} / {totalPages} 页
          </div>
        ) : null}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>时间</TableHead>
            <TableHead>事件</TableHead>
            <TableHead>环境</TableHead>
            <TableHead>平台</TableHead>
            <TableHead>事件量</TableHead>
            <TableHead>唯一用户</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems.map((item) => (
            <TableRow
              key={`${item.bucket}-${item.eventName}-${item.environment}-${item.source}`}
            >
              <TableCell className="font-mono text-xs">{item.bucket}</TableCell>
              <TableCell className="font-mono text-xs">
                {item.eventName}
              </TableCell>
              <TableCell>{item.environment}</TableCell>
              <TableCell>{item.source}</TableCell>
              <TableCell>{item.eventCount}</TableCell>
              <TableCell>{item.uniqueUsers}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {items.length > eventTablePageSize ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="text-sm text-muted-foreground">
            翻页只更新当前表格，不重新加载分析页。
          </div>
          <div className="flex items-center gap-2">
            <Button
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => clampedPage(value - 1, totalPages))}
              type="button"
              variant="outline"
            >
              上一页
            </Button>
            <Button
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => clampedPage(value + 1, totalPages))}
              type="button"
              variant="outline"
            >
              下一页
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
