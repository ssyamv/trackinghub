# TrackingHub UI 组件化与页面壳子设计

## 背景

TrackingHub Web 当前已有一个 MVP 静态首页，展示跨项目状态、待验收埋点和 Codex 分析摘要。这个页面已经形成了中文产品表达和内部管理后台气质，但实现上仍集中在 `apps/web/src/app/page.tsx`，数据、导航、布局、卡片、表格和状态样式混在同一个文件中。

本设计推进下一步前端基础：引入 shadcn/ui，建立可复用的后台组件体系，并补齐主导航页面壳子。此阶段不接真实后端，也不改变现有事件接收 API、SDK 或数据库契约。

## 目标

- 在 `apps/web` 中初始化 shadcn/ui，使用本地源码组件模式。
- 将基础 UI 组件与 TrackingHub 业务组合组件分层，避免首页继续膨胀。
- 将现有首页拆成组件化实现，保留当前 MVP 信息架构和中文文案方向。
- 新增主导航对应的页面壳子，让后台的路由形态与产品设计文档一致。
- 统一样式策略，优先使用 shadcn 的语义 token 和组件 variants。
- 保持本轮改动可验证：lint、test、build 和浏览器布局检查都能覆盖。

## 非目标

- 不实现登录、权限、组织或成员管理。
- 不接入 Postgres、ClickHouse 或真实分析查询。
- 不实现可交互的 BI 图表、漏斗配置或报表生成。
- 不引入 dashboard block 作为大块模板。
- 不一次性完成所有复杂表单、筛选器、弹窗和编辑流程。

## 方案选择

选择“shadcn 基础组件优先”的路线。

备选方案包括直接引入 dashboard block，或仅在新页面使用 shadcn、保留旧首页样式不动。前者能更快得到完整后台外观，但会带入较多不确定结构和默认审美；后者风险低，但会让组件体系短期分裂。当前 MVP 更需要清晰的边界和可演进的本地组件，因此先从基础组件和业务组合组件开始。

## 架构

`apps/web` 继续使用 Next.js App Router。根布局 `apps/web/src/app/layout.tsx` 负责 HTML、语言、字体、全局样式和 metadata；后台应用壳子由业务组件 `AppShell` 承载，而不是继续堆在首页。

组件分为两层：

- `apps/web/src/components/ui/*`：由 shadcn CLI 生成和维护的基础组件源码，例如 `Button`、`Card`、`Badge`、`Table`、`Tabs`、`Separator`、`Sidebar`。
- `apps/web/src/components/trackinghub/*`：TrackingHub 业务组合组件，例如 `AppShell`、`AppSidebar`、`PageHeader`、`MetricCard`、`AcceptanceTable`、`CodexSummaryCard`。

静态种子数据从页面 JSX 中移出，放入 `apps/web/src/lib/trackinghub/sample-data.ts` 或同等清晰的本地数据文件。页面负责选择数据和组合组件，组件负责渲染结构。

## shadcn/ui 初始化

在 `apps/web` 目录运行 shadcn CLI 初始化，生成 `components.json`、`src/lib/utils.ts` 和基础主题变量。项目已经使用 Tailwind CSS v4 与 `src/app/globals.css`，因此初始化后需要确认：

- `components.json` 的 aliases 指向 `@/components`、`@/lib/utils`。
- `tailwind.css` 指向 `src/app/globals.css`。
- `rsc` 为 `true`，默认组件保持 Server Component 可用。
- 只在需要浏览器状态的组件中添加 `"use client"`。
- 初始化没有覆盖掉现有中文 metadata、字体和已有页面内容。

首批安装组件：

- `button`
- `card`
- `badge`
- `table`
- `tabs`
- `separator`
- `sidebar`
- `tooltip`
- `dropdown-menu`

如果 CLI 对 `sidebar` 带入额外依赖或 hooks，应保留其官方生成结构，并在业务组件中组合使用，不直接改写生成组件的核心实现。

## 路由与页面壳子

主导航页面保持中文可见文案，路由使用短英文路径：

- `/`：首页，展示跨项目状态、待验收埋点、Codex 分析摘要和当前批次。
- `/projects`：项目，展示项目管理入口的空壳。
- `/governance`：埋点治理，展示需求、事件字典、Schema 与验收的入口。
- `/analytics`：分析，展示概览、事件分析、漏斗和留存的入口。
- `/reports`：报告，展示日报、周报、异常解释和版本对比的入口。
- `/settings`：设置，展示工作区、成员、环境、SDK Key 和数据保留设置入口。

