# TrackingHub Web

TrackingHub Web 是内部多项目埋点治理与产品分析平台的管理后台。

## 本地开发

在仓库根目录运行：

```bash
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看页面。

## 常用命令

```bash
pnpm run lint
pnpm run test
pnpm run build
```

## 事件写入配置

`POST /api/events` 校验通过后会写入 ClickHouse `raw_events`。本地未配置 ClickHouse 时使用空写入器，便于 UI 与 SDK 开发。

```bash
TRACKINGHUB_CLICKHOUSE_URL=http://localhost:8123
TRACKINGHUB_CLICKHOUSE_DATABASE=trackinghub
TRACKINGHUB_CLICKHOUSE_USERNAME=writer
TRACKINGHUB_CLICKHOUSE_PASSWORD=secret
```

## 分析查询配置

`/analytics` 会优先使用同一组 ClickHouse 配置读取真实 `raw_events` 和 `event_validation_results`，生成概览、事件趋势和漏斗。页面筛选器通过 URL 查询参数驱动，支持 `project_id`、`environment`、`source`、`event_name`、`funnel_steps`、`range=7d|30d` 和 `granularity=day|hour`。`funnel_steps` 使用英文逗号分隔事件名；未提供或不足 2 步时回到默认商业化漏斗。未配置 ClickHouse 或查询失败时，页面继续显示示例数据，便于本地开发和静态演示。

## 元数据数据库与本地管理员

项目、环境、SDK Key、事件字典和验收记录通过 Postgres 元数据仓储读取。配置任一连接串即可启用：

```bash
TRACKINGHUB_POSTGRES_URL=postgres://trackinghub:trackinghub@localhost:5432/trackinghub
# 或 DATABASE_URL=postgres://trackinghub:trackinghub@localhost:5432/trackinghub
```

新库初始化：

```bash
psql "$TRACKINGHUB_POSTGRES_URL" -f ../../db/postgres/001_metadata_schema.sql
psql "$TRACKINGHUB_POSTGRES_URL" -f ../../db/postgres/002_local_bootstrap_admin.sql
```

旧库如果已经创建过 `event_validation_results`，追加执行一次验证结果 ID 迁移：

```bash
psql "$TRACKINGHUB_POSTGRES_URL" -f ../../db/postgres/003_event_validation_result_text_ids.sql
```

本地 bootstrap 管理员：`admin@example.com` / `trackinghub-admin`。共享环境或生产环境不要使用这个默认账号。

## 说明

- 用户可见产品文案默认使用中文。
- SDK API、事件字段、数据库字段保持英文，确保 Web 与 Flutter 端协议稳定。
- 当前首页是 MVP 静态管理壳，后续会接入项目、事件字典、验收结果和分析报表数据。

## UI 组件约定

- `src/components/ui/*` 由 shadcn/ui CLI 生成，优先保持上游组件结构。
- `src/components/trackinghub/*` 放 TrackingHub 业务组合组件。
- 页面文件只负责组织数据和组件，不堆叠大段卡片、表格或侧栏 JSX。
- 用户可见文案默认中文；SDK API、事件字段和数据库字段保持英文。
