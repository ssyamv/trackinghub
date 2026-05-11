export type DemoDataCleanupPlanInput = {
  keepProjectSlugs?: string[];
  includeClickHouse?: boolean;
};

export type DemoDataCleanupPlan = {
  keepProjectSlugs: string[];
  postgres: {
    countProjectsSql: string;
    deleteProjectsSql: string;
  };
  clickHouse: {
    countRawEventsSql: string;
    deleteRawEventsSql: string;
    countValidationResultsSql: string;
    deleteValidationResultsSql: string;
  } | null;
};

const DEFAULT_KEEP_PROJECT_SLUGS = ["magic_frame_app"];

export function buildDemoDataCleanupPlan(
  input: DemoDataCleanupPlanInput,
): DemoDataCleanupPlan {
  const keepProjectSlugs = (
    input.keepProjectSlugs && input.keepProjectSlugs.length > 0
      ? input.keepProjectSlugs
      : DEFAULT_KEEP_PROJECT_SLUGS
  )
    .map((slug) => slug.trim())
    .filter(Boolean);

  if (keepProjectSlugs.length === 0) {
    throw new Error("At least one project slug must be preserved");
  }

  return {
    keepProjectSlugs,
    postgres: {
      countProjectsSql:
        "SELECT count(*)::int AS count FROM projects WHERE slug <> ALL($1::text[])",
      deleteProjectsSql:
        "DELETE FROM projects WHERE slug <> ALL($1::text[]) RETURNING id, slug",
    },
    clickHouse: input.includeClickHouse
      ? {
          countRawEventsSql:
            "SELECT count() AS count FROM raw_events WHERE project_id NOT IN {keepProjectIds:Array(String)}",
          deleteRawEventsSql:
            "ALTER TABLE raw_events DELETE WHERE project_id NOT IN {keepProjectIds:Array(String)}",
          countValidationResultsSql:
            "SELECT count() AS count FROM event_validation_results WHERE project_id NOT IN {keepProjectIds:Array(String)}",
          deleteValidationResultsSql:
            "ALTER TABLE event_validation_results DELETE WHERE project_id NOT IN {keepProjectIds:Array(String)}",
        }
      : null,
  };
}
