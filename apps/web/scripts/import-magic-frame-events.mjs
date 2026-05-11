#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";

const { Pool } = pg;

const DEFAULT_MAGIC_FRAME_APP_PATH = "/Users/chenqi/code/flutter/magic_frame_app";
const TRACKING_EVENTS_PATH = "lib/common/firebase_lib/tracking_events.dart";

const SERVER_PUSH_EVENTS = [
  {
    name: "open",
    displayName: "推送打开",
    module: "推送服务端上报",
    description: "服务端推送事件接口：用户打开推送。",
    triggerTiming: "FCM 通知被用户打开时上报。",
    properties: [
      property("scene", "string", "推送消息 type 或业务场景。", "marketing_campaign"),
      property("target_page", "string", "推送落地页、外部 URL 或路由。", "/activity/spring_sale"),
    ],
  },
  {
    name: "click",
    displayName: "推送点击",
    module: "推送服务端上报",
    description: "服务端推送事件接口：用户点击推送。",
    triggerTiming: "FCM 通知点击回调触发时上报。",
    properties: [
      property("scene", "string", "推送消息 type 或业务场景。", "survey"),
      property("target_page", "string", "推送落地页、外部 URL 或路由。", "/settings"),
    ],
  },
  {
    name: "get_fcm_token_fail",
    displayName: "FCM Token 获取失败",
    module: "推送服务端上报",
    description: "服务端推送事件接口：记录 FCM Token 获取失败。",
    triggerTiming: "获取 FCM Token 抛错时上报。",
    properties: [property("reason", "string", "Token 获取失败原因。", "permission_denied")],
  },
];

const WRITE_KEY_ENV_BY_ENVIRONMENT = {
  test: "TRACKINGHUB_MAGIC_FRAME_FLUTTER_TEST_WRITE_KEY",
  develop: "TRACKINGHUB_MAGIC_FRAME_FLUTTER_DEVELOP_WRITE_KEY",
  production: "TRACKINGHUB_MAGIC_FRAME_FLUTTER_PRODUCTION_WRITE_KEY",
};

const LEGACY_MAGIC_FRAME_ENVIRONMENTS = ["dev", "staging", "prod"];

function property(name, type, description, exampleValue) {
  return {
    name,
    type,
    required: false,
    description,
    allowedValues: [],
    exampleValue,
  };
}

function readConfig(env) {
  return {
    databaseUrl: env.TRACKINGHUB_POSTGRES_URL ?? env.DATABASE_URL ?? "",
    workspaceName: env.TRACKINGHUB_WORKSPACE_NAME ?? "TrackingHub",
    magicFrameAppPath:
      env.TRACKINGHUB_MAGIC_FRAME_APP_PATH ??
      env.MAGIC_FRAME_APP_PATH ??
      DEFAULT_MAGIC_FRAME_APP_PATH,
    writeKeys: {
      test: env.TRACKINGHUB_MAGIC_FRAME_FLUTTER_TEST_WRITE_KEY ?? "",
      develop: env.TRACKINGHUB_MAGIC_FRAME_FLUTTER_DEVELOP_WRITE_KEY ?? "",
      production: env.TRACKINGHUB_MAGIC_FRAME_FLUTTER_PRODUCTION_WRITE_KEY ?? "",
    },
  };
}

async function loadMagicFrameEvents(magicFrameAppPath) {
  const trackingEventsFile = join(magicFrameAppPath, TRACKING_EVENTS_PATH);
  const source = await readFile(trackingEventsFile, "utf8");
  const firebaseEvents = parseFirebaseTrackingEvents(source);
  const events = [...firebaseEvents, ...SERVER_PUSH_EVENTS];
  validateEvents(events);
  return events;
}

function parseFirebaseTrackingEvents(source) {
  const events = [];
  const seen = new Set();
  let currentModule = "未分组";
  const lines = source.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const heading = line.match(/^\s*\/\/\s+(.+?)\s*$/);
    if (
      heading &&
      !heading[1].includes("=") &&
      !heading[1].includes("事件名") &&
      !heading[1].includes("模块名") &&
      !heading[1].includes("相册名")
    ) {
      currentModule = heading[1].trim();
    }

    const start = line.match(/static const String\s+\w+\s*=/);
    if (!start) {
      continue;
    }

    let statement = line;
    while (!statement.includes(";") && index + 1 < lines.length) {
      index += 1;
      statement += `\n${lines[index]}`;
    }

    const match = statement.match(/static const String\s+\w+\s*=\s*'([^']+)'/s);
    if (!match) {
      continue;
    }

    const name = match[1];
    if (name.includes(" ") || seen.has(name)) {
      continue;
    }
    seen.add(name);

    events.push({
      name,
      displayName: name,
      module: currentModule,
      description: `Firebase Analytics 事件常量：${name}`,
      triggerTiming: "见 Flutter 端 Tracker.track 调用点。",
      properties: [],
    });
  }

  return events;
}

function validateEvents(events) {
  const seen = new Set();
  for (const event of events) {
    if (!/^[A-Za-z0-9_]+$/.test(event.name)) {
      throw new Error(`事件名不符合 TrackingHub 导入规则: ${event.name}`);
    }

    if (seen.has(event.name)) {
      throw new Error(`事件名重复: ${event.name}`);
    }
    seen.add(event.name);
  }
}

function hashValue(value) {
  return createHash("sha256").update(value).digest("hex");
}

