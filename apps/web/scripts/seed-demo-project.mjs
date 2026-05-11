#!/usr/bin/env node
import { createHash } from "node:crypto";
import pg from "pg";

const { Pool } = pg;

const DEMO_PROJECT_SLUG = "trackinghub_demo_showcase";
const DEMO_PROJECT_NAME = "TrackingHub Demo";
const DEMO_WRITE_KEYS = {
  dev: {
    web: "th_demo_dev_web_write_key",
    flutter: "th_demo_dev_flutter_write_key",
  },
  staging: {
    web: "th_demo_staging_web_write_key",
    flutter: "th_demo_staging_flutter_write_key",
  },
  prod: {
    web: "th_demo_prod_web_write_key",
    flutter: "th_demo_prod_flutter_write_key",
  },
};

const DEMO_EVENTS = [
  demoEvent({
    name: "app_open",
    displayName: "应用启动",
    module: "基础行为",
    description: "用户打开应用或刷新 Web 控制台。",
    triggerTiming: "客户端启动并完成 TrackingHub SDK 初始化时触发。",
    platforms: ["web", "flutter"],
    status: "accepted",
    properties: [
      property("entry", "string", true, "启动入口。", "push"),
      property("app_version", "string", false, "客户端版本。", "3.8.0"),
    ],
  }),
  demoEvent({
    name: "homepage_view",
    displayName: "首页曝光",
    module: "访问转化",
    description: "用户进入首页或管理后台概览页。",
    triggerTiming: "首页首屏渲染完成后触发。",
    platforms: ["web", "flutter"],
    status: "released",
    properties: [
      property("layout", "string", true, "首页布局版本。", "v2"),
    ],
  }),
  demoEvent({
    name: "signup_view",
    displayName: "注册页曝光",
    module: "注册漏斗",
    description: "用户进入注册或试用开通页面。",
    triggerTiming: "注册页可见时触发。",
    platforms: ["web"],
    status: "released",
    properties: [
      property("campaign", "string", false, "来源活动。", "spring_launch"),
    ],
  }),
  demoEvent({
    name: "signup_submit",
    displayName: "注册提交",
    module: "注册漏斗",
    description: "用户提交注册表单。",
    triggerTiming: "表单校验通过并发起注册请求时触发。",
    platforms: ["web"],
    status: "ready",
    properties: [
      property("plan", "string", true, "用户选择的套餐。", "team"),
    ],
  }),
  demoEvent({
    name: "signup_success",
    displayName: "注册成功",
    module: "注册漏斗",
    description: "账号创建成功并进入产品。",
    triggerTiming: "注册接口返回成功后触发。",
    platforms: ["web"],
    status: "accepted",
    properties: [
      property("workspace_id", "string", true, "新建 workspace ID。", "ws_demo"),
    ],
  }),
  demoEvent({
    name: "purchase_start",
    displayName: "支付开始",
    module: "商业化",
    description: "用户进入支付或订阅确认流程。",
    triggerTiming: "支付确认页打开时触发。",
    platforms: ["web", "flutter"],
    status: "released",
    properties: [
      property("sku", "string", true, "商品或套餐标识。", "pro_monthly"),
      property("amount", "number", true, "订单金额。", 99),
    ],
  }),
  demoEvent({
    name: "purchase_success",
    displayName: "支付成功",
    module: "商业化",
    description: "支付完成并生成有效订单。",
    triggerTiming: "支付回调确认成功时触发。",
    platforms: ["web", "flutter"],
    status: "accepted",
    properties: [
      property("order_id", "string", true, "订单 ID。", "order_demo_001"),
      property("amount", "number", true, "实付金额。", 99),
    ],
  }),
  demoEvent({
    name: "parameter_lab_submit",
    displayName: "参数分析实验提交",
    module: "参数分析",
    description: "用于测试单个事件下多参数、多取值分布的演示事件。",
    triggerTiming: "用户在 demo 参数实验表单提交成功后触发。",
    platforms: ["web", "flutter"],
    status: "accepted",
    properties: [
      property("entry_source", "string", true, "实验入口来源。", "home_banner"),
      property("experiment_group", "string", true, "实验分组。", "variant_a"),
      property("plan", "string", true, "当前套餐。", "team"),
      property("button_label", "string", true, "触发提交的按钮文案。", "开始试用"),
      property("step_index", "number", true, "当前步骤序号。", 2),
      property("score_bucket", "string", false, "评分分桶。", "80-100"),
      property("is_first_submit", "boolean", false, "是否首次提交。", true),
    ],
  }),
  demoEvent({
    name: "pay_error",
    displayName: "支付异常",
    module: "商业化",
    description: "支付流程失败或用户遇到异常。",
    triggerTiming: "支付接口返回失败或客户端捕获异常时触发。",
    platforms: ["web", "flutter"],
    status: "ready",
    properties: [
      property("reason", "string", true, "失败原因。", "card_declined"),
    ],
  }),
  demoEvent({
    name: "report_export",
    displayName: "报告导出",
    module: "运营报告",
    description: "用户导出日报、周报或漏斗解释。",
    triggerTiming: "报告导出任务创建成功时触发。",
    platforms: ["web"],
    status: "draft",
    properties: [
      property("report_type", "string", true, "报告类型。", "daily"),
    ],
  }),
  demoEvent({
    name: "legacy_event",
    displayName: "旧版事件",
    module: "Schema 治理",
    description: "用于展示未知事件和治理告警的旧版事件。",
    triggerTiming: "旧 SDK 仍然上报时触发。",
    platforms: ["web"],
    status: "deprecated",
    properties: [
      property("legacy_name", "string", false, "旧事件名。", "old_pay"),
    ],
  }),
];

