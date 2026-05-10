import { queryPostgres } from "@/lib/metadata/postgres";
import type { QueryResultRow } from "pg";
import {
  MetadataStoreError,
  type EventAcceptanceRecord,
  type EventDefinitionRecord,
  type EventDefinitionStatus,
  type EventPropertyRecord,
  type MetadataStore,
  type PlatformSource,
  type ProjectEnvironmentName,
  type ProjectEnvironmentRecord,
  type ProjectRecord,
  type SdkKeyRecord,
  type SdkKeyStatus,
} from "./metadata-store";

type ProjectRow = QueryResultRow & {
  id: string;
  name: string;
  slug: string;
  description: string;
  owner_name: string;
  platforms: PlatformSource[];
  status: string;
};

type EnvironmentRow = QueryResultRow & {
  id: string;
  project_id: string;
  project_name: string;
  name: ProjectEnvironmentName;
  enabled: boolean;
  last_event_at: Date | string | null;
};

type SdkKeyRow = QueryResultRow & {
  id: string;
  project_id: string;
  project_name: string;
  environment: ProjectEnvironmentName;
  source: PlatformSource;
  masked_key: string;
  status: SdkKeyStatus;
  last_used_at: Date | string | null;
  key_hash?: string;
};

type EventDefinitionRow = QueryResultRow & {
  id: string;
  project_id: string;
  project_name: string;
  name: string;
  display_name: string;
  description: string;
  trigger_timing: string;
  module: string;
  platforms: PlatformSource[];
  status: EventDefinitionStatus;
  last_seen_at: Date | string | null;
};

type EventPropertyRow = QueryResultRow & {
  event_definition_id?: string;
  name: string;
  type: EventPropertyRecord["type"];
  required: boolean;
  description: string;
  example_value: unknown;
};

type ProjectLookupRow = QueryResultRow & {
  id: string;
  name: string;
};

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function toPlatforms(value: PlatformSource[] | null | undefined) {
  return value ? [...value] : [];
}

function toEventPropertyRecord(row: EventPropertyRow): EventPropertyRecord {
  return {
    name: row.name,
    type: row.type,
    required: row.required,
    description: row.description,
    exampleValue: row.example_value as EventPropertyRecord["exampleValue"],
  };
}

export function toProjectRecord(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    ownerName: row.owner_name,
    platforms: toPlatforms(row.platforms),
    status: row.status,
  };
}

function toEnvironmentRecord(row: EnvironmentRow): ProjectEnvironmentRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    name: row.name,
    enabled: row.enabled,
    lastEventAt: toIsoString(row.last_event_at),
  };
}

export function toSdkKeyRecord(row: SdkKeyRow): SdkKeyRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    environment: row.environment,
    source: row.source,
    maskedKey: row.masked_key,
    status: row.status,
    lastUsedAt: toIsoString(row.last_used_at),
    keyHash: row.key_hash,
  };
}

export function toEventDefinitionRecord(
  row: EventDefinitionRow,
  propertyRows: EventPropertyRow[],
): EventDefinitionRecord {
  const properties = propertyRows.map(toEventPropertyRecord);

  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    name: row.name,
    displayName: row.display_name,
    description: row.description,
    triggerTiming: row.trigger_timing,
    module: row.module,
    platforms: toPlatforms(row.platforms),
    status: row.status,
    requiredProperties: properties.filter((property) => property.required),
    optionalProperties: properties.filter((property) => !property.required),
    lastSeenAt: toIsoString(row.last_seen_at),
  };
}

async function findProject(projectId: string) {
  const result = await queryPostgres<ProjectLookupRow>(
    "SELECT id, name FROM projects WHERE id = $1 LIMIT 1",
    [projectId],
  );

  if (!result.rows[0]) {
    throw new MetadataStoreError("PROJECT_NOT_FOUND");
  }

  return result.rows[0];
}

