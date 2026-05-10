import { Pool, type QueryResultRow } from "pg";

type Env = Record<string, string | undefined>;

let pool: Pool | null = null;
let activeConnectionString: string | null = null;

export function getPostgresConnectionString(env: Env = process.env) {
  return env.TRACKINGHUB_POSTGRES_URL ?? env.DATABASE_URL ?? null;
}

export function getPostgresPool(env: Env = process.env) {
  const connectionString = getPostgresConnectionString(env);

  if (!connectionString) {
    pool?.end().catch(() => undefined);
    pool = null;
    activeConnectionString = null;
    return null;
  }

  if (pool && activeConnectionString === connectionString) {
    return pool;
  }

  pool?.end().catch(() => undefined);
  pool = new Pool({ connectionString });
  activeConnectionString = connectionString;
  return pool;
}

export async function queryPostgres<T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  const activePool = getPostgresPool();

  if (!activePool) {
    throw new Error("TRACKINGHUB_POSTGRES_URL is not configured");
  }

  return activePool.query<T>(text, values);
}