function demoEvent(input) {
  return input;
}

function property(name, type, required, description, exampleValue) {
  return {
    name,
    type,
    required,
    description,
    exampleValue,
  };
}

function readConfig(env) {
  return {
    databaseUrl: env.TRACKINGHUB_POSTGRES_URL ?? env.DATABASE_URL ?? "",
    workspaceName: env.TRACKINGHUB_WORKSPACE_NAME ?? "TrackingHub",
    clickHouseUrl: env.TRACKINGHUB_CLICKHOUSE_URL ?? env.CLICKHOUSE_URL ?? "",
    clickHouseDatabase:
      env.TRACKINGHUB_CLICKHOUSE_DATABASE ?? env.CLICKHOUSE_DATABASE ?? "",
    clickHouseUsername:
      env.TRACKINGHUB_CLICKHOUSE_USERNAME ?? env.CLICKHOUSE_USERNAME ?? "",
    clickHousePassword:
      env.TRACKINGHUB_CLICKHOUSE_PASSWORD ?? env.CLICKHOUSE_PASSWORD ?? "",
    skipClickHouse: process.argv.includes("--skip-clickhouse"),
    dryRun: process.argv.includes("--dry-run"),
  };
}

function hashValue(value) {
  return createHash("sha256").update(value).digest("hex");
}

function maskKey(value) {
  return `${value.slice(0, 10)}...${value.slice(-4)}`;
}

async function upsertWorkspace(client, workspaceName) {
  const result = await client.query(
    `WITH existing_workspace AS (
       SELECT id
         FROM workspaces
        ORDER BY created_at ASC
        LIMIT 1
     ),
     created_workspace AS (
       INSERT INTO workspaces (name)
       SELECT $1
        WHERE NOT EXISTS (SELECT 1 FROM existing_workspace)
       RETURNING id
     )
     SELECT id FROM existing_workspace
     UNION ALL
     SELECT id FROM created_workspace
     LIMIT 1`,
    [workspaceName],
  );

  const workspaceId = result.rows[0]?.id;
  if (!workspaceId) {
    throw new Error("无法创建或读取 workspace");
  }

  return workspaceId;
}

async function upsertProject(client, workspaceId) {
  const result = await client.query(
    `INSERT INTO projects
       (workspace_id, name, slug, description, status)
     VALUES
       ($1, $2, $3, $4, 'active')
     ON CONFLICT (workspace_id, slug)
     DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       status = 'active',
       updated_at = now()
     RETURNING id`,
    [
      workspaceId,
      DEMO_PROJECT_NAME,
      DEMO_PROJECT_SLUG,
      "固定数据演示项目，用于展示项目管理、埋点治理、分析、漏斗、日报和异常解释能力。",
    ],
  );

  return result.rows[0].id;
}