function maskKey(key) {
  if (key.length <= 12) {
    return `${key.slice(0, 4)}...`;
  }

  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

async function importMagicFrameEvents(config, events) {
  const pool = new Pool({ connectionString: config.databaseUrl });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const workspaceId = await upsertWorkspace(client, config.workspaceName);
    const projectId = await upsertProject(client, workspaceId);
    const environments = await upsertEnvironments(client, projectId, config.writeKeys);
    if (environments.length > 0) {
      await deleteLegacyEnvironments(client, projectId);
    }

    for (const event of events) {
      const eventDefinitionId = await upsertEventDefinition(client, projectId, event);
      await upsertEventProperties(client, eventDefinitionId, event.properties);
    }

    await client.query("COMMIT");

    return {
      projectId,
      eventCount: events.length,
      environmentCount: environments.length,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
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
       ($1, 'Magic Frame App', 'magic_frame_app', 'Magic Frame App 正式埋点项目，由 Firebase Analytics 与服务端推送事件迁移。', 'active')
     ON CONFLICT (workspace_id, slug)
     DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       status = 'active',
       updated_at = now()
     RETURNING id`,
    [workspaceId],
  );

  return result.rows[0].id;
}

async function upsertEnvironments(client, projectId, writeKeys) {
  const environments = [];

  for (const [name, writeKey] of Object.entries(writeKeys)) {
    if (!writeKey) {
      continue;
    }

    const environment = await client.query(
      `INSERT INTO project_environments
         (project_id, name, write_key_hash, enabled)
       VALUES
         ($1, $2, 'managed-in-sdk-keys', true)
       ON CONFLICT (project_id, name)
       DO UPDATE SET enabled = true, updated_at = now()
       RETURNING id`,
      [projectId, name],
    );
    const environmentId = environment.rows[0].id;

    await client.query(
      `INSERT INTO sdk_keys
         (project_environment_id, source, key_hash, masked_key, status)
       VALUES
         ($1, 'flutter', $2, $3, 'active')
       ON CONFLICT (project_environment_id, source, masked_key)
       DO UPDATE SET
         key_hash = EXCLUDED.key_hash,
         status = 'active',
         updated_at = now()`,
      [environmentId, hashValue(writeKey), maskKey(writeKey)],
    );
    environments.push(name);
  }

  return environments;
}

async function deleteLegacyEnvironments(client, projectId) {
  await client.query(
    "DELETE FROM project_environments WHERE project_id = $1 AND name = ANY($2::text[])",
    [projectId, LEGACY_MAGIC_FRAME_ENVIRONMENTS],
  );
}

async function upsertEventDefinition(client, projectId, event) {
  const result = await client.query(
    `INSERT INTO event_definitions
       (project_id, name, display_name, description, trigger_timing, module, platforms, status)
     VALUES
       ($1, $2, $3, $4, $5, $6, ARRAY['flutter'], 'released')
     ON CONFLICT (project_id, name)
     DO UPDATE SET
       display_name = EXCLUDED.display_name,
       description = EXCLUDED.description,
       trigger_timing = EXCLUDED.trigger_timing,
       module = EXCLUDED.module,
       platforms = EXCLUDED.platforms,
       status = 'released',
       updated_at = now()
     RETURNING id`,
    [
      projectId,
      event.name,
      event.displayName,
      event.description,
      event.triggerTiming,
      event.module,
    ],
  );

  return result.rows[0].id;
}

async function upsertEventProperties(client, eventDefinitionId, properties) {
  for (const eventProperty of properties) {
    await client.query(
      `INSERT INTO event_property_definitions
         (event_definition_id, name, type, required, description, allowed_values, example_value)
       VALUES
         ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
       ON CONFLICT (event_definition_id, name)
       DO UPDATE SET
         type = EXCLUDED.type,
         required = EXCLUDED.required,
         description = EXCLUDED.description,
         allowed_values = EXCLUDED.allowed_values,
         example_value = EXCLUDED.example_value,
         updated_at = now()`,
      [
        eventDefinitionId,
        eventProperty.name,
        eventProperty.type,
        eventProperty.required,
        eventProperty.description,
        JSON.stringify(eventProperty.allowedValues),
        JSON.stringify(eventProperty.exampleValue),
      ],
    );
  }
}

function getMissingWriteKeyEnvNames(config) {
  return Object.entries(config.writeKeys)
    .filter(([, value]) => !value)
    .map(([environment]) => WRITE_KEY_ENV_BY_ENVIRONMENT[environment]);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const config = readConfig(process.env);
  const events = await loadMagicFrameEvents(config.magicFrameAppPath);
  const missingWriteKeys = getMissingWriteKeyEnvNames(config);

  if (dryRun) {
    console.log(
      `Magic Frame App event inventory is valid: ${events.length} events, ${SERVER_PUSH_EVENTS.length} server push events`,
    );
    if (missingWriteKeys.length > 0) {
      console.log(`Missing Flutter SDK write key env vars: ${missingWriteKeys.join(", ")}`);
    }
    return;
  }

  if (!config.databaseUrl) {
    console.error("TRACKINGHUB_POSTGRES_URL 或 DATABASE_URL 不能为空");
    process.exit(1);
  }

  const result = await importMagicFrameEvents(config, events);
  console.log(
    `Magic Frame App imported: project=${result.projectId}, events=${result.eventCount}, environments=${result.environmentCount}`,
  );
  console.log(`Use project id ${result.projectId} as TrackingHub SDK projectId.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