async function findEventDefinition(eventDefinitionId: string) {
  const result = await queryPostgres<EventDefinitionRow>(
    `SELECT event_definitions.id,
            event_definitions.project_id,
            projects.name AS project_name,
            event_definitions.name,
            event_definitions.display_name,
            event_definitions.description,
            event_definitions.trigger_timing,
            event_definitions.module,
            event_definitions.platforms,
            event_definitions.status,
            max(event_validation_results.observed_at) AS last_seen_at
       FROM event_definitions
       JOIN projects ON projects.id = event_definitions.project_id
       LEFT JOIN event_validation_results
         ON event_validation_results.event_definition_id = event_definitions.id
      WHERE event_definitions.id = $1
      GROUP BY event_definitions.id, projects.name
      LIMIT 1`,
    [eventDefinitionId],
  );

  const row = result.rows[0];

  if (!row) {
    throw new MetadataStoreError("EVENT_DEFINITION_NOT_FOUND");
  }

  const properties = await queryPostgres<EventPropertyRow>(
    `SELECT event_definition_id, name, type, required, description, example_value
       FROM event_property_definitions
      WHERE event_definition_id = $1
      ORDER BY required DESC, created_at ASC, name ASC`,
    [eventDefinitionId],
  );

  return toEventDefinitionRecord(row, properties.rows);
}

async function insertRequiredProperties(
  eventDefinitionId: string,
  properties: EventPropertyRecord[],
) {
  await Promise.all(
    properties.map((property) =>
      queryPostgres(
        `INSERT INTO event_property_definitions
          (event_definition_id, name, type, required, description, example_value)
         VALUES ($1, $2, $3, true, $4, $5::jsonb)
         ON CONFLICT (event_definition_id, name)
         DO UPDATE SET
           type = EXCLUDED.type,
           required = true,
           description = EXCLUDED.description,
           example_value = EXCLUDED.example_value,
           updated_at = now()`,
        [
          eventDefinitionId,
          property.name,
          property.type,
          property.description,
          JSON.stringify(property.exampleValue),
        ],
      ),
    ),
  );
}

