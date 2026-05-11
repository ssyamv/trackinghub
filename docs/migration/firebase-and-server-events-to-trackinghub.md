# Firebase 与服务端埋点迁移到 TrackingHub 指南

本文档以 `magic_frame_app` 作为第一个正式项目，说明如何把 Flutter 端 Firebase Analytics 事件和服务端推送事件迁移到 TrackingHub。

## 迁移范围

- Firebase 事件来源：`/Users/chenqi/code/flutter/magic_frame_app/lib/common/firebase_lib/tracking_events.dart`
- Firebase 上报入口：`Tracker.track(...)`，最终调用 `FirebaseAnalytics.instance.logEvent(...)`
- 服务端推送事件来源：
  - `/Users/chenqi/code/flutter/magic_frame_app/lib/app/service/fcm/fcm_message_handler.dart`
  - `/Users/chenqi/code/flutter/magic_frame_app/lib/app/service/fcm/fcm_service.dart`
  - `/push/api/v1/events/{push_id}:upsert`
- TrackingHub 正式项目 slug：`magic_frame_app`
- TrackingHub SDK/API 上报的 `projectId` / `project_id`：导入脚本返回的项目 UUID。不要把 slug 当成上报用的 `project_id`。

当前导入脚本会解析 Firebase 事件常量，并合并服务端推送事件：

- `open`
- `click`
- `get_fcm_token_fail`

## 导入事件字典

先确认事件库存，不写数据库：

```bash
pnpm --filter web import:magic-frame -- --dry-run
```

如果 `magic_frame_app` 不在默认路径，指定源码目录：

```bash
TRACKINGHUB_MAGIC_FRAME_APP_PATH=/path/to/magic_frame_app \
pnpm --filter web import:magic-frame -- --dry-run
```

写入 TrackingHub Postgres：

```bash
TRACKINGHUB_POSTGRES_URL=postgres://trackinghub:trackinghub@localhost:15432/trackinghub \
pnpm --filter web import:magic-frame
```

脚本会 upsert：

- `projects.slug = magic_frame_app`
- Firebase Analytics 事件定义
- 服务端推送事件定义
- 服务端推送事件的已知属性定义

写入成功后，脚本会输出 `project=<uuid>`。这个 UUID 才是 Flutter SDK、服务端推送迁移、`/analytics` 和 `/reports` 查询中使用的 `project_id`；`magic_frame_app` slug 用于导入、识别和清理保留项目。

## 配置 Flutter SDK Key

正式迁移前，为 Magic Frame App 的 Flutter SDK 准备 `test`、`develop`、`production` 三套 write key，并通过环境变量交给导入脚本：

```bash
TRACKINGHUB_MAGIC_FRAME_FLUTTER_TEST_WRITE_KEY='test-write-key' \
TRACKINGHUB_MAGIC_FRAME_FLUTTER_DEVELOP_WRITE_KEY='develop-write-key' \
TRACKINGHUB_MAGIC_FRAME_FLUTTER_PRODUCTION_WRITE_KEY='production-write-key' \
TRACKINGHUB_POSTGRES_URL=postgres://trackinghub:trackinghub@localhost:15432/trackinghub \
pnpm --filter web import:magic-frame
```

脚本会为 `magic_frame_app` 创建或更新 `test`、`develop`、`production` 环境，并写入 `flutter` 来源的 SDK Key。未提供 write key 时，脚本只导入项目与事件字典，不创建环境 key。

## Flutter 端迁移步骤

1. 在 Magic Frame App 中新增 TrackingHub Flutter SDK 初始化配置，按环境读取对应 write key。
2. 使用 `trackinghub_flutter` 的 `TrackingHubHttpTransport` 创建默认 HTTP transport，避免在 App 内重复拼接 `/api/events` 请求。
3. 在 `Tracker.track(...)` 内新增 TrackingHub 双写，上报字段保持与 Firebase 事件名一致。
4. 双写必须非阻塞：TrackingHub 写入失败只记录日志，不影响 Firebase 原有上报和用户操作。
5. `userId`、`deviceId`、`appVersion`、语言、国家等上下文应来自 App 本地状态和设备状态，不依赖推送 payload。
6. 首轮双写阶段保留 Firebase Analytics，使用 TrackingHub `/governance` 对比 `raw_events` 和事件字典的 schema 验收结果。
7. 验收通过后，将 Firebase Analytics 作为回退或逐步关闭。
8. 每次新增事件时，先在 TrackingHub 事件字典中创建定义，再在 Flutter 端接入。

推荐接入形态：

```dart
final magicFrameProjectId = '<project uuid from import:magic-frame>';
final trackingHubTransport = TrackingHubHttpTransport();
final trackingHubQueueFile = File('$appSupportPath/trackinghub_event_queue.json');
final trackingHubClient = TrackingHubClient(
  config: TrackingHubConfig(
    endpoint: Uri.parse('https://tracking.example.com/api/events'),
    projectId: magicFrameProjectId,
    environment: TrackingHubEnvironment.production,
    writeKey: trackingHubWriteKey,
  ),
  transport: trackingHubTransport.call,
  queueStore: TrackingHubFileQueueStore(trackingHubQueueFile),
);
```

线上环境必须使用 `TrackingHubFileQueueStore` 这类持久队列；`TrackingHubMemoryQueueStore` 只适合单元测试或临时调试。队列默认保留 7 天、最多 1000 条、最多尝试 5 次；网络异常、超时、`408`、`425`、`429`、`5xx` 会进入重试，`400`、`401` 和其他不可恢复的 schema/key 错误会丢弃，避免无限重试。

在 `Tracker.track(...)` 中保留 Firebase 原上报，同时发起 TrackingHub 非阻塞上报：

