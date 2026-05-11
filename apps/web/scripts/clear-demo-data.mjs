#!/usr/bin/env node
import pg from "pg";

const { Pool } = pg;

const DEFAULT_KEEP_PROJECT_SLUGS = ["magic_frame_app"];

function readConfig(env, argv) {
  return {
    databaseUrl: env.TRACKINGHUB_POSTGRES_URL ?? env.DATABASE_URL ?? "",
    clickHouseUrl: env.TRACKINGHUB_CLICKHOUSE_URL ?? "",
    clickHouseDatabase: env.TRACKINGHUB_CLICKHOUSE_DATABASE ?? "trackinghub",
    clickHouseUsername: env.TRACKINGHUB_CLICKHOUSE_USERNAME ?? "",
    clickHousePassword: env.TRACKINGHUB_CLICKHOUSE_PASSWORD ?? "",
    keepProjectSlugs: readKeepProjectSlugs(env, argv),
    dryRun: !argv.includes("--confirm"),
    includeClickHouse: argv.includes("--include-clickhouse"),
  };
}

function readKeepProjectSlugs(env, argv) {
  const flag = argv.find((item) => item.startsWith("--keep-project-slugs="));
  const raw =
    flag?.slice("--keep-project-slugs=".length) ??
    env.TRACKINGHUB_CLEANUP_KEEP_PROJECT_SLUGS ??
    DEFAULT_KEEP_PROJECT_SLUGS.join(",");
  const slugs = raw
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);

  if (slugs.length === 0) {
    throw new Error("至少需要保留一个项目 slug");
  }

  return slugs;
}

async function countPostgresDemoProjects(config) {
  const pool = new Pool({ connectionString: config.databaseUrl });
  const client = await pool.connect();

  try {
    const result = await client.query(
      "SELECT count(*)::int AS count FROM projects WHERE slug <> ALL($1::text[])",
      [config.keepProjectSlugs],
    );
    return result.rows[0]?.count ?? 0;
  } finally {
    client.release();
    await pool.end();
  }
}

async function clearPostgresDemoProjects(config) {
  const pool = new Pool({ connectionString: config.databaseUrl });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await client.query(
      "DELETE FROM projects WHERE slug <> ALL($1::text[]) RETURNING id, slug",
      [config.keepProjectSlugs],
    );
    await client.query("COMMIT");
    return result.rows.map((row) => String(row.slug));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function listKeptProjectIds(config) {
  const pool = new Pool({ connectionString: config.databaseUrl });
  const client = await pool.connect();

  try {
    const result = await client.query(
      "SELECT id::text AS id, slug FROM projects WHERE slug = ANY($1::text[]) ORDER BY slug",
      [config.keepProjectSlugs],
    );
    const foundSlugs = new Set(result.rows.map((row) => String(row.slug)));
    const missingSlugs = config.keepProjectSlugs.filter((slug) => !foundSlugs.has(slug));

    if (missingSlugs.length > 0) {
      throw new Error(
        `ClickHouse 清理前无法在 Postgres 找到保留项目 slug: ${missingSlugs.join(", ")}`,
      );
    }

    return result.rows.map((row) => String(row.id));
  } finally {
    client.release();
    await pool.end();
  }
}

function buildClickHouseUrl(config, query) {
  const url = new URL(config.clickHouseUrl);
  url.searchParams.set("database", config.clickHouseDatabase);
  url.searchParams.set("query", query);
  return url;
}

function buildClickHouseHeaders(config) {
  const headers = {};
  if (config.clickHouseUsername) {
    headers["X-ClickHouse-User"] = config.clickHouseUsername;
  }
  if (config.clickHousePassword) {
    headers["X-ClickHouse-Key"] = config.clickHousePassword;
  }
  return headers;
}

function formatClickHouseKeepList(projectIds) {
  return projectIds.map((projectId) => `'${projectId.replaceAll("'", "\\'")}'`).join(",");
}

async function queryClickHouse(config, query) {
  const response = await fetch(buildClickHouseUrl(config, query), {
    method: "POST",
    headers: buildClickHouseHeaders(config),
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`ClickHouse query failed: ${response.status} ${text}`);
  }

  return text.trim();
}

async function countClickHouseDemoRows(config, keepProjectIds) {
  const keepList = formatClickHouseKeepList(keepProjectIds);
  const rawEvents = await queryClickHouse(
    config,
    `SELECT count() FROM raw_events WHERE project_id NOT IN (${keepList})`,
  );
  const validationResults = await queryClickHouse(
    config,
    `SELECT count() FROM event_validation_results WHERE project_id NOT IN (${keepList})`,
  );

  return {
    rawEvents: Number(rawEvents),
    validationResults: Number(validationResults),
  };
}

async function clearClickHouseDemoRows(config, keepProjectIds) {
  const keepList = formatClickHouseKeepList(keepProjectIds);
  await queryClickHouse(
    config,
    `ALTER TABLE raw_events DELETE WHERE project_id NOT IN (${keepList})`,
  );
  await queryClickHouse(
    config,
    `ALTER TABLE event_validation_results DELETE WHERE project_id NOT IN (${keepList})`,
  );
}

async function main() {
  const config = readConfig(process.env, process.argv.slice(2));

  if (!config.databaseUrl) {
    console.error("TRACKINGHUB_POSTGRES_URL 或 DATABASE_URL 不能为空");
    process.exit(1);
  }

  const postgresProjectCount = await countPostgresDemoProjects(config);
  console.log(
    `Postgres demo projects to delete: ${postgresProjectCount}; keeping ${config.keepProjectSlugs.join(", ")}`,
  );

  if (config.includeClickHouse) {
    if (!config.clickHouseUrl) {
      console.error("--include-clickhouse 需要配置 TRACKINGHUB_CLICKHOUSE_URL");
      process.exit(1);
    }

    const keepProjectIds = await listKeptProjectIds(config);
    console.log(`ClickHouse keeping project ids: ${keepProjectIds.join(", ")}`);

    const clickHouseCounts = await countClickHouseDemoRows(config, keepProjectIds);
    console.log(
      `ClickHouse rows to delete: raw_events=${clickHouseCounts.rawEvents}, event_validation_results=${clickHouseCounts.validationResults}`,
    );
  }

  if (config.dryRun) {
    console.log("Dry run only. Add --confirm to delete demo data.");
    return;
  }

  const deletedProjects = await clearPostgresDemoProjects(config);
  console.log(
    `Deleted Postgres demo projects: ${deletedProjects.length > 0 ? deletedProjects.join(", ") : "none"}`,
  );

  if (config.includeClickHouse) {
    const keepProjectIds = await listKeptProjectIds(config);
    await clearClickHouseDemoRows(config, keepProjectIds);
    console.log("Submitted ClickHouse demo row cleanup mutations.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