async function upsertEnvironmentsAndKeys(client, projectId) {
  let sdkKeyCount = 0;

  for (const [environment, writeKeys] of Object.entries(DEMO_WRITE_KEYS)) {
    const environmentResult = await client.query(
      `INSERT INTO project_environments
         (project_id, name, write_key_hash, enabled)
       VALUES
         ($1, $2, 'managed-in-sdk-keys', true)
       ON CONFLICT (project_id, name)
       DO UPDATE SET enabled = true, updated_at = now()
       RETURNING id`,
      [projectId, environment],
    );
    const environmentId = environmentResult.rows[0].id;

    for (const [source, writeKey] of Object.entries(writeKeys)) {
      await client.query(
        `INSERT INTO sdk_keys
           (project_environment_id, source, key_hash, masked_key, status, last_used_at)
         VALUES
           ($1, $2, $3, $4, 'active', now() - interval '2 hours')
         ON CONFLICT (project_environment_id, source, masked_key)
         DO UPDATE SET
           key_hash = EXCLUDED.key_hash,
           status = 'active',
           last_used_at = EXCLUDED.last_used_at,
           updated_at = now()`,
        [environmentId, source, hashValue(writeKey), maskKey(writeKey)],
      );
      sdkKeyCount += 1;
    }
  }

  return sdkKeyCount;
}

async function upsertEventDefinition(client, projectId, event) {
  const result = await client.query(
    `INSERT INTO event_definitions
       (project_id, name, display_name, description, trigger_timing, module, platforms, status)
     VALUES
       ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (project_id, name)
     DO UPDATE SET
       display_name = EXCLUDED.display_name,
       description = EXCLUDED.description,
       trigger_timing = EXCLUDED.trigger_timing,
       module = EXCLUDED.module,
       platforms = EXCLUDED.platforms,
       status = EXCLUDED.status,
       updated_at = now()
     RETURNING id`,
    [
      projectId,
      event.name,
      event.displayName,
      event.description,
      event.triggerTiming,
      event.module,
      event.platforms,
      event.status,
    ],
  );

  return result.rows[0].id;
}

async function upsertEventProperties(client, eventDefinitionId, properties) {
  for (const eventProperty of properties) {
    await client.query(
      `INSERT INTO event_property_definitions
         (event_definition_id, name, type, required, description, example_value)
       VALUES
         ($1, $2, $3, $4, $5, $6::jsonb)
       ON CONFLICT (event_definition_id, name)
       DO UPDATE SET
         type = EXCLUDED.type,
         required = EXCLUDED.required,
         description = EXCLUDED.description,
         example_value = EXCLUDED.example_value,
         updated_at = now()`,
      [
        eventDefinitionId,
        eventProperty.name,
        eventProperty.type,
        eventProperty.required,
        eventProperty.description,
        JSON.stringify(eventProperty.exampleValue),
      ],
    );
  }
}

function buildValidationRows(projectId, definitionIds) {
  const rows = [
    validationRow(projectId, definitionIds.app_open, "app_open", "prod", "flutter", "valid", []),
    validationRow(projectId, definitionIds.signup_success, "signup_success", "prod", "web", "valid", []),
    validationRow(projectId, definitionIds.purchase_success, "purchase_success", "prod", "web", "valid", []),
    validationRow(
      projectId,
      definitionIds.pay_error,
      "pay_error",
      "prod",
      "flutter",
      "invalid",
      ["properties.reason is required"],
    ),
    validationRow(
      projectId,
      null,
      "unknown_checkout_retry",
      "staging",
      "web",
      "unknown_event",
      ["event_name 未在事件字典中定义"],
    ),
  ];

  return rows.map((row, index) => ({
    ...row,
    id: `demo-validation-${index + 1}`,
    sampleEventId: `demo-sample-${index + 1}`,
  }));
}

