#!/usr/bin/env node
import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;

function readConfig(env) {
  return {
    databaseUrl: env.TRACKINGHUB_POSTGRES_URL ?? env.DATABASE_URL ?? "",
    email: env.TRACKINGHUB_ADMIN_EMAIL ?? "",
    password: env.TRACKINGHUB_ADMIN_PASSWORD ?? "",
    name: env.TRACKINGHUB_ADMIN_NAME ?? "TrackingHub 管理员",
    workspaceName: env.TRACKINGHUB_WORKSPACE_NAME ?? "TrackingHub",
  };
}

function validateConfig(config) {
  const errors = [];

  if (!config.databaseUrl) {
    errors.push("TRACKINGHUB_POSTGRES_URL 或 DATABASE_URL 不能为空");
  }

  if (!config.email || !config.email.includes("@")) {
    errors.push("TRACKINGHUB_ADMIN_EMAIL 必须是有效邮箱");
  }

  if (!config.password || config.password.length < 12) {
    errors.push("TRACKINGHUB_ADMIN_PASSWORD 至少需要 12 个字符");
  }

  return errors;
}

async function bootstrapAdmin(config) {
  const pool = new Pool({ connectionString: config.databaseUrl });
  const client = await pool.connect();

  try {
    const passwordHash = await bcrypt.hash(config.password, 12);

    await client.query("BEGIN");
    const workspace = await client.query(
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
      [config.workspaceName],
    );
    const workspaceId = workspace.rows[0]?.id;

    if (!workspaceId) {
      throw new Error("无法创建或读取 workspace");
    }

    await client.query(
      `INSERT INTO users
        (workspace_id, name, email, role, password_hash, enabled)
       VALUES ($1, $2, lower($3), 'admin', $4, true)
       ON CONFLICT (workspace_id, email)
       DO UPDATE SET
         name = EXCLUDED.name,
         role = 'admin',
         password_hash = EXCLUDED.password_hash,
         enabled = true,
         updated_at = now()`,
      [workspaceId, config.name, config.email, passwordHash],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  const config = readConfig(process.env);
  const errors = validateConfig(config);
  const dryRun = process.argv.includes("--dry-run");

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  if (dryRun) {
    console.log(`Bootstrap admin configuration is valid for ${config.email}`);
    return;
  }

  await bootstrapAdmin(config);
  console.log(`Bootstrap admin ready for ${config.email}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
