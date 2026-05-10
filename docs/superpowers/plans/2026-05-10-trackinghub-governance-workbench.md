# TrackingHub 事件治理工作台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `/governance` 从通用空壳升级为可浏览的事件字典与埋点验收工作台。

**Architecture:** 继续使用 Next.js App Router 与现有 `AppShell`。静态治理数据放在 `apps/web/src/lib/trackinghub/sample-data.ts`，新增 `GovernanceWorkbench` 业务组件组合 shadcn Card/Table/Badge。页面只负责选择数据和挂载组件。

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Vitest.

---

### Task 1: 补充治理数据契约

**Files:**
- Modify: `apps/web/src/lib/trackinghub/sample-data.ts`
- Modify: `apps/web/src/lib/trackinghub/sample-data.test.ts`

- [x] **Step 1: 写失败测试**

在 `sample-data.test.ts` 中新增测试，断言治理数据包含事件字典、重点事件详情和验收检查。

- [x] **Step 2: 运行测试确认 RED**

Run: `pnpm --filter web test -- src/lib/trackinghub/sample-data.test.ts`

Expected: FAIL，因为治理数据尚未导出。

- [x] **Step 3: 实现静态治理数据**

在 `sample-data.ts` 中新增 `EventDictionaryItem`、`FeaturedEventDetail`、`GovernanceAcceptanceCheck` 等类型和对应 seed data。

- [x] **Step 4: 运行测试确认 GREEN**

Run: `pnpm --filter web test -- src/lib/trackinghub/sample-data.test.ts`

Expected: PASS。

### Task 2: 实现治理工作台组件

**Files:**
- Create: `apps/web/src/components/trackinghub/governance-workbench.tsx`
- Modify: `apps/web/src/components/trackinghub/components.test.tsx`

- [x] **Step 1: 写失败组件测试**

在 `components.test.tsx` 中渲染 `GovernanceWorkbench`，断言包含“事件字典”、“重点事件”、“验收检查”、`pay_button_click`、`product_id` 等关键内容。

- [x] **Step 2: 运行测试确认 RED**

Run: `pnpm --filter web test -- src/components/trackinghub/components.test.tsx`

Expected: FAIL，因为组件尚不存在。

- [x] **Step 3: 实现组件**

创建 `GovernanceWorkbench`，使用 shadcn `Card`、`Table`、`Badge` 和现有 `StatusBadge` 渲染治理页面主体。

- [x] **Step 4: 运行测试确认 GREEN**

Run: `pnpm --filter web test -- src/components/trackinghub/components.test.tsx`

Expected: PASS。

### Task 3: 接入 `/governance` 页面

**Files:**
- Modify: `apps/web/src/app/governance/page.tsx`

- [x] **Step 1: 替换通用空壳**

让 `/governance` 使用 `AppShell`、`PageHeader` 和 `GovernanceWorkbench`。

- [x] **Step 2: 运行完整验证**

Run:

```bash
pnpm --filter web test
pnpm --filter web lint
pnpm --filter web build
```

Expected: 全部通过，`/governance` 在 build 路由中保持静态页面。
