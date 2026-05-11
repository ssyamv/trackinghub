import { queryPostgres } from "@/lib/metadata/postgres";
import { allowsSampleData, type RuntimeEnv } from "./sample-data-policy";

type CheckStatus = "ok" | "warning" | "error";

export type HealthCheck = {
  name: "postgres" | "clickhouse" | "eventPersistence" | "sampleData";
  status: CheckStatus;
  message: string;
};

export type RuntimeHealth = {
  status: "ok" | "degraded";
  checks: HealthCheck[];
};

export type HealthDependencies = {
  env?: RuntimeEnv;
  pingPostgres?: () => Promise<boolean>;
  pingClickHouse?: () => Promise<boolean>;
};

function postgresUrl(env: RuntimeEnv) {
  return env.TRACKINGHUB_POSTGRES_URL ?? env.DATABASE_URL;
}

function clickHouseUrl(env: RuntimeEnv) {
  return env.TRACKINGHUB_CLICKHOUSE_URL ?? env.CLICKHOUSE_URL;
}

function isProduction(env: RuntimeEnv) {
  return env.NODE_ENV === "production";
}

function requiresEventPersistence(env: RuntimeEnv) {
  return (
    isProduction(env) || env.TRACKINGHUB_REQUIRE_EVENT_PERSISTENCE === "true"
  );
}

async function defaultPingPostgres() {
  try {
    await queryPostgres("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

async function defaultPingClickHouse(env: RuntimeEnv) {
  const baseUrl = clickHouseUrl(env);

  if (!baseUrl) {
    return false;
  }

  try {
    const url = new URL("/ping", baseUrl);
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

export async function evaluateHealth({
  env = process.env,
  pingPostgres = defaultPingPostgres,
  pingClickHouse = () => defaultPingClickHouse(env),
}: HealthDependencies = {}): Promise<RuntimeHealth> {
  const checks: HealthCheck[] = [];
  const hasPostgres = Boolean(postgresUrl(env));
  const hasClickHouse = Boolean(clickHouseUrl(env));

  if (!hasPostgres) {
    checks.push({
      name: "postgres",
      status: isProduction(env) ? "error" : "warning",
      message: isProduction(env)
        ? "生产环境未配置 Postgres"
        : "本地未配置 Postgres，将使用静态回退数据",
    });
  } else if (await pingPostgres()) {
    checks.push({
      name: "postgres",
      status: "ok",
      message: "Postgres 已配置且可连接",
    });
  } else {
    checks.push({
      name: "postgres",
      status: "error",
      message: "Postgres 已配置但连接失败",
    });
  }

  if (!hasClickHouse) {
    checks.push({
      name: "clickhouse",
      status: requiresEventPersistence(env) ? "error" : "warning",
      message: requiresEventPersistence(env)
        ? "生产环境未配置 ClickHouse"
        : "本地未配置 ClickHouse，将跳过真实事件写入",
    });
  } else if (await pingClickHouse()) {
    checks.push({
      name: "clickhouse",
      status: "ok",
      message: "ClickHouse 已配置且可连接",
    });
  } else {
    checks.push({
      name: "clickhouse",
      status: "error",
      message: "ClickHouse 已配置但连接失败",
    });
  }

  checks.push({
    name: "eventPersistence",
    status: requiresEventPersistence(env) && !hasClickHouse ? "error" : "ok",
    message:
      requiresEventPersistence(env) && !hasClickHouse
        ? "事件持久化保护已启用但 ClickHouse 未配置"
        : "事件持久化保护已满足",
  });

  checks.push({
    name: "sampleData",
    status: allowsSampleData(env) ? "warning" : "ok",
    message: allowsSampleData(env)
      ? "当前环境允许回显占位数据"
      : "当前环境不会回显占位数据",
  });

  return {
    status: checks.some((check) => check.status !== "ok") ? "degraded" : "ok",
    checks,
  };
}
