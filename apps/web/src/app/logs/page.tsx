import { AppShell } from "@/components/trackinghub/app-shell";
import { LogsWorkbench } from "@/components/trackinghub/logs-workbench";
import { PageHeader } from "@/components/trackinghub/page-header";
import {
  createClickHouseLogsClientFromEnv,
  normalizeLogsFilters,
  type LogsFilterInput,
  type LogsData,
} from "@/lib/logs/clickhouse-logs";
import { getCurrentUserFromCookieHeader } from "@/lib/api/auth";
import { assertCanRead } from "@/lib/auth/permissions";
import { getPostgresConnectionString } from "@/lib/metadata/postgres";
import { pageShells } from "@/lib/trackinghub/page-shells";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type LogsPageProps = {
  searchParams?: LogsFilterInput | Promise<LogsFilterInput>;
};

async function assertLogsPageAccess() {
  if (!getPostgresConnectionString()) {
    return;
  }

  const user = await getCurrentUserFromCookieHeader(
    (await headers()).get("cookie"),
  );

  if (!user) {
    redirect("/login");
  }

  assertCanRead(user);
}

async function getLogsData(input: LogsFilterInput): Promise<LogsData> {
  const client = createClickHouseLogsClientFromEnv();

  if (!client) {
    return {
      source: "unavailable",
      filters: normalizeLogsFilters(input),
      metrics: [],
      levelCounts: [],
      items: [],
    };
  }

  try {
    return await client.loadLogs(input);
  } catch {
    return {
      source: "unavailable",
      filters: normalizeLogsFilters(input),
      metrics: [],
      levelCounts: [],
      items: [],
    };
  }
}

export default async function LogsPage({ searchParams }: LogsPageProps) {
  await assertLogsPageAccess();

  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const logs = await getLogsData(resolvedSearchParams);

  return (
    <AppShell activeHref="/logs">
      <PageHeader
        eyebrow={pageShells.logs.eyebrow}
        title={pageShells.logs.title}
      />
      <div className="mt-6">
        <LogsWorkbench logs={logs} />
      </div>
    </AppShell>
  );
}
