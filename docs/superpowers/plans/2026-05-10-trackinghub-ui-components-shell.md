# TrackingHub UI Components Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Introduce shadcn/ui into TrackingHub Web, split the current dashboard into reusable components, and add consistent page shells for the main admin routes.

**Architecture:** Keep Next.js App Router as the routing layer. Use shadcn-generated files under `apps/web/src/components/ui` as local source components, and keep TrackingHub-specific composition under `apps/web/src/components/trackinghub`. Move static dashboard and navigation data into `apps/web/src/lib/trackinghub/sample-data.ts` so pages assemble data and components instead of owning large JSX blocks.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Vitest, React server rendering tests.

---

## Scope

This plan implements UI structure only. It does not add auth, live database reads, ClickHouse analytics queries, report generation jobs, or editing workflows.

The current worktree already has uncommitted UI changes in `apps/web/README.md`, `apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`, `package.json`, and `packages/flutter-sdk/pubspec.yaml`, plus an untracked root `AGENTS.md`. Treat them as existing user/agent work and preserve them. Do not revert those files.

## File Structure

- `apps/web/components.json`: shadcn project configuration for the web app.
- `apps/web/src/lib/utils.ts`: shadcn `cn()` helper.
- `apps/web/src/components/ui/*`: shadcn-generated source components.
- `apps/web/src/lib/trackinghub/sample-data.ts`: static navigation, dashboard, table, summary, and page shell data.
- `apps/web/src/lib/trackinghub/sample-data.test.ts`: data contract tests for routes and dashboard content.
- `apps/web/src/components/trackinghub/page-header.tsx`: shared page title and action region.
- `apps/web/src/components/trackinghub/empty-page-state.tsx`: shared page-shell empty state.
- `apps/web/src/components/trackinghub/status-badge.tsx`: status-to-badge mapping.
- `apps/web/src/components/trackinghub/metric-card.tsx`: dashboard metric card.
- `apps/web/src/components/trackinghub/acceptance-table.tsx`: dashboard acceptance table.
- `apps/web/src/components/trackinghub/codex-summary-card.tsx`: dashboard Codex summary card.
- `apps/web/src/components/trackinghub/app-sidebar.tsx`: TrackingHub navigation sidebar.
- `apps/web/src/components/trackinghub/app-shell.tsx`: shared admin shell layout.
- `apps/web/src/components/trackinghub/page-shell.tsx`: reusable content shell for non-home pages.
- `apps/web/src/components/trackinghub/components.test.tsx`: rendering tests for core TrackingHub components.
- `apps/web/src/app/page.tsx`: refactored home dashboard.
- `apps/web/src/app/projects/page.tsx`: projects page shell.
- `apps/web/src/app/governance/page.tsx`: tracking governance page shell.
- `apps/web/src/app/analytics/page.tsx`: analytics page shell.
- `apps/web/src/app/reports/page.tsx`: reports page shell.
- `apps/web/src/app/settings/page.tsx`: settings page shell.
- `apps/web/src/app/globals.css`: shadcn theme variables plus minimal TrackingHub global styling.
- `apps/web/vitest.config.ts`: include `.test.tsx` component tests.
- `apps/web/README.md`: document shadcn/ui component conventions.

---

### Task 1: Initialize shadcn/ui