function validationRow(
  projectId,
  eventDefinitionId,
  eventName,
  environment,
  source,
  status,
  errors,
) {
  return {
    projectId,
    eventDefinitionId,
    eventName,
    environment,
    source,
    status,
    errors,
  };
}

async function upsertValidationRows(client, validationRows) {
  for (const row of validationRows) {
    await client.query(
      `INSERT INTO event_validation_results
         (id, project_id, event_definition_id, event_name, environment, source, status, errors, sample_event_id, observed_at)
       VALUES
         ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, now() - ($10::int * interval '35 minutes'))
       ON CONFLICT (id)
       DO UPDATE SET
         project_id = EXCLUDED.project_id,
         event_definition_id = EXCLUDED.event_definition_id,
         event_name = EXCLUDED.event_name,
         environment = EXCLUDED.environment,
         source = EXCLUDED.source,
         status = EXCLUDED.status,
         errors = EXCLUDED.errors,
         sample_event_id = EXCLUDED.sample_event_id,
         observed_at = EXCLUDED.observed_at`,
      [
        row.id,
        row.projectId,
        row.eventDefinitionId,
        row.eventName,
        row.environment,
        row.source,
        row.status,
        JSON.stringify(row.errors),
        row.sampleEventId,
        Number(row.id.split("-").at(-1)),
      ],
    );
  }
}

async function resetDemoReports(client, projectId) {
  await client.query(
    "DELETE FROM reports WHERE project_id = $1 AND generated_by = 'demo-seed'",
    [projectId],
  );

  const reports = [
    {
      type: "daily",
      title: "TrackingHub Demo 每日运营摘要",
      content:
        "过去 7 天 demo 项目保持稳定接入，注册漏斗、支付漏斗和 Schema 校验样本均可用于产品演示。",
    },
    {
      type: "funnel_dropoff",
      title: "注册漏斗掉点解释",
      content:
        "signup_view 到 signup_submit 存在主要流失，建议拆解来源活动、套餐选择和表单错误。",
    },
    {
      type: "schema_quality",
      title: "Schema 治理摘要",
      content:
        "pay_error 缺少 reason 字段，staging 仍有 unknown_checkout_retry 未纳入事件字典。",
    },
  ];

  for (const report of reports) {
    await client.query(
      `INSERT INTO reports
         (project_id, type, title, content, source_query_refs, generated_by, generated_at)
       VALUES
         ($1, $2, $3, $4, $5::jsonb, 'demo-seed', now() - interval '1 hour')`,
      [
        projectId,
        report.type,
        report.title,
        report.content,
        JSON.stringify([
          {
            project_id: projectId,
            source: "demo_seed",
            slug: DEMO_PROJECT_SLUG,
          },
        ]),
      ],
    );
  }
}

