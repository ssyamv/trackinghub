# TrackingHub 元数据与本地身份基础设计

## 背景

TrackingHub 当前已经具备 Next.js 管理后台壳子、事件接收 API、ClickHouse raw event 写入、Schema 验证结果写入、Web SDK、Flutter SDK 骨架，以及项目、治理、分析、报告页面的静态工作台。

下一阶段目标是让平台从“可演示工作台”进入“可真实管理内部项目元数据”的状态。为此需要先建立本地身份、权限边界和 Postgres 元数据 API，再让项目管理与事件治理页面从 API 读取和写入数据。

## 目标

- 提供本地内置登录能力，支持内部最小角色模型。
- 建立 Postgres 元数据访问层，统一承载项目、环境、SDK Key、事件字典和事件属性。
- 提供项目、环境、SDK Key、事件字典和属性 Schema 的服务端 API。
- 让 `/projects` 和 `/governance` 从真实 API 获取数据，并保留无数据时的可操作空状态。
- 为下一阶段“从 Postgres 事件字典读取 Schema 验证规则”准备稳定数据结构。

## 非目标

- 不接 OAuth、企业 SSO 或外部身份提供商。
- 不实现复杂企业权限层级、团队空间隔离或字段级权限。
- 不实现 ClickHouse 分析查询、Codex 报告任务 runner、生产部署自动化。
- 不重写现有 Web SDK 或 Flutter SDK。
- 不把 Codex 放入事件接收热路径。

## 用户与角色

本阶段支持三类本地角色：

- `admin`：可以管理用户、项目、环境、SDK Key、事件字典和状态流转。
- `editor`：可以管理项目元数据、事件定义、属性 Schema 和验收状态。
- `viewer`：只能查看项目、事件定义、验收结果和分析/报告页面。

权限先在 API 层做强约束，页面层只做体验辅助。所有写入 API 都必须检查 session 和角色。

## 身份与会话

本阶段使用本地账号密码和 httpOnly cookie session：

- 用户表保存 email、显示名、角色、密码哈希、启停状态和时间戳。
- 登录接口校验 email/password，成功后创建 session 记录并设置 httpOnly cookie。
- 登出接口删除当前 session 并清理 cookie。
- 服务端 API 通过 cookie 查询 session，再加载当前用户和角色。
- 开发环境提供 seed admin，生产环境必须显式设置初始 admin 创建方式或 seed 开关。

密码哈希使用 Node 生态中成熟的小依赖；实现计划阶段再根据当前依赖体积和 Next.js 兼容性选择 `bcryptjs` 或 `@node-rs/argon2`。cookie 使用 `SameSite=Lax`、`HttpOnly`、`Secure` 在生产开启。

## 数据模型

现有 `db/postgres/001_metadata_schema.sql` 已覆盖大部分平台元数据。本阶段在不大改模型方向的前提下补齐运行需要：

- `users`：本地用户、角色和状态。
- `sessions`：登录会话、过期时间、用户关联。
- `projects`：内部产品项目。
- `project_environments`：项目下的 `dev`、`staging`、`prod` 环境。
- `sdk_keys`：按项目、环境、来源区分的写入 Key，仅展示 masked key。
- `tracking_requests`：埋点需求流，作为事件定义前置上下文。
- `event_definitions`：事件字典主表，包含名称、展示名、触发时机、平台、状态。
- `event_properties`：事件属性 Schema，包含类型、必填、示例、允许值和平台说明。
- `event_acceptance_records`：验收状态、操作者、备注和时间。

API 返回给前端的字段保持中文 UI 所需的展示数据，但协议字段和数据库字段保持英文。

## API 边界

本阶段新增 API 分组：

