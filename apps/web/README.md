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

## 说明

- 用户可见产品文案默认使用中文。
- SDK API、事件字段、数据库字段保持英文，确保 Web 与 Flutter 端协议稳定。
- 当前首页是 MVP 静态管理壳，后续会接入项目、事件字典、验收结果和分析报表数据。

## UI 组件约定

- `src/components/ui/*` 由 shadcn/ui CLI 生成，优先保持上游组件结构。
- `src/components/trackinghub/*` 放 TrackingHub 业务组合组件。
- 页面文件只负责组织数据和组件，不堆叠大段卡片、表格或侧栏 JSX。
- 用户可见文案默认中文；SDK API、事件字段和数据库字段保持英文。
