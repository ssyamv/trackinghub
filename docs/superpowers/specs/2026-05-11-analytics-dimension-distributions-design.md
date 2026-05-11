# Analytics 统一维度分布设计

## 背景

TrackingHub 的 `/analytics` 已经接入真实 ClickHouse 查询，支持项目、环境、平台、时间范围、事件名筛选，并提供指标卡、事件趋势、事件参数分析和漏斗诊断。下一步需要把运营常用的用户分布统计统一补齐，优先帮助产品和运营判断用户集中在哪些 App 版本、地区、渠道、设备系统和设备型号上。

当前 `raw_events` 已有 `app_version`、`channel`、`country` 独立列；设备系统和设备型号尚未独立建列，但事件 envelope 保留了 `context` JSON，可先从约定 key 中抽取，避免第一版引入 ClickHouse 表结构迁移风险。

## 目标

- 在 `/analytics` 增加“用户分布”区域，面向运营和产品默认展示核心分布。
- 后端提供统一维度分布模型，第一版覆盖 App 版本、用户地区、渠道、设备系统、设备型号。
- 所有维度沿用现有分析筛选条件，保证和当前指标卡、趋势、事件参数分析口径一致。
- 输出事件数、唯一用户数、占比和 Top 排名，便于快速发现版本集中度、地区结构和渠道质量。
- 让同一份聚合结果后续可复用到 `/reports` 的日报洞察中。

## 非目标

- 第一版不做自由维度分析器，不让用户任意输入字段名。
- 第一版不调整 ClickHouse `raw_events` 表结构；设备字段暂从 `context` 抽取。
- 第一版不把设备系统、设备型号自动采集逻辑强绑定到宿主 App；SDK 先明确并测试传入契约。
- 第一版不改报告正文生成，只保留数据结构可复用空间。

## 维度定义

统一维度配置包含 5 组：

| key | 展示名 | 数据来源 | 空值 |
| --- | --- | --- | --- |
| `app_version` | App 版本 | `raw_events.app_version` | `未提供` |
| `country` | 用户地区 | `raw_events.country` | `未提供` |
| `channel` | 渠道 | `raw_events.channel` | `未提供` |
| `device_os` | 设备系统 | `context.os_name` 和 `context.os_version` 组合 | `未提供` |
| `device_model` | 设备型号 | `context.device_model` | `未提供` |

设备系统展示规则：

- 同时存在 `os_name` 和 `os_version` 时展示为 `${os_name} ${os_version}`。
- 只有 `os_name` 时展示 `os_name`。
- 两者都缺失时展示 `未提供`。

## 后端设计

`AnalyticsData` 新增 `dimensionGroups`：

```ts
export type AnalyticsDimensionGroup = {
  key: "app_version" | "country" | "channel" | "device_os" | "device_model";
  label: string;
  items: AnalyticsDimensionItem[];
};

export type AnalyticsDimensionItem = {
  value: string;
  eventCount: string;
  eventCountValue: number;
  uniqueUsers: string;
  uniqueUsersValue: number;
  share: string;
  shareValue: number;
};
```

查询层新增统一维度分布查询：

- 对每个维度生成一个子查询，统一返回 `dimension_key`、`dimension_label`、`dimension_value`、`event_count`、`unique_users`、`total_events`。
- 每个维度按 `event_count DESC` 取 Top 10。
- `shareValue = event_count / total_events`，`share` 使用百分比格式化。
- 过滤条件复用现有 `filterConditions(...)`，包括项目、环境、平台、时间范围和事件名。
- 唯一用户口径继续使用现有 `identityExpression()`：`user_id`、`anonymous_id`、`device_id`、`session_id`、`event_id` 依次兜底。

设备字段抽取使用 ClickHouse JSON 函数从 `context` 字符串读取：

- `JSONExtractString(context, 'os_name')`
- `JSONExtractString(context, 'os_version')`
- `JSONExtractString(context, 'device_model')`

如果 ClickHouse 返回空字符串或 `NULL`，映射为 `未提供`。

## 前端设计

`/analytics` 在指标卡下方、事件趋势上方新增“用户分布”区域：

- 使用同一个组件渲染 5 张分布卡片。
- 每张卡片展示维度标题、Top 10 明细、事件数、唯一用户数、占比进度条。
- 卡片文案使用中文运营口径，不展示 ClickHouse、字段名、JSON 抽取等实现说明。
- 空数据时展示统一空状态：当前筛选范围暂无用户分布数据。

布局建议：

- 桌面端：两到三列自适应卡片。
- 移动端：单列堆叠。
- 保持现有页面的紧凑工作台风格，不新增营销式说明区。

## SDK 与采集契约

第一版要求 SDK 和调用方遵循以下 `context` key：

```json
{
  "os_name": "iOS",
  "os_version": "18.4",
  "device_model": "iPhone16,2"
}
```

Web SDK 和 Flutter SDK 不强制自动采集这些字段，但测试要覆盖这些 key 可以随 envelope 传入并原样发送。Magic Frame App 后续接入时应从本地设备/App 信息填充这些字段。

## 错误与边界

- ClickHouse 不可用时沿用现有分析不可用逻辑，不单独为维度分布降级。
- 某个维度没有数据时，该维度卡片显示空状态，不影响其他维度。
- `context` 不是合法 JSON 或缺少设备字段时，该事件计入 `未提供`。
- 维度值过长时前端截断显示，完整值保留在 `title` 或可访问文本中。

## 测试计划

- `clickhouse-analytics.test.ts`：
  - 覆盖维度分布查询包含 5 个维度。
  - 覆盖 App 版本、地区、渠道映射。
  - 覆盖设备系统由 `os_name` 和 `os_version` 组合。
  - 覆盖空值映射为 `未提供`。
  - 覆盖占比格式化。
- 组件测试：
  - 确认 5 个分布卡片渲染。
  - 确认 Top 明细展示事件数、唯一用户数和占比。
  - 确认空数据状态。
- 全量验证：
  - 执行 `pnpm run check`。

## 后续演进

- 当设备维度成为高频查询后，可以把 `device_os`、`device_model` 提升为 ClickHouse 独立列或物化视图。
- `/reports` 可复用 `dimensionGroups`，在日报中补充版本集中度、地区结构和渠道变化。
- 后续可新增设备品牌、系统主版本、语言、商店区域等运营维度，但仍通过同一配置模型接入。