- `POST /api/auth/login`：登录并创建 session。
- `POST /api/auth/logout`：登出并清理 session。
- `GET /api/auth/me`：返回当前用户和角色。
- `GET /api/projects`：列出项目、环境和 SDK Key 摘要。
- `POST /api/projects`：创建项目，仅 `admin`、`editor`。
- `PATCH /api/projects/:id`：更新项目基础信息，仅 `admin`、`editor`。
- `POST /api/projects/:id/environments`：创建或启用环境，仅 `admin`、`editor`。
- `PATCH /api/sdk-keys/:id`：停用或轮换 SDK Key，仅 `admin`。
- `GET /api/event-definitions`：列出事件字典和属性。
- `POST /api/event-definitions`：创建事件定义和属性，仅 `admin`、`editor`。
- `PATCH /api/event-definitions/:id`：更新事件定义、属性和状态，仅 `admin`、`editor`。
- `POST /api/event-definitions/:id/acceptance`：写入验收记录，仅 `admin`、`editor`。

Next.js App Router 不支持冒号路径，实际文件结构使用动态段，例如 `app/api/projects/[id]/route.ts`。

## 前端接入

`/projects` 页面从 `GET /api/projects` 获取数据，渲染现有 `ProjectManagementWorkbench` 所需结构。页面提供：

- 项目列表。
- 环境状态。
- SDK Key masked 状态。
- 无数据时的新增项目入口。

`/governance` 页面从 `GET /api/event-definitions` 获取数据，渲染现有 `GovernanceWorkbench` 和事件字典编辑器。页面提供：

- 事件定义列表。
- 重点事件详情。
- 属性 Schema。
- 状态流转入口。
- 无数据时的新增事件入口。

为了降低风险，本阶段优先让 API 数据映射到现有组件 props；只有现有组件无法表达真实交互时，才局部补小组件。

## Schema 验证衔接

当前 Schema 验证规则在代码内静态定义。本阶段不直接改 `/api/events` 的验证热路径，但会保证 Postgres 事件字典的数据结构足够支撑下一阶段替换：

- 事件名可以按项目、环境和来源查找。
- 属性 Schema 能表达类型、必填、允许值和平台兼容性。
- 事件状态能区分 draft、ready、accepted、deprecated。
- 验收记录能追踪操作者和最近结论。

下一阶段可以将 `validateEventSchema` 的静态表替换为仓储接口，并在事件接收时读取已接受或可验证的事件定义。

## 错误处理

- 未登录访问受保护 API 返回 `401`。
- 登录但角色不足返回 `403`。
- 输入字段缺失或格式错误返回 `400`，包含稳定错误码和中文可读消息。
- 资源不存在返回 `404`。
- 数据库不可用返回 `503`，不暴露连接字符串或 SQL 细节。
- SDK Key 明文只在创建或轮换响应中返回一次；列表接口只返回 masked key。

## 测试策略

本阶段按 TDD 推进：

- 数据访问层测试覆盖用户、session、项目、环境、SDK Key、事件定义和属性 Schema 的读写。
- API route 测试覆盖登录、权限、校验失败、成功写入和 masked key。
- 组件或页面映射测试覆盖 API 数据到现有 workbench props 的转换。
- 回归测试确保 `/api/events` 现有接收、ClickHouse 写入和验证结果写入不被破坏。

验收命令保持：

```bash
pnpm run check
```

如果引入 Postgres 客户端或 SQL 测试工具，实施计划中必须给出无需真实生产数据库的测试方式。

## 分阶段交付

第一阶段再拆为四个小交付：

1. 本地身份和 session 基础。
2. Postgres 元数据访问层和 API。
3. `/projects` 接入真实 API。
4. `/governance` 接入真实 API，并为 Schema 验证动态化准备仓储接口。

每个小交付都应有独立测试和提交，避免一次性大改。

## 成功标准

- 管理员可以登录并看到当前用户信息。
- 未登录用户无法调用受保护写入 API。
- `admin` 或 `editor` 可以通过 API 创建项目、环境、事件定义和属性 Schema。
- `viewer` 可以读取数据但不能写入。
- `/projects` 和 `/governance` 不再依赖静态 seed data 作为唯一数据源。
- `pnpm run check` 通过。
