"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AcceptanceTone } from "@/lib/trackinghub/types";
import type { EventDictionaryItem } from "@/lib/trackinghub/types";
import {
  buildEventDefinitionPatchPayload,
  type EditableEventDefinition,
  type EventDefinitionEditDraft,
} from "@/lib/trackinghub/event-dictionary-editor";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { StatusBadge } from "./status-badge";

export type GovernanceDictionaryFilters = {
  query: string;
  status: string;
  platform: "all" | "web" | "flutter";
  page: number;
  pageSize?: number;
};

type GovernanceEventDictionaryProps = {
  events: EventDictionaryItem[];
  editableDefinitions?: EditableEventDefinition[];
  initialFilters?: GovernanceDictionaryFilters;
  projectOptions?: { id: string; name: string }[];
  selectedProjectId?: string;
};

type EventDefinitionApiRecord = {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  displayName: string;
  description: string;
  triggerTiming: string;
  module: string;
  platforms: ("web" | "flutter")[];
  status: EditableEventDefinition["status"];
  requiredProperties: NonNullable<
    EditableEventDefinition["requiredPropertyDefinitions"]
  >;
  lastSeenAt: string | null;
};

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const DEFAULT_DICTIONARY_FILTERS: GovernanceDictionaryFilters = {
  page: 1,
  platform: "all",
  query: "",
  status: "all",
};
const MAX_PAGE_SIZE = 200;
const DEFINITION_STATUS_FLOW = [
  "draft",
  "ready",
  "released",
  "accepted",
  "deprecated",
] as const;
const STATUS_LABELS: Record<EditableEventDefinition["status"], string> = {
  draft: "草稿",
  ready: "待验收",
  released: "已发布",
  accepted: "已验收",
  deprecated: "已弃用",
};

function normalizedFilters(filters?: GovernanceDictionaryFilters) {
  return {
    ...DEFAULT_DICTIONARY_FILTERS,
    ...filters,
    page: Math.max(1, Math.floor(filters?.page ?? 1)),
    pageSize: Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Math.floor(filters?.pageSize ?? 25)),
    ),
    query: filters?.query.trim() ?? "",
  };
}

function matchesQuery(event: EventDictionaryItem, query: string) {
  if (!query) {
    return true;
  }

  const lowerQuery = query.toLowerCase();

  return [
    event.eventName,
    event.displayName,
    event.project,
    event.owner,
  ].some((value) => value.toLowerCase().includes(lowerQuery));
}

function matchesPlatform(
  event: EventDictionaryItem,
  platform: GovernanceDictionaryFilters["platform"],
) {
  if (platform === "all") {
    return true;
  }

  return event.platforms.toLowerCase().includes(platform);
}

function filterEvents(
  events: EventDictionaryItem[],
  filters: GovernanceDictionaryFilters,
) {
  return events.filter(
    (event) =>
      matchesQuery(event, filters.query) &&
      matchesPlatform(event, filters.platform) &&
      (filters.status === "all" || event.status === filters.status),
  );
}

function statusTone(status: string): AcceptanceTone {
  if (status === "accepted" || status === "已验收") {
    return "success";
  }

  if (status === "deprecated" || status === "已弃用") {
    return "danger";
  }

  return "warning";
}

function nextDefinitionStatus(status: EditableEventDefinition["status"]) {
  const index = DEFINITION_STATUS_FLOW.indexOf(status);

  if (index < 0) {
    return "ready";
  }

  return DEFINITION_STATUS_FLOW[
    Math.min(index + 1, DEFINITION_STATUS_FLOW.length - 1)
  ];
}

function statusFromLabel(status: string): EditableEventDefinition["status"] {
  if (status === "待验收") {
    return "ready";
  }

  if (status === "已发布") {
    return "released";
  }

  if (status === "已验收") {
    return "accepted";
  }

  if (status === "已弃用") {
    return "deprecated";
  }

  return "draft";
}

function sourceLabel(source: "web" | "flutter") {
  return source === "web" ? "Web" : "Flutter";
}