**Files:**
- Create: `apps/web/components.json`
- Create: `apps/web/src/lib/utils.ts`
- Create: `apps/web/src/components/ui/button.tsx`
- Create: `apps/web/src/components/ui/card.tsx`
- Create: `apps/web/src/components/ui/badge.tsx`
- Create: `apps/web/src/components/ui/table.tsx`
- Create: `apps/web/src/components/ui/tabs.tsx`
- Create: `apps/web/src/components/ui/separator.tsx`
- Create: `apps/web/src/components/ui/sidebar.tsx`
- Create: `apps/web/src/components/ui/tooltip.tsx`
- Create: `apps/web/src/components/ui/dropdown-menu.tsx`
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`

- [x] **Step 1: Capture current dirty state**

Run:

```bash
git status --short
git diff -- apps/web/src/app/globals.css apps/web/src/app/page.tsx apps/web/src/app/layout.tsx apps/web/README.md package.json packages/flutter-sdk/pubspec.yaml
```

Expected: existing uncommitted UI and metadata edits are visible. Keep them unless a later step deliberately edits the same file.

- [x] **Step 2: Initialize shadcn in the web app**

Run:

```bash
cd apps/web
pnpm dlx shadcn@latest init -t next --base-color neutral --yes
```

Expected: `components.json` and `src/lib/utils.ts` are created. If the CLI asks whether to continue because files already exist, answer yes only for shadcn-managed additions; do not accept an overwrite that deletes the current TrackingHub page, fonts, or Chinese metadata.

- [x] **Step 3: Add the first shadcn components**

Run:

```bash
cd apps/web
pnpm dlx shadcn@latest add button card badge table tabs separator sidebar tooltip dropdown-menu --yes
```

Expected: the listed files exist under `apps/web/src/components/ui`.

- [x] **Step 4: Verify shadcn config points at the current app**

Check `apps/web/components.json` and adjust only if needed so it has this shape:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

Expected: aliases use the existing `@/*` tsconfig path.

- [x] **Step 5: Verify `cn` helper exists**

Check `apps/web/src/lib/utils.ts` contains:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Expected: `clsx` and `tailwind-merge` are dependencies in `apps/web/package.json`.

- [x] **Step 6: Run lint for the shadcn baseline**

Run:

```bash
pnpm --filter web lint
```

Expected: no lint errors from generated shadcn files.

- [x] **Step 7: Commit shadcn baseline**

Run:

```bash
git add apps/web/components.json apps/web/package.json apps/web/src/components/ui apps/web/src/lib/utils.ts apps/web/src/app/globals.css pnpm-lock.yaml
git commit -m "feat: initialize shadcn ui for web"
```

Expected: commit succeeds. If `globals.css` contains pre-existing uncommitted TrackingHub edits, include the merged result only after confirming it preserves the existing visual direction.

---

### Task 2: Extract TrackingHub Sample Data

**Files:**
- Create: `apps/web/src/lib/trackinghub/sample-data.test.ts`
- Create: `apps/web/src/lib/trackinghub/sample-data.ts`

- [x] **Step 1: Write failing data contract tests**

Create `apps/web/src/lib/trackinghub/sample-data.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  acceptanceItems,
  navItems,
  pageShells,
  reportItems,
  statusCards,
  timelineItems,
} from "./sample-data";

describe("TrackingHub sample data", () => {
  it("defines the main admin navigation in product order", () => {
    expect(navItems.map((item) => item.href)).toEqual([
      "/",
      "/projects",
      "/governance",
      "/analytics",
      "/reports",
      "/settings",
    ]);
    expect(navItems.map((item) => item.label)).toEqual([
      "首页",
      "项目",
      "埋点治理",
      "分析",
      "报告",
      "设置",
    ]);
  });

  it("has page shells for every non-home navigation route", () => {
    expect(Object.keys(pageShells).sort()).toEqual([
      "analytics",
      "governance",
      "projects",
      "reports",
      "settings",
    ]);
  });

  it("keeps the home dashboard data populated", () => {
    expect(statusCards).toHaveLength(4);
    expect(acceptanceItems).toHaveLength(3);
    expect(reportItems.length).toBeGreaterThan(0);
    expect(timelineItems.map((item) => item.label)).toEqual([
      "需求",
      "定义",
      "接入",
      "验收",
    ]);
  });
});
```

- [x] **Step 2: Run tests and verify RED**

Run:

```bash
pnpm --filter web test -- src/lib/trackinghub/sample-data.test.ts
```

Expected: FAIL because `sample-data.ts` does not exist.

- [x] **Step 3: Implement sample data**

Create `apps/web/src/lib/trackinghub/sample-data.ts`:

```ts
export type NavItem = {
  href: string;
  label: string;
  description: string;
};

export type StatusCard = {
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "purple" | "red";
};

export type AcceptanceTone = "success" | "warning" | "danger";

export type AcceptanceItem = {
  event: string;
  project: string;
  source: string;
  environment: string;
  status: string;
  tone: AcceptanceTone;
};

export type TimelineItem = {
  label: string;
  value: string;
  active: boolean;
};

export type PageShell = {
  title: string;
  eyebrow: string;
  description: string;
  badge: string;
  actionLabel: string;
  sections: string[];
};

export const navItems: NavItem[] = [
  { href: "/", label: "首页", description: "跨项目状态" },
  { href: "/projects", label: "项目", description: "产品与环境" },
  { href: "/governance", label: "埋点治理", description: "需求与事件字典" },
  { href: "/analytics", label: "分析", description: "指标与漏斗" },
  { href: "/reports", label: "报告", description: "日报与异常解释" },
  { href: "/settings", label: "设置", description: "成员与 SDK Key" },
];

export const statusCards: StatusCard[] = [
  {
    label: "活跃项目",
    value: "4",
    detail: "Web 2 个，Flutter 2 个",
    tone: "blue",
  },
  {
    label: "今日活跃用户",
    value: "18.4k",
    detail: "较昨日 +7.8%",
    tone: "green",
  },
  {
    label: "今日事件量",
    value: "2.7m",
    detail: "p95 写入延迟 1.8s",
    tone: "purple",
  },
  {
    label: "数据异常",
    value: "3",
    detail: "2 个 schema，1 个流量",
    tone: "red",
  },
];

export const acceptanceItems: AcceptanceItem[] = [
  {
    event: "pay_button_click",
    project: "Magic Frame",
    source: "Web + Flutter",
    environment: "预发 + 生产",
    status: "Flutter 缺少国家字段",
    tone: "warning",
  },
  {
    event: "campaign_card_view",
    project: "Homture",
    source: "Web",
    environment: "生产",
    status: "可验收",
    tone: "success",
  },
  {
    event: "subscription_success",
    project: "Magic Frame",
    source: "Flutter",
    environment: "生产",
    status: "Schema 不一致",
    tone: "danger",
  },
];

export const reportItems = [
  "每日产品运营报告已排队，09:30 生成",
  "spring_sale 活动转化率提升 12.4%",
  "D7 留存下降，需要按渠道拆解",
];

export const timelineItems: TimelineItem[] = [
  { label: "需求", value: "24", active: true },
  { label: "定义", value: "19", active: true },
  { label: "接入", value: "12", active: true },
  { label: "验收", value: "7", active: false },
];

export const pageShells = {
  projects: {
    title: "项目",
    eyebrow: "Projects",
    description: "管理内部产品、环境、平台来源和 SDK 接入信息。",
    badge: "项目管理",
    actionLabel: "新建项目",
    sections: ["产品列表", "环境配置", "SDK Key", "接入状态"],
  },
  governance: {
    title: "埋点治理",
    eyebrow: "Tracking Governance",
    description: "统一管理埋点需求、事件字典、Schema 和验收状态。",
    badge: "治理工作台",
    actionLabel: "新建埋点需求",
    sections: ["埋点需求", "事件字典", "事件 Schema", "验收结果"],
  },
  analytics: {
    title: "分析",
    eyebrow: "Analytics",
    description: "查看产品指标、事件趋势、漏斗转化和留存表现。",
    badge: "分析工作台",
    actionLabel: "创建分析视图",
    sections: ["概览", "事件分析", "漏斗", "留存"],
  },
  reports: {
    title: "报告",
    eyebrow: "Reports",
    description: "沉淀日报、周报、异常解释、活动对比和版本分析。",
    badge: "Codex 报告",
    actionLabel: "生成报告",
    sections: ["日报", "周报", "异常解释", "版本对比"],
  },
  settings: {
    title: "设置",
    eyebrow: "Settings",
    description: "配置工作区、成员、环境、SDK Key 和数据保留策略。",
    badge: "系统设置",
    actionLabel: "管理成员",
    sections: ["工作区", "成员", "环境", "数据保留"],
  },
} satisfies Record<string, PageShell>;
```

- [x] **Step 4: Run tests and verify GREEN**

Run:

```bash
pnpm --filter web test -- src/lib/trackinghub/sample-data.test.ts
```

Expected: PASS.

- [x] **Step 5: Commit sample data**

Run:

```bash
git add apps/web/src/lib/trackinghub/sample-data.ts apps/web/src/lib/trackinghub/sample-data.test.ts
git commit -m "feat: add trackinghub ui sample data"
```

Expected: commit succeeds.

---

### Task 3: Add Core TrackingHub Components

**Files:**
- Modify: `apps/web/vitest.config.ts`
- Create: `apps/web/src/components/trackinghub/components.test.tsx`
- Create: `apps/web/src/components/trackinghub/status-badge.tsx`
- Create: `apps/web/src/components/trackinghub/page-header.tsx`
- Create: `apps/web/src/components/trackinghub/empty-page-state.tsx`
- Create: `apps/web/src/components/trackinghub/metric-card.tsx`

- [x] **Step 1: Enable `.test.tsx` in Vitest**

Modify `apps/web/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
```

- [x] **Step 2: Write failing component rendering tests**

Create `apps/web/src/components/trackinghub/components.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EmptyPageState } from "./empty-page-state";
import { MetricCard } from "./metric-card";
import { PageHeader } from "./page-header";
import { StatusBadge } from "./status-badge";

describe("TrackingHub components", () => {
  it("renders a page header with actions", () => {
    const html = renderToStaticMarkup(
      <PageHeader
        eyebrow="Projects"
        title="项目"
        description="管理内部产品、环境和 SDK 接入信息。"
        actions={<button type="button">新建项目</button>}
      />,
    );

    expect(html).toContain("Projects");
    expect(html).toContain("项目");
    expect(html).toContain("新建项目");
  });

  it("renders business status badges", () => {
    expect(
      renderToStaticMarkup(<StatusBadge tone="danger">Schema 不一致</StatusBadge>),
    ).toContain("Schema 不一致");
  });

  it("renders a metric card value and detail", () => {
    const html = renderToStaticMarkup(
      <MetricCard
        label="今日事件量"
        value="2.7m"
        detail="p95 写入延迟 1.8s"
        tone="purple"
      />,
    );

    expect(html).toContain("今日事件量");
    expect(html).toContain("2.7m");
    expect(html).toContain("p95 写入延迟 1.8s");
  });

  it("renders the shared empty page state", () => {
    const html = renderToStaticMarkup(
      <EmptyPageState
        badge="分析工作台"
        title="分析"
        description="查看产品指标、事件趋势、漏斗转化和留存表现。"
        actionLabel="创建分析视图"
        sections={["概览", "事件分析", "漏斗", "留存"]}
      />,
    );

    expect(html).toContain("分析工作台");
    expect(html).toContain("创建分析视图");
    expect(html).toContain("事件分析");
  });
});
```

- [x] **Step 3: Run tests and verify RED**

Run:

```bash
pnpm --filter web test -- src/components/trackinghub/components.test.tsx
```

Expected: FAIL because the component files do not exist.

- [x] **Step 4: Implement `StatusBadge`**

Create `apps/web/src/components/trackinghub/status-badge.tsx`:

```tsx
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusBadgeTone = "success" | "warning" | "danger" | "neutral";

const toneClassName: Record<StatusBadgeTone, string> = {
  success: "border-transparent bg-chart-2/20 text-foreground",
  warning: "border-transparent bg-chart-4/20 text-foreground",
  danger: "border-transparent bg-destructive text-destructive-foreground",
  neutral: "border-transparent bg-secondary text-secondary-foreground",
};

export function StatusBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: StatusBadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(toneClassName[tone], className)}>
      {children}
    </Badge>
  );
}
```

- [x] **Step 5: Implement `PageHeader`**

Create `apps/web/src/components/trackinghub/page-header.tsx`:

```tsx
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="grid gap-6 border-b border-border pb-6 xl:grid-cols-[1fr_auto] xl:items-end">
      <div>
        <p className="text-xs font-bold uppercase leading-4 text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="mt-2 max-w-[820px] text-3xl font-bold leading-tight tracking-normal sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-[720px] text-[15px] leading-7 text-muted-foreground">
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
```

- [x] **Step 6: Implement `MetricCard`**

Create `apps/web/src/components/trackinghub/metric-card.tsx`:

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { StatusCard } from "@/lib/trackinghub/sample-data";

const toneClassName: Record<StatusCard["tone"], string> = {
  blue: "bg-chart-1/20",
  green: "bg-chart-2/20",
  purple: "bg-chart-5/20",
  red: "bg-destructive/20",
};

export function MetricCard({ label, value, detail, tone }: StatusCard) {
  return (
    <Card className="min-h-[154px] overflow-hidden">
      <CardHeader className="gap-4 pb-2">
        <div className={cn("h-2 w-16 rounded-full", toneClassName[tone])} />
        <CardDescription className="font-semibold">{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-[34px] leading-none tracking-normal">
          {value}
        </CardTitle>
        <p className="mt-3 text-sm leading-5 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
```

- [x] **Step 7: Implement `EmptyPageState`**

Create `apps/web/src/components/trackinghub/empty-page-state.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function EmptyPageState({
  badge,
  title,
  description,
  actionLabel,
  sections,
}: {
  badge: string;
  title: string;
  description: string;
  actionLabel: string;
  sections: string[];
}) {
  return (
    <Card>
      <CardHeader>
        <Badge className="w-fit" variant="secondary">
          {badge}
        </Badge>
        <CardTitle className="text-2xl tracking-normal">{title}</CardTitle>
        <CardDescription className="max-w-2xl text-[15px] leading-7">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {sections.map((section) => (
            <div
              className="rounded-lg border border-border bg-muted/40 px-4 py-4 text-sm font-semibold text-foreground"
              key={section}
            >
              {section}
            </div>
          ))}
        </div>
        <Button className="w-fit">{actionLabel}</Button>
      </CardContent>
    </Card>
  );
}
```

- [x] **Step 8: Run component tests and verify GREEN**

Run:

```bash
pnpm --filter web test -- src/components/trackinghub/components.test.tsx
```

Expected: PASS.

- [x] **Step 9: Commit core components**

Run:

```bash
git add apps/web/vitest.config.ts apps/web/src/components/trackinghub/components.test.tsx apps/web/src/components/trackinghub/status-badge.tsx apps/web/src/components/trackinghub/page-header.tsx apps/web/src/components/trackinghub/empty-page-state.tsx apps/web/src/components/trackinghub/metric-card.tsx
git commit -m "feat: add trackinghub core ui components"
```

Expected: commit succeeds.

---

### Task 4: Add App Shell And Sidebar

**Files:**
- Create: `apps/web/src/components/trackinghub/app-sidebar.tsx`
- Create: `apps/web/src/components/trackinghub/app-shell.tsx`

- [x] **Step 1: Implement `AppSidebar`**

Create `apps/web/src/components/trackinghub/app-sidebar.tsx`:

```tsx
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { navItems, timelineItems } from "@/lib/trackinghub/sample-data";

export function AppSidebar({ activeHref = "/" }: { activeHref?: string }) {
  return (
    <Sidebar variant="inset">
      <SidebarHeader className="gap-4">
        <Link className="group block w-fit" href="/">
          <p className="text-xs font-bold uppercase leading-4 text-muted-foreground">
            TrackingHub
          </p>
          <h1 className="mt-1 text-2xl font-bold leading-tight tracking-normal group-hover:text-primary">
            分析运营台
          </h1>
        </Link>
        <Badge className="w-fit" variant="secondary">
          MVP
        </Badge>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>当前项目</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
              <span className="font-mono text-[13px] text-foreground">
                Magic Frame
              </span>
              <span className="ml-2">生产数据流正常</span>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>导航</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={item.href === activeHref}>
                  <Link href={item.href}>
                    <span>{item.label}</span>
                    <span className="sr-only">{item.description}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Separator />
        <div>
          <p className="text-xs font-bold uppercase leading-4 text-muted-foreground">
            当前批次
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {timelineItems.map((item, index) => (
              <div
                className="grid grid-cols-[24px_1fr_auto] items-center gap-2 text-sm"
                key={item.label}
              >
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full border text-[12px] font-bold",
                    item.active
                      ? "border-foreground bg-primary text-primary-foreground"
                      : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {index + 1}
                </span>
                <span className="font-semibold text-muted-foreground">
                  {item.label}
                </span>
                <span className="font-mono text-[13px] text-muted-foreground">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
```

- [x] **Step 2: Implement `AppShell`**

Create `apps/web/src/components/trackinghub/app-shell.tsx`:

```tsx
import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

export function AppShell({
  activeHref = "/",
  children,
}: {
  activeHref?: string;
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar activeHref={activeHref} />
      <SidebarInset>
        <div className="flex min-h-screen flex-col bg-background text-foreground">
          <div className="flex h-14 items-center border-b border-border px-4 lg:hidden">
            <SidebarTrigger />
            <span className="ml-3 text-sm font-semibold">TrackingHub</span>
          </div>
          <main className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-8 lg:px-10 lg:py-8">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

- [x] **Step 3: Run lint**

Run:

```bash
pnpm --filter web lint
```

Expected: no lint errors. If shadcn `Sidebar` API differs from the snippet, adjust imports to match the generated `apps/web/src/components/ui/sidebar.tsx` exports and keep the same public `AppShell` API.

- [x] **Step 4: Commit shell components**

Run:

```bash
git add apps/web/src/components/trackinghub/app-sidebar.tsx apps/web/src/components/trackinghub/app-shell.tsx
git commit -m "feat: add trackinghub app shell"
```

Expected: commit succeeds.

---

### Task 5: Refactor Home Dashboard

**Files:**
- Create: `apps/web/src/components/trackinghub/acceptance-table.tsx`
- Create: `apps/web/src/components/trackinghub/codex-summary-card.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/components/trackinghub/components.test.tsx`

- [x] **Step 1: Extend rendering tests for dashboard components**

Append these tests to `apps/web/src/components/trackinghub/components.test.tsx`:

```tsx
import { AcceptanceTable } from "./acceptance-table";
import { CodexSummaryCard } from "./codex-summary-card";
import { acceptanceItems, reportItems } from "@/lib/trackinghub/sample-data";

describe("TrackingHub dashboard components", () => {
  it("renders acceptance rows", () => {
    const html = renderToStaticMarkup(<AcceptanceTable items={acceptanceItems} />);

    expect(html).toContain("pay_button_click");
    expect(html).toContain("Flutter 缺少国家字段");
  });

  it("renders Codex summary report items", () => {
    const html = renderToStaticMarkup(<CodexSummaryCard items={reportItems} />);

    expect(html).toContain("分析摘要");
    expect(html).toContain("spring_sale 活动转化率提升 12.4%");
  });
});
```

If duplicate imports are created, merge them into the existing import block.

- [x] **Step 2: Run tests and verify RED**

Run:

```bash
pnpm --filter web test -- src/components/trackinghub/components.test.tsx
```

Expected: FAIL because `acceptance-table.tsx` and `codex-summary-card.tsx` do not exist.

- [x] **Step 3: Implement `AcceptanceTable`**

Create `apps/web/src/components/trackinghub/acceptance-table.tsx`:

```tsx
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
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase leading-4 text-muted-foreground">
            Acceptance
          </p>
          <CardTitle className="mt-1 text-xl tracking-normal">
            待验收埋点
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>事件</TableHead>
              <TableHead>来源</TableHead>
              <TableHead>环境</TableHead>
              <TableHead>状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={`${item.project}-${item.event}`}>
                <TableCell>
                  <p className="break-all font-mono text-sm font-semibold text-foreground">
                    {item.event}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.project}
                  </p>
                </TableCell>
                <TableCell>{item.source}</TableCell>
                <TableCell>{item.environment}</TableCell>
                <TableCell>
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
```

- [x] **Step 4: Implement `CodexSummaryCard`**

Create `apps/web/src/components/trackinghub/codex-summary-card.tsx`:

```tsx
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
        <CardTitle className="text-xl tracking-normal">分析摘要</CardTitle>
        <CardDescription className="text-background/80">
          事件质量整体健康。当前发布批次验收前，建议优先补齐活动 payload 在
          Web 与 Flutter 两端的一致性。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
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
        <div className="rounded-lg bg-black/35 p-4 font-mono text-[13px] leading-6">
          <p>track(&quot;campaign_card_view&quot;, {"{"}</p>
          <p className="pl-4">platform: &quot;web&quot;,</p>
          <p className="pl-4">env: &quot;prod&quot;</p>
          <p>{"}"});</p>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [x] **Step 5: Refactor the home page**

Replace `apps/web/src/app/page.tsx` with:

```tsx
import { Button } from "@/components/ui/button";
import { AcceptanceTable } from "@/components/trackinghub/acceptance-table";
import { AppShell } from "@/components/trackinghub/app-shell";
import { CodexSummaryCard } from "@/components/trackinghub/codex-summary-card";
import { MetricCard } from "@/components/trackinghub/metric-card";
import { PageHeader } from "@/components/trackinghub/page-header";
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
            <Button variant="outline">新建需求</Button>
            <Button>接收事件</Button>
          </>
        }
      />

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statusCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <AcceptanceTable items={acceptanceItems} />
        <CodexSummaryCard items={reportItems} />
      </div>
    </AppShell>
  );
}
```

- [x] **Step 6: Run dashboard component tests**

Run:

```bash
pnpm --filter web test -- src/components/trackinghub/components.test.tsx
```

Expected: PASS.

- [x] **Step 7: Run lint**

Run:

```bash
pnpm --filter web lint
```

Expected: no lint errors.

- [x] **Step 8: Commit home refactor**

Run:

```bash
git add apps/web/src/app/page.tsx apps/web/src/components/trackinghub/acceptance-table.tsx apps/web/src/components/trackinghub/codex-summary-card.tsx apps/web/src/components/trackinghub/components.test.tsx
git commit -m "feat: refactor trackinghub home dashboard"
```

Expected: commit succeeds.

---

### Task 6: Add Main Route Page Shells

**Files:**
- Create: `apps/web/src/components/trackinghub/page-shell.tsx`
- Create: `apps/web/src/app/projects/page.tsx`
- Create: `apps/web/src/app/governance/page.tsx`
- Create: `apps/web/src/app/analytics/page.tsx`
- Create: `apps/web/src/app/reports/page.tsx`
- Create: `apps/web/src/app/settings/page.tsx`

- [x] **Step 1: Implement reusable page shell content**

Create `apps/web/src/components/trackinghub/page-shell.tsx`:

```tsx
import { AppShell } from "./app-shell";
import { EmptyPageState } from "./empty-page-state";
import { PageHeader } from "./page-header";
import type { PageShell as PageShellData } from "@/lib/trackinghub/sample-data";

export function PageShell({
  activeHref,
  page,
}: {
  activeHref: string;
  page: PageShellData;
}) {
  return (
    <AppShell activeHref={activeHref}>
      <PageHeader
        eyebrow={page.eyebrow}
        title={page.title}
        description={page.description}
      />
      <div className="mt-6">
        <EmptyPageState
          badge={page.badge}
          title={page.title}
          description={page.description}
          actionLabel={page.actionLabel}
          sections={page.sections}
        />
      </div>
    </AppShell>
  );
}
```

- [x] **Step 2: Add projects page**

Create `apps/web/src/app/projects/page.tsx`:

```tsx
import { PageShell } from "@/components/trackinghub/page-shell";
import { pageShells } from "@/lib/trackinghub/sample-data";

export default function ProjectsPage() {
  return <PageShell activeHref="/projects" page={pageShells.projects} />;
}
```

- [x] **Step 3: Add governance page**

Create `apps/web/src/app/governance/page.tsx`:

```tsx
import { PageShell } from "@/components/trackinghub/page-shell";
import { pageShells } from "@/lib/trackinghub/sample-data";

export default function GovernancePage() {
  return <PageShell activeHref="/governance" page={pageShells.governance} />;
}
```

- [x] **Step 4: Add analytics page**

Create `apps/web/src/app/analytics/page.tsx`:

```tsx
import { PageShell } from "@/components/trackinghub/page-shell";
import { pageShells } from "@/lib/trackinghub/sample-data";

export default function AnalyticsPage() {
  return <PageShell activeHref="/analytics" page={pageShells.analytics} />;
}
```

- [x] **Step 5: Add reports page**

Create `apps/web/src/app/reports/page.tsx`:

```tsx
import { PageShell } from "@/components/trackinghub/page-shell";
import { pageShells } from "@/lib/trackinghub/sample-data";

export default function ReportsPage() {
  return <PageShell activeHref="/reports" page={pageShells.reports} />;
}
```

- [x] **Step 6: Add settings page**

Create `apps/web/src/app/settings/page.tsx`:

```tsx
import { PageShell } from "@/components/trackinghub/page-shell";
import { pageShells } from "@/lib/trackinghub/sample-data";

export default function SettingsPage() {
  return <PageShell activeHref="/settings" page={pageShells.settings} />;
}
```

- [x] **Step 7: Run lint**

Run:

```bash
pnpm --filter web lint
```

Expected: no lint errors.

- [x] **Step 8: Commit page shells**

Run:

```bash
git add apps/web/src/components/trackinghub/page-shell.tsx apps/web/src/app/projects/page.tsx apps/web/src/app/governance/page.tsx apps/web/src/app/analytics/page.tsx apps/web/src/app/reports/page.tsx apps/web/src/app/settings/page.tsx
git commit -m "feat: add trackinghub admin page shells"
```

Expected: commit succeeds.

---

### Task 7: Clean Global Styling And Document UI Convention

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/README.md`

- [x] **Step 1: Replace old custom utility classes with shadcn-compatible globals**

Keep the shadcn-generated CSS variables in `apps/web/src/app/globals.css`. Remove custom classes that are no longer used by the refactored app, including `.th-card`, `.th-button-primary`, `.th-button-secondary`, `.th-tab-active`, `.th-pill-active`, and `.th-doodle`.

The final file should keep this kind of project-level base styling after the shadcn theme block:

```css
* {
  box-sizing: border-box;
}

html {
  background: var(--background);
}

body {
  min-height: 100vh;
  font-family:
    var(--font-ibm-plex-sans),
    "PingFang SC",
    "Hiragino Sans GB",
    "Microsoft YaHei",
    sans-serif;
}

button,
a,
input,
select,
textarea {
  font: inherit;
}

::selection {
  background: var(--primary);
  color: var(--primary-foreground);
}
```

Expected: the app uses shadcn semantic classes and no page imports rely on removed `.th-*` classes.

- [x] **Step 2: Update README component guidance**

Append this section to `apps/web/README.md`:

```md
## UI 组件约定

- `src/components/ui/*` 由 shadcn/ui CLI 生成，优先保持上游组件结构。
- `src/components/trackinghub/*` 放 TrackingHub 业务组合组件。
- 页面文件只负责组织数据和组件，不堆叠大段卡片、表格或侧栏 JSX。
- 用户可见文案默认中文；SDK API、事件字段和数据库字段保持英文。
```

- [x] **Step 3: Run lint**

Run:

```bash
pnpm --filter web lint
```

Expected: no lint errors.

- [x] **Step 4: Commit styling and docs cleanup**

Run:

```bash
git add apps/web/src/app/globals.css apps/web/README.md
git commit -m "docs: document trackinghub ui component conventions"
```

Expected: commit succeeds.

---

### Task 8: Final Verification

**Files:**
- No planned file edits.

- [x] **Step 1: Run focused Web tests**

Run:

```bash
pnpm --filter web test
```

Expected: all web tests pass, including envelope tests, route tests, sample-data tests, and component rendering tests.

- [x] **Step 2: Run Web lint**

Run:

```bash
pnpm --filter web lint
```

Expected: no lint errors.

- [x] **Step 3: Run Web build**

Run:

```bash
pnpm --filter web build
```

Expected: Next.js build succeeds and includes `/`, `/projects`, `/governance`, `/analytics`, `/reports`, and `/settings`.

- [x] **Step 4: Start local dev server**

Run:

```bash
pnpm --filter web dev
```

Expected: dev server starts on `http://localhost:3000`. If port 3000 is occupied, use the printed alternate URL.

- [x] **Step 5: Browser-check the home dashboard**

Open the dev server in the browser and visit:

```text
http://localhost:3000/
```

Expected: the sidebar, page header, four metric cards, acceptance table, and Codex summary render without overlap.

- [x] **Step 6: Browser-check the page shells**

Visit:

```text
http://localhost:3000/projects
http://localhost:3000/governance
http://localhost:3000/analytics
http://localhost:3000/reports
http://localhost:3000/settings
```

Expected: each route renders the shared shell, correct active navigation item, Chinese title, concise description, and module sections.

- [x] **Step 7: Check final git status**

Run:

```bash
git status --short
```

Expected: only intentionally unrelated pre-existing files remain dirty, or the tree is clean if those changes were incorporated by the implementation tasks.
