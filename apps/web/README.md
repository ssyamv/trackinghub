# TrackingHub Web

TrackingHub Web 是内部多项目埋点治理与产品分析平台的管理后台。

## 本地开发

在仓库根目录运行：

```bash
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看页面。

环境变量可以从仓库根目录的 `.env.example` 复制：

```bash
cp .env.example .env.local
```

## 常用命令

```bash
pnpm run lint
pnpm run test
pnpm run build
```

## 容器化运行

仓库根目录提供 `docker-compose.yml`，会启动 Postgres、ClickHouse 和生产模式 Web：

```bash
docker compose up --build
```

初始化脚本会自动创建元数据表和 ClickHouse 事件表。首次启动后，先用 `bootstrap:admin` 创建管理员，再访问 [http://localhost:3000/login](http://localhost:3000/login)。

运行状态可通过 [http://localhost:3000/api/health](http://localhost:3000/api/health) 查看。生产依赖缺失或连接失败时会返回 `503`。

Compose 默认把 Postgres 暴露到宿主机 `15432`、ClickHouse HTTP 暴露到 `18123`，避免和本机常见的 `5432` / `8123` 服务冲突。需要改端口时在仓库根目录 `.env` 中设置：

```bash
TRACKINGHUB_WEB_PORT=3000
TRACKINGHUB_POSTGRES_PORT=15432
TRACKINGHUB_CLICKHOUSE_HTTP_PORT=18123
TRACKINGHUB_CLICKHOUSE_NATIVE_PORT=19000
```

## 事件写入配置

`POST /api/events` 校验通过后会写入 ClickHouse `raw_events`。本地未配置 ClickHouse 时使用空写入器，便于 UI 与 SDK 开发。

```bash
TRACKINGHUB_CLICKHOUSE_URL=http://localhost:18123
TRACKINGHUB_CLICKHOUSE_DATABASE=trackinghub
TRACKINGHUB_CLICKHOUSE_USERNAME=writer
TRACKINGHUB_CLICKHOUSE_PASSWORD=secret
```

共享环境或生产环境必须启用事件持久化保护，避免事件被 API 接收后写入空实现：

```bash
TRACKINGHUB_REQUIRE_EVENT_PERSISTENCE=true
```

当 `NODE_ENV=production` 或 `TRACKINGHUB_REQUIRE_EVENT_PERSISTENCE=true` 且未配置 ClickHouse URL 时，`POST /api/events` 会返回 `503`，不会返回接收成功。

## 分析查询配置

`/analytics` 会优先使用同一组 ClickHouse 配置读取真实 `raw_events` 和 `event_validation_results`，生成概览、事件趋势和漏斗。页面筛选器通过 URL 查询参数驱动，支持 `project_id`、`environment`、`source`、`event_name`、`funnel_steps`、`range=7d|30d` 和 `granularity=day|hour`。`project_id` 使用 Postgres 项目 UUID。`funnel_steps` 使用英文逗号分隔事件名；未提供或不足 2 步时不计算漏斗。

分析、报告和首页不回显占位数据；当 ClickHouse 不可用时，页面会显示“真实数据源不可用”或空状态。

## Demo 项目

如需展示平台全能力，可以写入一个固定数据的 `TrackingHub Demo` 项目。脚本会幂等写入 Postgres 项目、环境、SDK Key、事件字典、验证样本和报告；配置 ClickHouse 时还会写入最近 7 天的演示事件和验证结果。

```bash
pnpm --filter web seed:demo-project -- --dry-run
pnpm --filter web seed:demo-project
```

如果只想写入 Postgres 元数据，可追加 `--skip-clickhouse`。写入成功后，左侧导航的“当前项目”可切换到 demo 项目，并把 `project_id` 保留到分析、治理和报告页面。

## 报告持久化

`POST /api/reports` 可将生成后的日报、异常解释、漏斗掉点解释等报告写入 Postgres `reports` 表；`GET /api/reports?project_id=<project_id>` 可读取项目最近报告。读取需要登录，写入需要 `admin` 或 `editor` 角色。

在 `/reports` 页面生成日报草稿时，如果 URL 筛选条件包含 `project_id`，页面会展示“保存日报”按钮并调用 `/api/reports` 保存当前草稿和 `sourceQueryRefs`。

## Magic Frame App 事件迁移

`magic_frame_app` 是 TrackingHub 的第一个正式项目。事件字典可从 Flutter 源码导入：

```bash
pnpm --filter web import:magic-frame -- --dry-run
```

正式写入 Postgres 前，配置 `TRACKINGHUB_POSTGRES_URL`；如需同时创建 Flutter SDK Key，配置 `TRACKINGHUB_MAGIC_FRAME_FLUTTER_TEST_WRITE_KEY`、`TRACKINGHUB_MAGIC_FRAME_FLUTTER_DEVELOP_WRITE_KEY` 和 `TRACKINGHUB_MAGIC_FRAME_FLUTTER_PRODUCTION_WRITE_KEY`。`magic_frame_app` 的正式环境名为 `test`、`develop`、`production`。

写入成功后，导入脚本会输出 `project=<uuid>`。这个 UUID 是 Flutter SDK、服务端推送上报、`/analytics` 和 `/reports` 使用的 `project_id`；`magic_frame_app` slug 只用于导入、识别和清理保留项目。

迁移步骤见仓库根目录 `docs/migration/firebase-and-server-events-to-trackinghub.md`。

## SDK 弱网与离线队列

正式环境接入 SDK 时必须开启可靠投递：

- Flutter SDK 使用 `TrackingHubFileQueueStore`，由 App 传入应用支持目录下的队列文件；`TrackingHubMemoryQueueStore` 仅用于测试或临时调试。
- Web SDK 在 `createTrackingHubClient` 中配置 `queue`，浏览器默认使用 `localStorage`，建议按项目设置独立 `storageKey`。
- 两端都会先入队再尝试发送；网络异常、超时、`408`、`425`、`429`、`5xx` 会重试，`400`、`401` 等不可恢复错误会从队列丢弃。
- App 启动、网络恢复、页面重新可见或前后台切换回来时，应主动调用 SDK 的 `flush()` 补发队列。

## 元数据数据库与本地管理员

项目、环境、SDK Key、事件字典和验收记录通过 Postgres 元数据仓储读取。配置任一连接串即可启用：

```bash
TRACKINGHUB_POSTGRES_URL=postgres://trackinghub:trackinghub@localhost:15432/trackinghub
# 或 DATABASE_URL=postgres://trackinghub:trackinghub@localhost:15432/trackinghub
```

新库初始化：

```bash
psql "$TRACKINGHUB_POSTGRES_URL" -f ../../db/postgres/001_metadata_schema.sql
```

旧库如果已经创建过 `event_validation_results`，追加执行验证结果 ID 迁移和 Magic Frame App 环境名迁移：

```bash
psql "$TRACKINGHUB_POSTGRES_URL" -f ../../db/postgres/003_event_validation_result_text_ids.sql
psql "$TRACKINGHUB_POSTGRES_URL" -f ../../db/postgres/004_magic_frame_environment_names.sql
```

启用 Postgres 后，受保护管理页面和写入 API 会校验 session。打开 `/login` 使用本地账号登录。

使用环境变量初始化管理员：

```bash
TRACKINGHUB_POSTGRES_URL=postgres://trackinghub:trackinghub@localhost:15432/trackinghub \
TRACKINGHUB_ADMIN_EMAIL=admin@your-company.com \
TRACKINGHUB_ADMIN_PASSWORD='replace-with-a-long-random-password' \
TRACKINGHUB_ADMIN_NAME='平台管理员' \
pnpm --filter web bootstrap:admin -- --dry-run
```

确认配置无误后去掉 `--dry-run` 执行。脚本会创建首个 workspace，并创建或更新 admin 用户。

## 说明

- 用户可见产品文案默认使用中文。
- SDK API、事件字段、数据库字段保持英文，确保 Web 与 Flutter 端协议稳定。
- 共享环境和生产环境应保持 `TRACKINGHUB_REQUIRE_EVENT_PERSISTENCE=true` 与 `TRACKINGHUB_REQUIRE_REAL_DATA=true`。

## UI 组件约定

- `src/components/ui/*` 由 shadcn/ui CLI 生成，优先保持上游组件结构。
- `src/components/trackinghub/*` 放 TrackingHub 业务组合组件。
- 页面文件只负责组织数据和组件，不堆叠大段卡片、表格或侧栏 JSX。
- 用户可见文案默认中文；SDK API、事件字段和数据库字段保持英文。