function sourceValue(label: string): "web" | "flutter" | null {
  const normalized = label.trim().toLowerCase();

  if (normalized === "web") {
    return "web";
  }

  if (normalized === "flutter") {
    return "flutter";
  }

  return null;
}

function platformLabels(platforms: EditableEventDefinition["platforms"]) {
  if (platforms.length === 0) {
    return "未配置";
  }

  return platforms.join(" + ");
}

function formatDateTime(value: string | null | undefined) {
  if (!value || value === "暂无") {
    return "暂无";
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);

  if (!match) {
    return value;
  }

  return `${match[2]}-${match[3]} ${match[4]}:${match[5]}`;
}

function createDraft(definition: EditableEventDefinition): EventDefinitionEditDraft {
  return {
    displayName: definition.displayName,
    description: definition.description,
    triggerTiming: definition.triggerTiming ?? "",
    module: definition.module ?? "",
    platforms: definition.platforms.join(", "),
    requiredProperties: definition.requiredProperties.join(", "),
    status: definition.status,
  };
}

function definitionFromEvent(
  event: EventDictionaryItem,
): EditableEventDefinition {
  return {
    id: event.id,
    eventName: event.eventName,
    displayName: event.displayName,
    description: "",
    module: event.owner === "未分配" ? "" : event.owner,
    platforms: event.platforms
      .split("+")
      .map((item) => item.trim())
      .filter(Boolean),
    requiredProperties: [],
    status: statusFromLabel(event.status),
  };
}

function definitionRecordToEditable(
  record: EventDefinitionApiRecord,
): EditableEventDefinition {
  return {
    id: record.id,
    eventName: record.name,
    displayName: record.displayName,
    description: record.description,
    triggerTiming: record.triggerTiming,
    module: record.module,
    platforms: record.platforms.map(sourceLabel),
    requiredProperties: record.requiredProperties.map((property) => property.name),
    requiredPropertyDefinitions: record.requiredProperties,
    status: record.status,
  };
}

function definitionRecordToEvent(
  record: EventDefinitionApiRecord,
): EventDictionaryItem {
  return {
    id: record.id,
    eventName: record.name,
    displayName: record.displayName,
    project: record.projectName,
    platforms: platformLabels(record.platforms.map(sourceLabel)),
    environment: "按环境验证",
    owner: record.module || "未分配",
    status: STATUS_LABELS[record.status],
    statusTone: statusTone(record.status),
    lastSeen: formatDateTime(record.lastSeenAt),
  };
}

function hasInvalidPlatforms(value: string) {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.some((item) => {
    const normalized = item.toLowerCase();

    return normalized !== "web" && normalized !== "flutter";
  });
}

function normalizedPageSize(value: string | number, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(parsed)));
}

function clampedPage(page: number, totalPages: number) {
  return Math.min(totalPages, Math.max(1, Math.floor(page)));
}