async function seedPostgres(config) {
  const pool = new Pool({ connectionString: config.databaseUrl });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const workspaceId = await upsertWorkspace(client, config.workspaceName);
    const projectId = await upsertProject(client, workspaceId);
    const sdkKeyCount = await upsertEnvironmentsAndKeys(client, projectId);
    const definitionIds = {};

    for (const event of DEMO_EVENTS) {
      const eventDefinitionId = await upsertEventDefinition(client, projectId, event);
      definitionIds[event.name] = eventDefinitionId;
      await upsertEventProperties(client, eventDefinitionId, event.properties);
    }

    const validationRows = buildValidationRows(projectId, definitionIds);
    await upsertValidationRows(client, validationRows);
    await resetDemoReports(client, projectId);
    await client.query("COMMIT");

    return {
      projectId,
      eventCount: DEMO_EVENTS.length,
      environmentCount: Object.keys(DEMO_WRITE_KEYS).length,
      sdkKeyCount,
      validationRows,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

function clickHouseHeaders(config) {
  const headers = {};

  if (config.clickHouseUsername && config.clickHousePassword) {
    headers.Authorization = `Basic ${Buffer.from(
      `${config.clickHouseUsername}:${config.clickHousePassword}`,
    ).toString("base64")}`;
  }

  return headers;
}

function clickHouseUrl(config, query) {
  const url = new URL(config.clickHouseUrl);
  url.searchParams.set("query", query);

  if (config.clickHouseDatabase) {
    url.searchParams.set("database", config.clickHouseDatabase);
  }

  return url;
}

async function executeClickHouse(config, query, body) {
  const response = await fetch(clickHouseUrl(config, query), {
    method: "POST",
    headers: clickHouseHeaders(config),
    body,
  });

  if (!response.ok) {
    throw new Error(`ClickHouse 写入失败: ${response.status} ${await response.text()}`);
  }
}

function toClickHouseDate(date) {
  return date.toISOString().replace("T", " ").replace("Z", "");
}

function demoUuid(sequence) {
  return `00000000-0000-4000-8000-${sequence.toString(16).padStart(12, "0")}`;
}

function buildRawEvents(projectId) {
  const now = new Date();
  const rows = [];
  let sequence = 1;

  for (let day = 0; day < 7; day += 1) {
    const users = 42 - day * 3;

    for (let user = 1; user <= users; user += 1) {
      const base = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
      const source = user % 3 === 0 ? "flutter" : "web";
      const environment = user % 11 === 0 ? "staging" : "prod";
      const userId = `demo_user_${user.toString().padStart(3, "0")}`;

      sequence = pushRawEvent(rows, sequence, projectId, {
        base,
        environment,
        source,
        eventName: "app_open",
        userId,
        minuteOffset: 1,
      });
      sequence = pushRawEvent(rows, sequence, projectId, {
        base,
        environment,
        source,
        eventName: "homepage_view",
        userId,
        minuteOffset: 3,
      });

      if (user % 2 === 0) {
        sequence = pushRawEvent(rows, sequence, projectId, {
          base,
          environment,
          source: "web",
          eventName: "signup_view",
          userId,
          minuteOffset: 8,
        });
      }

      if (user % 3 === 0) {
        sequence = pushRawEvent(rows, sequence, projectId, {
          base,
          environment,
          source: "web",
          eventName: "signup_submit",
          userId,
          minuteOffset: 12,
        });
      }

      if (user % 5 === 0) {
        sequence = pushRawEvent(rows, sequence, projectId, {
          base,
          environment,
          source: "web",
          eventName: "signup_success",
          userId,
          minuteOffset: 16,
        });
      }

      if (user % 4 === 0) {
        sequence = pushRawEvent(rows, sequence, projectId, {
          base,
          environment,
          source,
          eventName: "purchase_start",
          userId,
          minuteOffset: 22,
          properties: { sku: "pro_monthly", amount: 99 },
        });
      }

      if (user % 9 === 0) {
        sequence = pushRawEvent(rows, sequence, projectId, {
          base,
          environment,
          source,
          eventName: "purchase_success",
          userId,
          minuteOffset: 28,
          properties: { order_id: `order_${day}_${user}`, amount: 99 },
        });
      }

      if (user % 2 === 1 || user % 7 === 0) {
        const entrySources = ["home_banner", "settings_card", "push_message", "report_cta"];
        const experimentGroups = ["variant_a", "variant_b", "control"];
        const plans = ["free", "team", "pro"];
        const buttonLabels = ["开始试用", "保存配置", "查看报告", "立即升级"];
        const scoreBuckets = ["0-39", "40-79", "80-100"];
        const stepIndex = (user % 4) + 1;

        sequence = pushRawEvent(rows, sequence, projectId, {
          base,
          environment,
          source,
          eventName: "parameter_lab_submit",
          userId,
          minuteOffset: 34,
          properties: {
            entry_source: entrySources[(user + day) % entrySources.length],
            experiment_group:
              experimentGroups[(user + day * 2) % experimentGroups.length],
            plan: plans[(user + day) % plans.length],
            button_label: buttonLabels[(user + stepIndex) % buttonLabels.length],
            step_index: stepIndex,
            score_bucket: scoreBuckets[(user + day) % scoreBuckets.length],
            is_first_submit: day === 0 && user % 5 === 1,
          },
        });
      }

      if (user % 13 === 0) {
        sequence = pushRawEvent(rows, sequence, projectId, {
          base,
          environment,
          source,
          eventName: "pay_error",
          userId,
          minuteOffset: 30,
          properties: { code: "card_declined" },
        });
      }
    }
  }

  return rows;
}

function pushRawEvent(rows, sequence, projectId, input) {
  const timestamp = new Date(input.base.getTime() + input.minuteOffset * 60 * 1000);

  rows.push({
    event_id: demoUuid(sequence),
    project_id: projectId,
    environment: input.environment,
    source: input.source,
    event_name: input.eventName,
    user_id: input.userId,
    anonymous_id: null,
    device_id: `demo_device_${input.userId}`,
    session_id: `demo_session_${input.userId}`,
    timestamp: toClickHouseDate(timestamp),
    received_at: toClickHouseDate(new Date(timestamp.getTime() + 1000)),
    app_version: "3.8.0",
    sdk_version: input.source === "web" ? "web-demo-1.0.0" : "flutter-demo-1.0.0",
    channel: input.source === "web" ? "web_console" : "mobile_app",
    campaign: "demo_showcase",
    country: "CN",
    properties: JSON.stringify(input.properties ?? {}),
    context: JSON.stringify({ seed: "trackinghub_demo_showcase" }),
  });

  return sequence + 1;
}

function buildClickHouseValidationRows(validationRows) {
  const now = new Date();

  return validationRows.map((row, index) => ({
    id: row.id,
    project_id: row.projectId,
    event_definition_id: row.eventDefinitionId,
    event_name: row.eventName,
    environment: row.environment,
    source: row.source,
    status: row.status,
    errors: JSON.stringify(row.errors),
    sample_event_id: row.sampleEventId,
    observed_at: toClickHouseDate(
      new Date(now.getTime() - (index + 1) * 35 * 60 * 1000),
    ),
  }));
}

async function seedClickHouse(config, projectId, validationRows) {
  const rawEvents = buildRawEvents(projectId);
  const clickHouseValidationRows = buildClickHouseValidationRows(validationRows);

  await executeClickHouse(
    config,
    `ALTER TABLE raw_events DELETE WHERE project_id = '${projectId.replaceAll("'", "''")}'`,
  );
  await executeClickHouse(
    config,
    `ALTER TABLE event_validation_results DELETE WHERE project_id = '${projectId.replaceAll("'", "''")}'`,
  );
  await executeClickHouse(
    config,
    "INSERT INTO raw_events FORMAT JSONEachRow",
    rawEvents.map((row) => JSON.stringify(row)).join("\n"),
  );
  await executeClickHouse(
    config,
    "INSERT INTO event_validation_results FORMAT JSONEachRow",
    clickHouseValidationRows.map((row) => JSON.stringify(row)).join("\n"),
  );

  return {
    rawEventCount: rawEvents.length,
    validationCount: clickHouseValidationRows.length,
  };
}

async function main() {
  const config = readConfig(process.env);

  if (config.dryRun) {
    console.log(
      `Demo project seed is valid: ${DEMO_EVENTS.length} events, ${Object.keys(DEMO_WRITE_KEYS).length} environments, ${Object.keys(DEMO_WRITE_KEYS).length * 2} SDK keys`,
    );
    return;
  }

  if (!config.databaseUrl) {
    console.error("TRACKINGHUB_POSTGRES_URL 或 DATABASE_URL 不能为空");
    process.exit(1);
  }

  const postgresResult = await seedPostgres(config);
  let clickHouseResult = null;

  if (config.clickHouseUrl && !config.skipClickHouse) {
    clickHouseResult = await seedClickHouse(
      config,
      postgresResult.projectId,
      postgresResult.validationRows,
    );
  }

  console.log(
    `Demo project seeded: project=${postgresResult.projectId}, events=${postgresResult.eventCount}, environments=${postgresResult.environmentCount}, sdkKeys=${postgresResult.sdkKeyCount}`,
  );

  if (clickHouseResult) {
    console.log(
      `Demo ClickHouse data seeded: rawEvents=${clickHouseResult.rawEventCount}, validationResults=${clickHouseResult.validationCount}`,
    );
  } else {
    console.log("ClickHouse 未配置或已跳过；分析/报告页需要 ClickHouse 数据才能展示 demo 指标。");
  }

  console.log(`Use project id ${postgresResult.projectId} with project_id query filters.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