```dart
unawaited(
  trackingHubClient.track(
    eventName,
    properties: params ?? const <String, Object?>{},
    userId: localUserId,
    deviceId: localDeviceId,
    appVersion: appVersion,
    context: {
      'locale': locale,
      'timezone': timezone,
    },
  ),
);
```

在 App 启动、登录态恢复、前后台切换回前台、网络恢复通知后主动补发：

```dart
unawaited(trackingHubClient.flush());
```

## 服务端推送事件迁移步骤

1. 将 `/push/api/v1/events/{push_id}:upsert` 的消费侧映射到 TrackingHub 事件接收 API，保持原始事件名 `open`、`click`、`get_fcm_token_fail`。
2. 将原接口字段映射为 TrackingHub envelope：
   - `eventId` -> `event_id`
   - `event` -> `event_name`
   - `ts` -> `timestamp`
   - `userId` -> `user_id`
   - `Device-Id` header -> `device_id`
   - `params` JSON -> `properties`
3. 推送事件应使用 Magic Frame App 项目 UUID 作为 `project_id`、`source = flutter`，环境由服务端配置决定。
4. 保持接口非阻塞；TrackingHub 写入失败时记录日志，不阻断推送打开或点击主流程。

## Web SDK 接入步骤

Web 端如果需要正式接入，开启 SDK 队列模式，不要只用直接 `fetch` 模式：

```ts
const trackingHub = createTrackingHubClient({
  endpoint: "https://tracking.example.com/api/events",
  projectId: magicFrameProjectId,
  environment: "prod",
  writeKey: trackingHubWriteKey,
  queue: {
    storageKey: "magic_frame_app:trackinghub:event_queue",
  },
});
```

浏览器环境默认使用 `localStorage` 持久化队列；也可以通过 `queue.storage` 传入兼容 `getItem`、`setItem`、`removeItem` 的自定义存储。`track()` 会先入队再自动尝试发送，因此页面弱网时不会直接丢事件。页面初始化、用户重新联网、页面重新可见时调用：

```ts
void trackingHub.flush();
```

Web SDK 与 Flutter SDK 使用相同重试语义：网络异常和 `408`、`425`、`429`、`5xx` 可重试，`400`、`401` 等不可恢复错误丢弃。默认队列最多 1000 条、事件保留 7 天、最多尝试 5 次；正式环境应为每个项目配置独立 `storageKey`，避免多个项目共享同一个浏览器队列。

## 清理非正式数据

正式切换前，只保留 `magic_frame_app` 项目和真实管理员账号。清理前先备份数据库，并确认生产 write key 已配置。

先 dry-run 查看将被清理的项目：

```bash
TRACKINGHUB_POSTGRES_URL=postgres://trackinghub:trackinghub@localhost:15432/trackinghub \
pnpm --filter web clear:non-production-data
```

确认无误后才执行删除：

```bash
TRACKINGHUB_POSTGRES_URL=postgres://trackinghub:trackinghub@localhost:15432/trackinghub \
pnpm --filter web clear:non-production-data -- --confirm
```

如果同时清理 ClickHouse 中非正式项目的事件行，显式加上 `--include-clickhouse` 并配置 ClickHouse 连接：

```bash
TRACKINGHUB_POSTGRES_URL=postgres://trackinghub:trackinghub@localhost:15432/trackinghub \
TRACKINGHUB_CLICKHOUSE_URL=http://localhost:18123 \
TRACKINGHUB_CLICKHOUSE_DATABASE=trackinghub \
TRACKINGHUB_CLICKHOUSE_USERNAME=writer \
TRACKINGHUB_CLICKHOUSE_PASSWORD=secret \
pnpm --filter web clear:non-production-data -- --confirm --include-clickhouse
```

推荐完整顺序：

1. 停止写入临时环境或本地客户端。
2. 导出或备份 Postgres 和 ClickHouse。
3. 运行 `pnpm --filter web clear:non-production-data` dry-run，确认只会保留 `magic_frame_app`。
4. 加 `--confirm` 删除非正式项目、reports 和 event definitions。
5. 必要时加 `--include-clickhouse` 删除 ClickHouse 中非 Magic Frame App 项目 UUID 的 `raw_events` 和 `event_validation_results`；脚本会先从 Postgres 用 `magic_frame_app` slug 解析出保留项目 UUID。
6. 重新运行 `/api/health`，确认 Postgres、ClickHouse、事件持久化和真实数据策略都是健康状态。

不要在未确认备份和项目 slug 前执行批量删除。

## 验收清单

- `pnpm --filter web import:magic-frame -- --dry-run` 输出事件库存有效。
- TrackingHub `/projects` 能看到 `Magic Frame App`。
- TrackingHub `/governance` 能看到迁移后的 Firebase 和服务端推送事件。
- `POST /api/events` 使用 Magic Frame App Flutter write key 返回成功。
- `/analytics?project_id=<Magic Frame App project UUID>&source=flutter` 能看到真实事件趋势。
- `/reports?project_id=<Magic Frame App project UUID>&report_action=daily_draft` 能生成并保存日报。
- Flutter 端开启飞行模式后调用 `Tracker.track(...)`，事件进入 `TrackingHubFileQueueStore`；关闭飞行模式并调用 `flush()` 后，事件补发成功且本地队列清空。
- Flutter 端模拟 TrackingHub 返回 `503` 时，事件保留并按退避重试；模拟 `401` 时，事件不再重试并从队列移除。
- Web 端断网或服务端 `503` 时事件进入浏览器队列；刷新页面重新创建 SDK 后调用 `flush()`，事件仍能从存储中恢复并补发。