export const defaultMetadataStore: MetadataStore = {
  async listProjectsOverview() {
    const [projects, environments, sdkKeys] = await Promise.all([
      queryPostgres<ProjectRow>(
        `SELECT projects.id,
                projects.name,
                projects.slug,
                projects.description,
                ''::text AS owner_name,
                coalesce(
                  array_agg(DISTINCT sdk_keys.source)
                    FILTER (WHERE sdk_keys.source IS NOT NULL),
                  '{}'::text[]
                ) AS platforms,
                projects.status
           FROM projects
           LEFT JOIN project_environments
             ON project_environments.project_id = projects.id
           LEFT JOIN sdk_keys
             ON sdk_keys.project_environment_id = project_environments.id
          GROUP BY projects.id
          ORDER BY projects.created_at DESC`,
      ),
      queryPostgres<EnvironmentRow>(
        `SELECT project_environments.id,
                project_environments.project_id,
                projects.name AS project_name,
                project_environments.name,
                project_environments.enabled,
                max(event_validation_results.observed_at) AS last_event_at
           FROM project_environments
           JOIN projects ON projects.id = project_environments.project_id
           LEFT JOIN event_validation_results
             ON event_validation_results.project_id = project_environments.project_id
            AND event_validation_results.environment = project_environments.name
          GROUP BY project_environments.id, projects.name
          ORDER BY projects.created_at DESC, project_environments.name ASC`,
      ),
      queryPostgres<SdkKeyRow>(
        `SELECT sdk_keys.id,
                project_environments.project_id,
                projects.name AS project_name,
                project_environments.name AS environment,
                sdk_keys.source,
                sdk_keys.masked_key,
                sdk_keys.status,
                sdk_keys.last_used_at,
                sdk_keys.key_hash
           FROM sdk_keys
           JOIN project_environments
             ON project_environments.id = sdk_keys.project_environment_id
           JOIN projects ON projects.id = project_environments.project_id
          ORDER BY projects.created_at DESC, project_environments.name ASC, sdk_keys.source ASC`,
      ),
    ]);

    return {
      projects: projects.rows.map(toProjectRecord),
      environments: environments.rows.map(toEnvironmentRecord),
      sdkKeys: sdkKeys.rows.map(toSdkKeyRecord),
    };
  },

  async createProject(input) {
    const result = await queryPostgres<ProjectRow>(
      `INSERT INTO projects (workspace_id, name, slug, description, status)
       SELECT id, $1, $2, $3, 'active'
         FROM workspaces
        ORDER BY created_at ASC
        LIMIT 1
       RETURNING id,
                 name,
                 slug,
                 description,
                 $4::text AS owner_name,
                 $5::text[] AS platforms,
                 status`,
      [
        input.name,
        input.slug,
        input.description,
        input.ownerName,
        input.platforms,
      ],
    );

    if (!result.rows[0]) {
      throw new Error("WORKSPACE_NOT_FOUND");
    }

    return toProjectRecord(result.rows[0]);
  },

  async upsertEnvironment(projectId, input) {
    const project = await findProject(projectId);
    const result = await queryPostgres<
      QueryResultRow & {
        id: string;
        project_id: string;
        name: ProjectEnvironmentName;
        enabled: boolean;
        last_event_at: null;
      }
    >(
      `INSERT INTO project_environments
        (project_id, name, write_key_hash, enabled)
       VALUES ($1, $2, 'managed-in-sdk-keys', $3)
       ON CONFLICT (project_id, name)
       DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now()
       RETURNING id, project_id, name, enabled, null::text AS last_event_at`,
      [projectId, input.name, input.enabled],
    );

    return toEnvironmentRecord({
      ...result.rows[0],
      project_name: project.name,
    });
  },

  async createSdkKey(projectId, environment, input) {
    const environmentResult = await queryPostgres<
      QueryResultRow & {
        id: string;
        project_name: string;
      }
    >(
      `SELECT project_environments.id, projects.name AS project_name
         FROM project_environments
         JOIN projects ON projects.id = project_environments.project_id
        WHERE project_environments.project_id = $1
          AND project_environments.name = $2
        LIMIT 1`,
      [projectId, environment],
    );
    const projectEnvironment = environmentResult.rows[0];

    if (!projectEnvironment) {
      throw new MetadataStoreError("ENVIRONMENT_NOT_FOUND");
    }

    const result = await queryPostgres<
      QueryResultRow & {
        id: string;
        source: PlatformSource;
        masked_key: string;
        status: SdkKeyStatus;
        last_used_at: Date | string | null;
        key_hash: string;
      }
    >(
      `INSERT INTO sdk_keys
        (project_environment_id, source, key_hash, masked_key, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, source, masked_key, status, last_used_at, key_hash`,
      [
        projectEnvironment.id,
        input.source,
        input.keyHash,
        input.maskedKey,
        input.status,
      ],
    );

    return toSdkKeyRecord({
      ...result.rows[0],
      project_id: projectId,
      project_name: projectEnvironment.project_name,
      environment,
    });
  },

  async updateSdkKeyStatus(sdkKeyId, status) {
    const result = await queryPostgres<SdkKeyRow>(
      `UPDATE sdk_keys
          SET status = $2, updated_at = now()
         FROM project_environments
         JOIN projects ON projects.id = project_environments.project_id
        WHERE sdk_keys.project_environment_id = project_environments.id
          AND sdk_keys.id = $1
       RETURNING sdk_keys.id,
                 project_environments.project_id,
                 projects.name AS project_name,
                 project_environments.name AS environment,
                 sdk_keys.source,
                 sdk_keys.masked_key,
                 sdk_keys.status,
                 sdk_keys.last_used_at,
                 sdk_keys.key_hash`,
      [sdkKeyId, status],
    );

    if (!result.rows[0]) {
      throw new MetadataStoreError("SDK_KEY_NOT_FOUND");
    }

    return toSdkKeyRecord(result.rows[0]);
  },

  async listEventDefinitions() {
    const definitions = await queryPostgres<EventDefinitionRow>(
      `SELECT event_definitions.id,
              event_definitions.project_id,
              projects.name AS project_name,
              event_definitions.name,
              event_definitions.display_name,
              event_definitions.description,
              event_definitions.trigger_timing,
              event_definitions.module,
              event_definitions.platforms,
              event_definitions.status,
              max(event_validation_results.observed_at) AS last_seen_at
         FROM event_definitions
         JOIN projects ON projects.id = event_definitions.project_id
         LEFT JOIN event_validation_results
           ON event_validation_results.event_definition_id = event_definitions.id
        GROUP BY event_definitions.id, projects.name
        ORDER BY event_definitions.created_at DESC`,
    );

    if (definitions.rows.length === 0) {
      return { definitions: [] };
    }

    const properties = await queryPostgres<EventPropertyRow>(
      `SELECT event_definition_id, name, type, required, description, example_value
         FROM event_property_definitions
        WHERE event_definition_id = ANY($1::uuid[])
        ORDER BY required DESC, created_at ASC, name ASC`,
      [definitions.rows.map((definition) => definition.id)],
    );

    return {
      definitions: definitions.rows.map((definition) =>
        toEventDefinitionRecord(
          definition,
          properties.rows.filter(
            (property) => property.event_definition_id === definition.id,
          ),
        ),
      ),
    };
  },

  async createEventDefinition(input) {
    await findProject(input.projectId);
    const result = await queryPostgres<QueryResultRow & { id: string }>(
      `INSERT INTO event_definitions
        (project_id, name, display_name, description, trigger_timing, module, platforms, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        input.projectId,
        input.name,
        input.displayName,
        input.description,
        input.triggerTiming,
        input.module,
        input.platforms,
        input.status,
      ],
    );
    const eventDefinitionId = result.rows[0]?.id;

    if (!eventDefinitionId) {
      throw new MetadataStoreError("EVENT_DEFINITION_NOT_FOUND");
    }

    await insertRequiredProperties(
      eventDefinitionId,
      input.requiredProperties,
    );

    return findEventDefinition(eventDefinitionId);
  },

  async updateEventDefinition(id, input) {
    const sets: string[] = [];
    const values: unknown[] = [id];

    function addSet(column: string, value: unknown) {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    }

    if (input.displayName !== undefined) {
      addSet("display_name", input.displayName);
    }

    if (input.description !== undefined) {
      addSet("description", input.description);
    }

    if (input.triggerTiming !== undefined) {
      addSet("trigger_timing", input.triggerTiming);
    }

    if (input.module !== undefined) {
      addSet("module", input.module);
    }

    if (input.platforms !== undefined) {
      addSet("platforms", input.platforms);
    }

    if (input.status !== undefined) {
      addSet("status", input.status);
    }

    if (sets.length > 0) {
      const result = await queryPostgres<QueryResultRow & { id: string }>(
        `UPDATE event_definitions
            SET ${sets.join(", ")}, updated_at = now()
          WHERE id = $1
        RETURNING id`,
        values,
      );

      if (!result.rows[0]) {
        throw new MetadataStoreError("EVENT_DEFINITION_NOT_FOUND");
      }
    } else {
      await findEventDefinition(id);
    }

    if (input.requiredProperties !== undefined) {
      await queryPostgres(
        "DELETE FROM event_property_definitions WHERE event_definition_id = $1 AND required = true",
        [id],
      );
      await insertRequiredProperties(id, input.requiredProperties);
    }

    return findEventDefinition(id);
  },

  async createAcceptanceRecord(eventDefinitionId, input) {
    await findEventDefinition(eventDefinitionId);
    const result = await queryPostgres<
      QueryResultRow & {
        id: string;
        event_definition_id: string;
        status: EventAcceptanceRecord["status"];
        note: string;
      }
    >(
      `INSERT INTO event_acceptance_records
        (event_definition_id, actor_user_id, status, note)
       VALUES ($1, $2, $3, $4)
       RETURNING id, event_definition_id, status, note`,
      [eventDefinitionId, input.actorUserId, input.status, input.note],
    );

    if (input.status === "accepted") {
      await queryPostgres(
        "UPDATE event_definitions SET status = 'accepted', updated_at = now() WHERE id = $1",
        [eventDefinitionId],
      );
    }

    return {
      id: result.rows[0].id,
      eventDefinitionId: result.rows[0].event_definition_id,
      status: result.rows[0].status,
      note: result.rows[0].note,
    };
  },
};
