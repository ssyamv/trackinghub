#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const rootDir = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const requiredServices = ["postgres", "clickhouse", "web"];

function envBoolean(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }
  return value === "1" || value.toLowerCase() === "true";
}

function envNumber(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative number`);
  }
  return value;
}

function run(command, args) {
  return execFileSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function dockerCompose(args) {
  return run("docker", ["compose", ...args]);
}

function postgresScalar(sql) {
  return dockerCompose([
    "exec",
    "-T",
    "postgres",
    "psql",
    "-U",
    "trackinghub",
    "-d",
    "trackinghub",
    "-Atc",
    sql,
  ]);
}

function clickHouseScalar(sql) {
  return dockerCompose([
    "exec",
    "-T",
    "clickhouse",
    "clickhouse-client",
    "--database",
    "trackinghub",
    "--query",
    sql,
  ]);
}

function parseComposePs(raw) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function addCheck(checks, name, status, message, details = {}) {
  checks.push({ name, status, message, details });
}

async function fetchHealth(checks) {
  const healthUrl =
    process.env.TRACKINGHUB_HEALTH_URL ?? "http://127.0.0.1:3000/api/health";
  const timeoutMs = envNumber("TRACKINGHUB_MONITOR_HTTP_TIMEOUT_MS", 5000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(healthUrl, { signal: controller.signal });
    const text = await response.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      // Keep body as null; the status/message below still makes the failure clear.
    }

    if (!response.ok || body?.data?.status !== "ok") {
      addCheck(checks, "httpHealth", "error", "/api/health returned degraded status", {
        statusCode: response.status,
        body: text.slice(0, 500),
      });
      return;
    }

    addCheck(checks, "httpHealth", "ok", "/api/health is ok", {
      statusCode: response.status,
      checks: body.data.checks,
    });
  } catch (error) {
    addCheck(checks, "httpHealth", "error", "/api/health is unavailable", {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(timeout);
  }
}

function checkComposeServices(checks) {
  const rows = parseComposePs(dockerCompose(["ps", "--format", "json"]));
  const byService = new Map(rows.map((row) => [row.Service, row]));

  for (const service of requiredServices) {
    const row = byService.get(service);
    if (!row) {
      addCheck(checks, "composeServices", "error", `${service} container is missing`);
      continue;
    }

    if (row.State !== "running") {
      addCheck(checks, "composeServices", "error", `${service} is not running`, {
        state: row.State,
        status: row.Status,
      });
      continue;
    }

    if (row.Health && row.Health !== "healthy") {
      addCheck(checks, "composeServices", "error", `${service} is not healthy`, {
        health: row.Health,
        status: row.Status,
      });
      continue;
    }

    addCheck(checks, "composeServices", "ok", `${service} is running and healthy`, {
      status: row.Status,
    });
  }
}

function checkMetadata(checks) {
  const minProjects = envNumber("TRACKINGHUB_MONITOR_MIN_PROJECTS", 1);
  const minEventDefinitions = envNumber(
    "TRACKINGHUB_MONITOR_MIN_EVENT_DEFINITIONS",
    1,
  );
  const minActiveSdkKeys = envNumber("TRACKINGHUB_MONITOR_MIN_ACTIVE_SDK_KEYS", 1);

  const projects = Number(postgresScalar("SELECT count(*) FROM projects"));
  const eventDefinitions = Number(
    postgresScalar("SELECT count(*) FROM event_definitions"),
  );
  const activeSdkKeys = Number(
    postgresScalar("SELECT count(*) FROM sdk_keys WHERE status = 'active'"),
  );
  const enabledAdmins = Number(
    postgresScalar("SELECT count(*) FROM users WHERE role = 'admin' AND enabled = true"),
  );

  const metadataOk =
    projects >= minProjects &&
    eventDefinitions >= minEventDefinitions &&
    activeSdkKeys >= minActiveSdkKeys &&
    enabledAdmins > 0;

  addCheck(
    checks,
    "metadata",
    metadataOk ? "ok" : "error",
    metadataOk
      ? "metadata baseline is present"
      : "metadata baseline is incomplete",
    {
      projects,
      minProjects,
      eventDefinitions,
      minEventDefinitions,
      activeSdkKeys,
      minActiveSdkKeys,
      enabledAdmins,
    },
  );
}

function checkClickHouseData(checks) {
  const recentMinutes = envNumber("TRACKINGHUB_MONITOR_RECENT_MINUTES", 60);
  const requireRecentEvents = envBoolean(
    "TRACKINGHUB_MONITOR_REQUIRE_RECENT_EVENTS",
    false,
  );
  const includeSmokeEvents = envBoolean(
    "TRACKINGHUB_MONITOR_INCLUDE_SMOKE_EVENTS",
    false,
  );
  const recentWindow = `received_at >= now() - INTERVAL ${recentMinutes} MINUTE`;
  const nonSmokeEventFilter =
    "JSONExtractString(properties, 'codex_smoke_run_id') = ''";

  const rawEvents = Number(clickHouseScalar("SELECT count() FROM raw_events"));
  const validationResults = Number(
    clickHouseScalar("SELECT count() FROM event_validation_results"),
  );
  const recentRawEvents = Number(
    clickHouseScalar(
      `SELECT count() FROM raw_events WHERE ${recentWindow}${
        includeSmokeEvents ? "" : ` AND ${nonSmokeEventFilter}`
      }`,
    ),
  );
  const ignoredRecentSmokeRawEvents = includeSmokeEvents
    ? 0
    : Number(
        clickHouseScalar(
          `SELECT count() FROM raw_events WHERE ${recentWindow} AND NOT (${nonSmokeEventFilter})`,
        ),
      );
  const latestCountedReceivedAt = clickHouseScalar(
    `SELECT if(count() = 0, '', toString(max(received_at))) FROM raw_events${
      includeSmokeEvents ? "" : ` WHERE ${nonSmokeEventFilter}`
    }`,
  );
  const latestReceivedAt = clickHouseScalar(
    "SELECT if(count() = 0, '', toString(max(received_at))) FROM raw_events",
  );

  const details = {
    rawEvents,
    validationResults,
    recentRawEvents,
    ignoredRecentSmokeRawEvents,
    includeSmokeEvents,
    latestReceivedAt,
    latestCountedReceivedAt,
  };

  if (requireRecentEvents && recentRawEvents === 0) {
    addCheck(
      checks,
      "clickhouseData",
      "error",
      includeSmokeEvents
        ? `no raw events received in the last ${recentMinutes} minutes`
        : `no non-smoke raw events received in the last ${recentMinutes} minutes`,
      details,
    );
    return;
  }

  addCheck(
    checks,
    "clickhouseData",
    rawEvents > 0 ? "ok" : "warning",
    rawEvents > 0 ? "ClickHouse has event data" : "ClickHouse has no raw events yet",
    details,
  );
}

function latestBackupManifest() {
  const backupRoot =
    process.env.TRACKINGHUB_BACKUP_DIR ?? join(rootDir, ".trackinghub-backups");
  if (!existsSync(backupRoot)) {
    return null;
  }

  const candidates = readdirSync(backupRoot)
    .map((name) => {
      const backupDir = join(backupRoot, name);
      const manifestPath = join(backupRoot, name, "manifest.txt");
      if (!existsSync(manifestPath)) {
        return null;
      }
      const stat = statSync(manifestPath);
      return { backupDir, manifestPath, mtimeMs: stat.mtimeMs };
    })
    .filter(Boolean)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return candidates[0] ?? null;
}

function checkBackupRestoreDrill(checks) {
  const requireRestoreDrill = envBoolean(
    "TRACKINGHUB_MONITOR_REQUIRE_RESTORE_DRILL",
    false,
  );
  const latest = latestBackupManifest();

  if (!latest) {
    addCheck(
      checks,
      "backupRestoreDrill",
      requireRestoreDrill ? "error" : "warning",
      "no local compose backup manifest found for restore drill",
    );
    return;
  }

  const markerPath = join(latest.backupDir, "restore-drill.txt");
  if (!existsSync(markerPath)) {
    addCheck(
      checks,
      "backupRestoreDrill",
      requireRestoreDrill ? "error" : "warning",
      "latest backup has no restore drill marker",
      {
        manifestPath: latest.manifestPath,
        markerPath,
      },
    );
    return;
  }

  const markerStat = statSync(markerPath);
  const marker = readFileSync(markerPath, "utf8");
  const markerOk = /^status=ok$/m.test(marker);
  const markerCoversManifest = markerStat.mtimeMs >= latest.mtimeMs;

  addCheck(
    checks,
    "backupRestoreDrill",
    markerOk && markerCoversManifest ? "ok" : requireRestoreDrill ? "error" : "warning",
    markerOk && markerCoversManifest
      ? "latest backup has a successful restore drill marker"
      : "latest backup restore drill marker is missing or stale",
    {
      manifestPath: latest.manifestPath,
      markerPath,
      markerMtime: new Date(markerStat.mtimeMs).toISOString(),
      markerCoversManifest,
    },
  );
}

function checkBackupFreshness(checks) {
  const maxBackupAgeHours = envNumber("TRACKINGHUB_MONITOR_MAX_BACKUP_AGE_HOURS", 24);
  const requireFreshBackup = envBoolean(
    "TRACKINGHUB_MONITOR_REQUIRE_FRESH_BACKUP",
    false,
  );
  const latest = latestBackupManifest();

  if (!latest) {
    addCheck(
      checks,
      "backupFreshness",
      requireFreshBackup ? "error" : "warning",
      "no local compose backup manifest found",
    );
    return;
  }

  const ageHours = (Date.now() - latest.mtimeMs) / (1000 * 60 * 60);
  const fresh = ageHours <= maxBackupAgeHours;
  addCheck(
    checks,
    "backupFreshness",
    fresh ? "ok" : requireFreshBackup ? "error" : "warning",
    fresh ? "latest backup is fresh" : "latest backup is older than threshold",
    {
      manifestPath: latest.manifestPath,
      ageHours: Number(ageHours.toFixed(2)),
      maxBackupAgeHours,
    },
  );
}

async function main() {
  const checks = [];

  try {
    checkComposeServices(checks);
    await fetchHealth(checks);
    checkMetadata(checks);
    checkClickHouseData(checks);
    checkBackupFreshness(checks);
    checkBackupRestoreDrill(checks);
  } catch (error) {
    addCheck(checks, "monitorRuntime", "error", "monitor failed to complete", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const errors = checks.filter((check) => check.status === "error");
  const warnings = checks.filter((check) => check.status === "warning");

  console.log(JSON.stringify({ status: errors.length > 0 ? "error" : "ok", checks }, null, 2));

  if (errors.length > 0) {
    console.error(`TrackingHub monitor failed: ${errors.length} error(s), ${warnings.length} warning(s)`);
    process.exit(1);
  }

  console.error(`TrackingHub monitor ok: ${warnings.length} warning(s)`);
}

main();
