"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  applyEventDictionaryAction,
  type EditableEventDefinition,
  type EventDefinitionStatus,
} from "@/lib/trackinghub/event-dictionary-editor";

import { StatusBadge } from "./status-badge";

const STATUS_FLOW: EventDefinitionStatus[] = [
  "draft",
  "ready",
  "released",
  "accepted",
  "deprecated",
];

const STATUS_LABELS: Record<EventDefinitionStatus, string> = {
  draft: "草稿",
  ready: "待开发",
  released: "已发布",
  accepted: "已验收",
  deprecated: "已弃用",
};

function statusTone(status: EventDefinitionStatus) {
  if (status === "accepted") {
    return "success" as const;
  }

  if (status === "deprecated") {
    return "danger" as const;
  }

  return "warning" as const;
}

function nextStatus(status: EventDefinitionStatus) {
  const index = STATUS_FLOW.indexOf(status);
  return STATUS_FLOW[Math.min(index + 1, STATUS_FLOW.length - 1)];
}

function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function EventDictionaryEditor({
  definitions,
}: {
  definitions: EditableEventDefinition[];
}) {
  const [items, setItems] = useState(definitions);
  const [eventName, setEventName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [requiredProperties, setRequiredProperties] = useState("");
  const [platforms, setPlatforms] = useState("Web");

  const activeItems = useMemo(
    () => items.filter((item) => item.status !== "deprecated"),
    [items],
  );

  function addDefinition() {
    if (!eventName.trim() || !displayName.trim()) {
      return;
    }

    setItems((current) =>
      applyEventDictionaryAction(current, {
        type: "create",
        definition: {
          id: eventName.trim(),
          eventName: eventName.trim(),
          displayName: displayName.trim(),
          description: "通过管理后台新增的事件定义。",
          platforms: parseCsv(platforms),
          requiredProperties: parseCsv(requiredProperties),
          status: "draft",
        },
      }),
    );
    setEventName("");
    setDisplayName("");
    setRequiredProperties("");
    setPlatforms("Web");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl tracking-normal">事件字典编辑</CardTitle>
        <CardDescription>
          支持新增事件、编辑定义、维护必填属性、平台覆盖和状态流转；当前为前端本地编辑态，后续接入元数据 API。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-4 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <Input
            aria-label="事件名"
            onChange={(event) => setEventName(event.target.value)}
            placeholder="event_name"
            value={eventName}
          />
          <Input
            aria-label="显示名"
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="显示名"
            value={displayName}
          />
          <Input
            aria-label="必填属性"
            onChange={(event) => setRequiredProperties(event.target.value)}
            placeholder="必填属性，逗号分隔"
            value={requiredProperties}
          />
          <Input
            aria-label="平台覆盖"
            onChange={(event) => setPlatforms(event.target.value)}
            placeholder="平台覆盖"
            value={platforms}
          />
          <Button onClick={addDefinition} type="button">
            新增事件
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>事件定义</TableHead>
              <TableHead>平台覆盖</TableHead>
              <TableHead>必填属性</TableHead>
              <TableHead>状态流转</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeItems.map((definition) => (
              <TableRow key={definition.id}>
                <TableCell className="min-w-64 whitespace-normal">
                  <div className="font-semibold">{definition.displayName}</div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    {definition.eventName}
                  </div>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    {definition.description}
                  </p>
                </TableCell>
                <TableCell>{definition.platforms.join(" + ")}</TableCell>
                <TableCell className="whitespace-normal font-mono text-xs">
                  {definition.requiredProperties.join(", ")}
                </TableCell>
                <TableCell>
                  <StatusBadge tone={statusTone(definition.status)}>
                    {STATUS_LABELS[definition.status]}
                  </StatusBadge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() =>
                        setItems((current) =>
                          applyEventDictionaryAction(current, {
                            type: "update",
                            id: definition.id,
                            changes: {
                              displayName: `${definition.displayName}（编辑）`,
                            },
                          }),
                        )
                      }
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      编辑
                    </Button>
                    <Button
                      onClick={() =>
                        setItems((current) =>
                          applyEventDictionaryAction(current, {
                            type: "transition",
                            id: definition.id,
                            status: nextStatus(definition.status),
                          }),
                        )
                      }
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      下一状态
                    </Button>
                    <Button
                      onClick={() =>
                        setItems((current) =>
                          applyEventDictionaryAction(current, {
                            type: "delete",
                            id: definition.id,
                          }),
                        )
                      }
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      弃用
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