export function GovernanceEventDictionary({
  events,
  editableDefinitions = [],
  initialFilters,
  projectOptions = [],
  selectedProjectId = "",
}: GovernanceEventDictionaryProps) {
  const initial = normalizedFilters(initialFilters);
  const initialPageSize = initial.pageSize ?? 25;
  const defaultProjectId = selectedProjectId || projectOptions[0]?.id || "";
  const [query, setQuery] = useState(initial.query);
  const [status, setStatus] = useState(initial.status);
  const [platform, setPlatform] =
    useState<GovernanceDictionaryFilters["platform"]>(initial.platform);
  const [page, setPage] = useState(initial.page);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [pageSizeInput, setPageSizeInput] = useState(String(initialPageSize));
  const [jumpPage, setJumpPage] = useState(String(initial.page));
  const [localEvents, setLocalEvents] = useState(events);
  const [editableItems, setEditableItems] = useState(editableDefinitions);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EventDefinitionEditDraft | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createProjectId, setCreateProjectId] = useState(defaultProjectId);
  const [createFormDraft, setCreateFormDraft] = useState<EventDefinitionEditDraft>({
    displayName: "",
    description: "",
    triggerTiming: "",
    module: "",
    platforms: "Web",
    requiredProperties: "",
    status: "draft",
  });
  const [actionStatus, setActionStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [actionMessage, setActionMessage] = useState("");
  const definitionById = useMemo(
    () => new Map(editableItems.map((definition) => [definition.id, definition])),
    [editableItems],
  );
  const visibleEvents = useMemo(
    () =>
      localEvents.map((event) => {
        const definition = definitionById.get(event.id);

        if (!definition) {
          return event;
        }

        const statusLabel = STATUS_LABELS[definition.status];

        return {
          ...event,
          displayName: definition.displayName,
          owner: definition.module || "未分配",
          platforms: platformLabels(definition.platforms),
          status: statusLabel,
          statusTone: statusTone(definition.status),
        };
      }),
    [definitionById, localEvents],
  );
  const filteredEvents = useMemo(
    () =>
      filterEvents(visibleEvents, {
        page,
        pageSize,
        platform,
        query,
        status,
      }),
    [page, pageSize, platform, query, status, visibleEvents],
  );
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageEvents = filteredEvents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  function goToPage(nextPage: number) {
    const next = clampedPage(nextPage, totalPages);
    setPage(next);
    setJumpPage(String(next));
  }

  function returnToFirstPage() {
    setPage(1);
    setJumpPage("1");
  }

  function resetFilters() {
    setQuery("");
    setStatus("all");
    setPlatform("all");
    returnToFirstPage();
  }

  function applyPageSize() {
    const nextPageSize = normalizedPageSize(pageSizeInput, pageSize);

    setPageSize(nextPageSize);
    setPageSizeInput(String(nextPageSize));
    returnToFirstPage();
  }

  function applyJumpPage() {
    const parsed = Number(jumpPage);

    goToPage(Number.isFinite(parsed) ? parsed : currentPage);
  }

  function getEditableDefinition(event: EventDictionaryItem) {
    return definitionById.get(event.id) ?? definitionFromEvent(event);
  }

  function startEdit(event: EventDictionaryItem) {
    const definition = getEditableDefinition(event);

    setEditingId(definition.id);
    setEditDraft(createDraft(definition));
    setActionStatus("idle");
    setActionMessage("");
  }

  function updateDraft(changes: Partial<EventDefinitionEditDraft>) {
    setEditDraft((current) => (current ? { ...current, ...changes } : current));
  }

  function updateCreateDraft(changes: Partial<EventDefinitionEditDraft>) {
    setCreateFormDraft((current) => ({ ...current, ...changes }));
  }

  function resetCreateForm() {
    setCreateName("");
    setCreateProjectId(defaultProjectId);
    setCreateFormDraft({
      displayName: "",
      description: "",
      triggerTiming: "",
      module: "",
      platforms: "Web",
      requiredProperties: "",
      status: "draft",
    });
  }

  function startCreate() {
    resetCreateForm();
    setIsCreating(true);
    setEditingId(null);
    setEditDraft(null);
    setActionStatus("idle");
    setActionMessage("");
  }

  async function createDefinition() {
    if (!createProjectId) {
      setActionStatus("error");
      setActionMessage("请先选择项目。");
      return;
    }

    if (!createName.trim() || !createFormDraft.displayName.trim()) {
      setActionStatus("error");
      setActionMessage("事件名和展示名不能为空。");
      return;
    }

    if (hasInvalidPlatforms(createFormDraft.platforms)) {
      setActionStatus("error");
      setActionMessage("平台只支持 Web 或 Flutter，请用逗号分隔。");
      return;
    }

    const platforms = createFormDraft.platforms
      .split(",")
      .map(sourceValue)
      .filter((item): item is "web" | "flutter" => item !== null);
    const payload = {
      ...buildEventDefinitionPatchPayload(createFormDraft),
      projectId: createProjectId,
      name: createName.trim(),
      platforms,
    };

    setActionStatus("saving");
    setActionMessage("");

    const response = await fetch("/api/event-definitions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setActionStatus("error");
      setActionMessage("新增失败，请确认已登录且拥有编辑权限。");
      return;
    }

    const result = (await response.json()) as {
      data?: { definition?: EventDefinitionApiRecord };
    };
    const record = result.data?.definition;

    if (!record) {
      setActionStatus("error");
      setActionMessage("新增失败，服务端返回内容不完整。");
      return;
    }

    const nextDefinition = definitionRecordToEditable(record);
    const nextEvent = definitionRecordToEvent(record);

    setEditableItems((current) => [...current, nextDefinition]);
    setLocalEvents((current) => [nextEvent, ...current]);
    setIsCreating(false);
    resetCreateForm();
    setActionStatus("saved");
    setActionMessage("事件定义已新增。");
    returnToFirstPage();
  }

  async function persistDefinition(
    definition: EditableEventDefinition,
    draft: EventDefinitionEditDraft,
    options: { closeEditor?: boolean; successMessage: string },
  ) {
    if (!draft.displayName.trim()) {
      setActionStatus("error");
      setActionMessage("展示名不能为空。");
      return;
    }

    if (hasInvalidPlatforms(draft.platforms)) {
      setActionStatus("error");
      setActionMessage("平台只支持 Web 或 Flutter，请用逗号分隔。");
      return;
    }

    setActionStatus("saving");
    setActionMessage("");

    const payload = buildEventDefinitionPatchPayload(draft, definition);
    const response = await fetch(`/api/event-definitions/${definition.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setActionStatus("error");
      setActionMessage("保存失败，请确认已登录且拥有编辑权限。");
      return;
    }

    const nextDefinition: EditableEventDefinition = {
      ...definition,
      displayName: payload.displayName,
      description: payload.description,
      triggerTiming: payload.triggerTiming,
      module: payload.module,
      platforms: payload.platforms.map(sourceLabel),
      requiredProperties: payload.requiredProperties.map(
        (property) => property.name,
      ),
      requiredPropertyDefinitions: payload.requiredProperties,
      status: payload.status,
    };

    setEditableItems((current) => {
      const exists = current.some((item) => item.id === nextDefinition.id);

      if (!exists) {
        return [...current, nextDefinition];
      }

      return current.map((item) =>
        item.id === nextDefinition.id ? nextDefinition : item,
      );
    });
    setActionStatus("saved");
    setActionMessage(options.successMessage);

    if (options.closeEditor) {
      setEditingId(null);
      setEditDraft(null);
    } else {
      setEditDraft(createDraft(nextDefinition));
    }
  }

  async function saveEdit(event: EventDictionaryItem) {
    if (!editDraft) {
      return;
    }

    await persistDefinition(getEditableDefinition(event), editDraft, {
      closeEditor: true,
      successMessage: "事件定义已保存。",
    });
  }

  async function transitionStatus(event: EventDictionaryItem) {
    const definition = getEditableDefinition(event);
    const draft = {
      ...createDraft(definition),
      status: nextDefinitionStatus(definition.status),
    };

    await persistDefinition(definition, draft, {
      successMessage: "状态已更新。",
    });
  }

  async function deprecateDefinition(event: EventDictionaryItem) {
    const definition = getEditableDefinition(event);
    const draft = {
      ...createDraft(definition),
      status: "deprecated" as const,
    };

    await persistDefinition(definition, draft, {
      successMessage: "事件定义已弃用。",
    });
  }

  async function deleteDefinition(event: EventDictionaryItem) {
    const confirmed = window.confirm(
      `确认删除事件定义 ${event.eventName}？删除后需要重新创建才能恢复。`,
    );

    if (!confirmed) {
      return;
    }

    setActionStatus("saving");
    setActionMessage("");

    const response = await fetch(`/api/event-definitions/${event.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setActionStatus("error");
      setActionMessage("删除失败，请确认已登录且拥有编辑权限。");
      return;
    }

    setLocalEvents((current) => current.filter((item) => item.id !== event.id));
    setEditableItems((current) =>
      current.filter((item) => item.id !== event.id),
    );
    setEditingId((current) => (current === event.id ? null : current));
    setEditDraft(null);
    setActionStatus("saved");
    setActionMessage("事件定义已删除。");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-xl tracking-normal">事件字典</CardTitle>
        <Button onClick={startCreate} type="button">
          <Plus data-icon="inline-start" />
          新增事件
        </Button>
      </CardHeader>
      <CardContent>
            <div className="space-y-4">
            {isCreating ? (
              <form
                className="grid gap-3 rounded-lg border border-border bg-background p-3 md:grid-cols-2 xl:grid-cols-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void createDefinition();
                }}
              >
                <label className="grid gap-1.5 text-sm font-medium">
                  <span>所属项目</span>
                  <select
                    className={selectClassName}
                    onChange={(event) => setCreateProjectId(event.target.value)}
                    value={createProjectId}
                  >
                    {projectOptions.length > 0 ? (
                      projectOptions.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))
                    ) : (
                      <option value="">暂无可选项目</option>
                    )}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  <span>事件名</span>
                  <Input
                    aria-label="事件名"
                    onChange={(event) => setCreateName(event.target.value)}
                    placeholder="event_name"
                    value={createName}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  <span>展示名</span>
                  <Input
                    aria-label="展示名"
                    onChange={(event) =>
                      updateCreateDraft({ displayName: event.target.value })
                    }
                    placeholder="例如 提交订单"
                    value={createFormDraft.displayName}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  <span>负责模块</span>
                  <Input
                    onChange={(event) =>
                      updateCreateDraft({ module: event.target.value })
                    }
                    placeholder="例如 checkout"
                    value={createFormDraft.module}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  <span>平台覆盖</span>
                  <Input
                    onChange={(event) =>
                      updateCreateDraft({ platforms: event.target.value })
                    }
                    placeholder="Web, Flutter"
                    value={createFormDraft.platforms}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  <span>状态</span>
                  <select
                    className={selectClassName}
                    onChange={(event) =>
                      updateCreateDraft({
                        status: event.target
                          .value as EditableEventDefinition["status"],
                      })
                    }
                    value={createFormDraft.status}
                  >
                    <option value="draft">草稿</option>
                    <option value="ready">待验收</option>
                    <option value="released">已发布</option>
                    <option value="accepted">已验收</option>
                    <option value="deprecated">已弃用</option>
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium xl:col-span-2">
                  <span>必填属性</span>
                  <Input
                    aria-label="必填属性"
                    onChange={(event) =>
                      updateCreateDraft({
                        requiredProperties: event.target.value,
                      })
                    }
                    placeholder="user_id, product_id"
                    value={createFormDraft.requiredProperties}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium xl:col-span-2">
                  <span>触发时机</span>
                  <Input
                    onChange={(event) =>
                      updateCreateDraft({ triggerTiming: event.target.value })
                    }
                    placeholder="例如 点击提交订单按钮"
                    value={createFormDraft.triggerTiming}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium md:col-span-2 xl:col-span-4">
                  <span>说明</span>
                  <textarea
                    className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    onChange={(event) =>
                      updateCreateDraft({ description: event.target.value })
                    }
                    value={createFormDraft.description}
                  />
                </label>
                <div className="flex flex-wrap items-center gap-2 md:col-span-2 xl:col-span-4">
                  <Button
                    disabled={actionStatus === "saving"}
                    onClick={() => void createDefinition()}
                    type="button"
                  >
                    <Save data-icon="inline-start" />
                    {actionStatus === "saving" ? "保存中" : "保存新增"}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsCreating(false);
                      resetCreateForm();
                      setActionStatus("idle");
                      setActionMessage("");
                    }}
                    type="button"
                    variant="outline"
                  >
                    <X data-icon="inline-start" />
                    取消
                  </Button>
                </div>
              </form>
            ) : null}

            <form
              className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3 md:grid-cols-[minmax(220px,1.5fr)_minmax(140px,0.6fr)_minmax(140px,0.6fr)_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                returnToFirstPage();
              }}
            >
              <label className="grid gap-1.5 text-sm font-medium text-foreground">
                <span>搜索事件</span>
                <Input
                  name="q"
                  onChange={(event) => {
                    setQuery(event.target.value);
                    returnToFirstPage();
                  }}
                  placeholder="事件名、展示名、项目或负责人"
                  value={query}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-foreground">
                <span>状态</span>
                <select
                  className={selectClassName}
                  name="status"
                  onChange={(event) => {
                    setStatus(event.target.value);
                    returnToFirstPage();
                  }}
                  value={status}
                >
                  <option value="all">全部状态</option>
                  <option value="草稿">草稿</option>
                  <option value="待验收">待验收</option>
                  <option value="已发布">已发布</option>
                  <option value="已验收">已验收</option>
                  <option value="已弃用">已弃用</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-foreground">
                <span>平台</span>
                <select
                  className={selectClassName}
                  name="platform"
                  onChange={(event) => {
                    setPlatform(
                      event.target.value === "web" ||
                        event.target.value === "flutter"
                        ? event.target.value
                        : "all",
                    );
                    returnToFirstPage();
                  }}
                  value={platform}
                >
                  <option value="all">全部平台</option>
                  <option value="web">Web</option>
                  <option value="flutter">Flutter</option>
                </select>
              </label>
              <div className="flex items-end gap-2">
                <Button type="submit">
                  <Search data-icon="inline-start" />
                  筛选
                </Button>
                <Button onClick={resetFilters} type="button" variant="outline">
                  <RotateCcw data-icon="inline-start" />
                  重置
                </Button>
              </div>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>
                共 {filteredEvents.length} 条匹配 · 第 {currentPage} /{" "}
                {totalPages} 页
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <form
                  className="flex items-center gap-1.5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    applyPageSize();
                  }}
                >
                  <label
                    className="text-xs font-medium text-muted-foreground"
                    htmlFor="event-dictionary-page-size"
                  >
                    每页
                  </label>
                  <Input
                    aria-label="每页条数"
                    className="h-8 w-20"
                    id="event-dictionary-page-size"
                    inputMode="numeric"
                    name="page_size"
                    onChange={(event) => setPageSizeInput(event.target.value)}
                    onBlur={applyPageSize}
                    pattern="[0-9]*"
                    type="text"
                    value={pageSizeInput}
                  />
                  <Button type="submit" variant="outline">
                    应用
                  </Button>
                </form>
                <Button
                  className="h-8 gap-1.5 px-2.5"
                  disabled={currentPage <= 1}
                  onClick={() => goToPage(currentPage - 1)}
                  type="button"
                  variant="outline"
                >
                  <ChevronLeft className="size-4" />
                  上一页
                </Button>
                <Button
                  className="h-8 gap-1.5 px-2.5"
                  disabled={currentPage >= totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                  type="button"
                  variant="outline"
                >
                  下一页
                  <ChevronRight className="size-4" />
                </Button>
                <form
                  className="flex items-center gap-1.5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    applyJumpPage();
                  }}
                >
                  <label
                    className="text-xs font-medium text-muted-foreground"
                    htmlFor="event-dictionary-jump-page"
                  >
                    跳至
                  </label>
                  <Input
                    aria-label="跳转页码"
                    className="h-8 w-20"
                    id="event-dictionary-jump-page"
                    inputMode="numeric"
                    name="target_page"
                    onChange={(event) => setJumpPage(event.target.value)}
                    pattern="[0-9]*"
                    type="text"
                    value={jumpPage}
                  />
                  <Button type="submit" variant="outline">
                    跳页
                  </Button>
                </form>
              </div>
            </div>
            {actionMessage ? (
              <div
                className={
                  actionStatus === "error"
                    ? "rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                    : "rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground"
                }
                role={actionStatus === "error" ? "alert" : "status"}
              >
                {actionMessage}
              </div>
            ) : null}

            {pageEvents.length > 0 ? (
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
                    <TableHead className="w-24 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageEvents.map((event) => (
                    <Fragment key={event.id}>
                      <TableRow>
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
                          <StatusBadge tone={event.statusTone}>
                            {event.status}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                aria-label={`操作 ${event.eventName}`}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                操作
                                <MoreHorizontal data-icon="inline-end" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => startEdit(event)}>
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => void transitionStatus(event)}
                              >
                                下一状态
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => void deprecateDefinition(event)}
                                variant="destructive"
                              >
                                弃用
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => void deleteDefinition(event)}
                                variant="destructive"
                              >
                                <Trash2 data-icon="inline-start" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      {editingId === event.id && editDraft ? (
                        <TableRow>
                          <TableCell className="bg-muted/20" colSpan={8}>
                            <form
                              className="grid gap-3 py-2 md:grid-cols-2 xl:grid-cols-4"
                              onSubmit={(formEvent) => {
                                formEvent.preventDefault();
                                void saveEdit(event);
                              }}
                            >
                              <label className="grid gap-1.5 text-sm font-medium">
                                <span>展示名</span>
                                <Input
                                  onChange={(inputEvent) =>
                                    updateDraft({
                                      displayName: inputEvent.target.value,
                                    })
                                  }
                                  value={editDraft.displayName}
                                />
                              </label>
                              <label className="grid gap-1.5 text-sm font-medium">
                                <span>负责模块</span>
                                <Input
                                  onChange={(inputEvent) =>
                                    updateDraft({ module: inputEvent.target.value })
                                  }
                                  placeholder="例如 checkout"
                                  value={editDraft.module}
                                />
                              </label>
                              <label className="grid gap-1.5 text-sm font-medium">
                                <span>平台覆盖</span>
                                <Input
                                  onChange={(inputEvent) =>
                                    updateDraft({
                                      platforms: inputEvent.target.value,
                                    })
                                  }
                                  placeholder="Web, Flutter"
                                  value={editDraft.platforms}
                                />
                              </label>
                              <label className="grid gap-1.5 text-sm font-medium">
                                <span>状态</span>
                                <select
                                  className={selectClassName}
                                  onChange={(inputEvent) =>
                                    updateDraft({
                                      status: inputEvent.target
                                        .value as EditableEventDefinition["status"],
                                    })
                                  }
                                  value={editDraft.status}
                                >
                                  <option value="draft">草稿</option>
                                  <option value="ready">待验收</option>
                                  <option value="released">已发布</option>
                                  <option value="accepted">已验收</option>
                                  <option value="deprecated">已弃用</option>
                                </select>
                              </label>
                              <label className="grid gap-1.5 text-sm font-medium xl:col-span-2">
                                <span>必填属性</span>
                                <Input
                                  onChange={(inputEvent) =>
                                    updateDraft({
                                      requiredProperties: inputEvent.target.value,
                                    })
                                  }
                                  placeholder="user_id, product_id"
                                  value={editDraft.requiredProperties}
                                />
                              </label>
                              <label className="grid gap-1.5 text-sm font-medium xl:col-span-2">
                                <span>触发时机</span>
                                <Input
                                  onChange={(inputEvent) =>
                                    updateDraft({
                                      triggerTiming: inputEvent.target.value,
                                    })
                                  }
                                  value={editDraft.triggerTiming}
                                />
                              </label>
                              <label className="grid gap-1.5 text-sm font-medium md:col-span-2 xl:col-span-4">
                                <span>说明</span>
                                <textarea
                                  className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                  onChange={(inputEvent) =>
                                    updateDraft({
                                      description: inputEvent.target.value,
                                    })
                                  }
                                  value={editDraft.description}
                                />
                              </label>
                              <div className="flex flex-wrap items-center gap-2 md:col-span-2 xl:col-span-4">
                                <Button
                                  disabled={actionStatus === "saving"}
                                  type="submit"
                                >
                                  <Save data-icon="inline-start" />
                                  {actionStatus === "saving"
                                    ? "保存中"
                                    : "保存编辑"}
                                </Button>
                                <Button
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditDraft(null);
                                    setActionStatus("idle");
                                    setActionMessage("");
                                  }}
                                  type="button"
                                  variant="outline"
                                >
                                  <X data-icon="inline-start" />
                                  取消
                                </Button>
                              </div>
                            </form>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                当前筛选条件下没有事件定义。
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