这些页面先采用统一的 `AppShell + PageHeader + EmptyPageState`。空壳不是营销页，不放大段功能介绍，只保留后台用户能理解的模块标题、简短说明和下一步操作占位。

## 组件设计

### AppShell

承载后台全局布局，包括侧栏、顶部移动端触发区和主内容容器。桌面端使用固定侧栏和内容区，移动端通过 shadcn `Sidebar` 的响应式能力处理导航折叠。`AppShell` 接收 `children`，页面内容不需要知道侧栏实现。

### AppSidebar

渲染 TrackingHub 标识、当前项目状态、主导航和当前批次进度。导航项使用 `href`、`label`、`description` 和可选图标定义。当前页面的高亮基于 pathname，若该组件需要读取 pathname，则标记为 Client Component；否则可由页面传入 active path。

### PageHeader

统一页面标题、说明、标签和操作按钮区域。首页可以使用更完整的说明和主操作，其他页面壳子使用较紧凑结构。按钮使用 shadcn `Button` variants，不再手写 `.th-button-*`。

### MetricCard

渲染首页状态指标，使用 shadcn `Card` 完整组合结构。指标包含 label、value、detail、trend 或 tone。视觉强调使用语义 token 与 `Badge`，避免每张卡片手写大段颜色类。

### StatusBadge

封装验收状态、异常等级和可验收状态。状态输入保持业务语义，例如 `success`、`warning`、`danger`、`neutral`，组件内部映射到 shadcn `Badge` variant 和少量 class。

### AcceptanceTable

使用 shadcn `Table` 渲染待验收埋点列表。列包括事件名、项目、来源、环境、状态。长事件名允许换行或截断，移动端保持可读，不通过压缩字体解决溢出。

### CodexSummaryCard

使用 shadcn `Card` 展示摘要、报告队列和示例代码块。它是首页业务组件，不作为通用 Card 变体。

### EmptyPageState

为页面壳子提供一致的空状态。使用 `Card`、`Badge` 和 `Button` 组合，文案简洁说明当前模块下一步会承载什么，不出现开发说明或使用教程式长文案。

## 样式策略

保留 TrackingHub 当前偏克制的内部管理后台气质，但将样式迁移到 shadcn 语义 token。

原则：

- 优先使用 `bg-background`、`text-foreground`、`text-muted-foreground`、`border-border`、`bg-card` 等语义类。
- 业务布局使用 Tailwind 的 layout utilities，例如 `grid`、`flex`、`gap-*`、`min-h-*`。
- 避免继续扩大 `.th-*` 自定义类；已有 `.th-card`、`.th-button-*`、`.th-tab-active` 等应在组件化时删除或收敛。
- 不使用一整套单色系；保留必要的状态色，但不让页面变成单一蓝紫或灰色主题。
- 卡片圆角不超过现有 8px 的后台风格。
- 按钮、Badge、Table、Tabs 等优先使用 shadcn 组件 API 和 variants。

## 数据流

本轮只使用静态 seed data。

推荐的数据文件导出：

- `navItems`
- `statusCards`
- `acceptanceItems`
- `reportItems`
- `timelineItems`
- `pageShells`

字段命名保持清楚稳定，用户可见文案使用中文，事件名、平台名、环境标识等协议字段保持英文或现有混合形式。

## 错误处理与空状态

由于本轮没有真实请求，错误处理仅体现在 UI 状态设计：

- 页面壳子显示明确空状态，不伪装成已有数据。
- 首页静态数据若为空，业务组件应能显示空表格或空摘要，而不是渲染断裂布局。
- 长事件名、长项目名和多平台来源需要在桌面与移动端保持可读。

## 测试与验证

实施完成后至少执行：

```bash
pnpm --filter web lint
pnpm --filter web test
pnpm --filter web build
```

浏览器验证：

- 打开 `/`，确认首页保持当前信息结构，但 JSX 已拆分为组件。
- 打开 `/projects`、`/governance`、`/analytics`、`/reports`、`/settings`，确认统一页面壳子可访问。
- 检查桌面和窄屏下侧栏、页面标题、卡片、表格、空状态没有重叠或明显溢出。

## 交付边界

本设计交付的是前端结构基础，不是完整管理后台。完成后，下一轮可以在这个组件体系上继续推进事件字典、项目管理、验收工作台或分析模板，而不需要重新拆首页。
