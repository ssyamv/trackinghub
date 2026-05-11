import { createHash } from "node:crypto";

export type PlatformSource = "web" | "flutter";
export type ProjectEnvironmentName =
  | "dev"
  | "staging"
  | "prod"
  | "test"
  | "develop"
  | "production";
export type SdkKeyStatus = "active" | "rotating" | "disabled";
export type EventDefinitionStatus =
  | "draft"
  | "ready"
  | "released"
  | "accepted"
  | "deprecated";

export type MetadataStoreErrorCode =
  | "PROJECT_NOT_FOUND"
  | "ENVIRONMENT_NOT_FOUND"
  | "SDK_KEY_NOT_FOUND"
  | "EVENT_DEFINITION_NOT_FOUND";

export class MetadataStoreError extends Error {
  constructor(public readonly code: MetadataStoreErrorCode) {
    super(code);
    this.name = "MetadataStoreError";
  }
}

export function hashSdkWriteKey(writeKey: string) {
  return createHash("sha256").update(writeKey).digest("hex");
}

export type ProjectRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  ownerName: string;
  platforms: PlatformSource[];
  status: string;
};

export type ProjectEnvironmentRecord = {
  id: string;
  projectId: string;
  projectName: string;
  name: ProjectEnvironmentName;
  enabled: boolean;
  lastEventAt: string | null;
};

export type SdkKeyRecord = {
  id: string;
  projectId: string;
  projectName: string;
  environment: ProjectEnvironmentName;
  source: PlatformSource;
  maskedKey: string;
  status: SdkKeyStatus;
  lastUsedAt: string | null;
  keyHash?: string;
};

export type SdkWriteKeyVerificationInput = {
  projectId: string;
  environment: ProjectEnvironmentName;
  source: PlatformSource;
  keyHash: string;
};

export type SdkWriteKeyVerification = {
  valid: boolean;
};

export type EventPropertyRecord = {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required: boolean;
  description: string;
  exampleValue: string | number | boolean | null;
};

export type EventDefinitionRecord = {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  displayName: string;
  description: string;
  triggerTiming: string;
  module: string;
  platforms: PlatformSource[];
  status: EventDefinitionStatus;
  requiredProperties: EventPropertyRecord[];
  optionalProperties: EventPropertyRecord[];
  lastSeenAt: string | null;
};

export type EventAcceptanceRecord = {
  id: string;
  eventDefinitionId: string;
  status: "accepted" | "rejected" | "needs_fix";
  note: string;
};

export type EventValidationStatus = "valid" | "invalid" | "unknown_event";
export type ReportType =
  | "daily"
  | "weekly"
  | "anomaly"
  | "version_comparison"
  | "campaign_comparison"
  | "funnel_dropoff"
  | "schema_quality";

export type EventValidationResultInput = {
  id: string;
  project_id: string;
  event_definition_id: string | null;
  event_name: string;
  environment: ProjectEnvironmentName;
  source: PlatformSource;
  status: EventValidationStatus;
  errors: string[];
  sample_event_id: string;
  observed_at: string;
};

export type EventValidationResultRecord = {
  id: string;
  projectId: string;
  eventDefinitionId: string | null;
  eventName: string;
  environment: ProjectEnvironmentName;
  source: PlatformSource;
  status: EventValidationStatus;
  errors: string[];
  sampleEventId: string;
  observedAt: string;
};

export type ValidatableEventDefinitionInput = {
  projectId: string;
  eventName: string;
  source: PlatformSource;
};

export type ProjectsOverview = {
  projects: ProjectRecord[];
  environments: ProjectEnvironmentRecord[];
  sdkKeys: SdkKeyRecord[];
};

export type GovernanceOverview = {
  definitions: EventDefinitionRecord[];
  validationResults?: EventValidationResultRecord[];
};

export type ReportSourceQueryRef = Record<string, unknown>;

export type ReportRecord = {
  id: string;
  projectId: string;
  projectName: string;
  type: ReportType;
  title: string;
  content: string;
  sourceQueryRefs: ReportSourceQueryRef[];
  generatedBy: string;
  generatedAt: string;
};

export type ReportInput = {
  projectId: string;
  type: ReportType;
  title: string;
  content: string;
  sourceQueryRefs: ReportSourceQueryRef[];
  generatedBy: string;
  generatedAt?: string;
};

export type MetadataStore = {
  listProjectsOverview(): Promise<ProjectsOverview>;
  createProject(
    input: Omit<ProjectRecord, "id" | "status">,
  ): Promise<ProjectRecord>;
  upsertEnvironment(
    projectId: string,
    input: Omit<ProjectEnvironmentRecord, "id" | "projectId" | "projectName">,
  ): Promise<ProjectEnvironmentRecord>;
  createSdkKey(
    projectId: string,
    environment: ProjectEnvironmentName,
    input: Omit<
      SdkKeyRecord,
      "id" | "projectId" | "projectName" | "environment" | "lastUsedAt"
    >,
  ): Promise<SdkKeyRecord>;
  updateSdkKeyStatus(
    sdkKeyId: string,
    status: SdkKeyStatus,
  ): Promise<SdkKeyRecord>;
  verifySdkWriteKey(
    input: SdkWriteKeyVerificationInput,
  ): Promise<SdkWriteKeyVerification>;
  findValidatableEventDefinition(
    input: ValidatableEventDefinitionInput,
  ): Promise<EventDefinitionRecord | null>;
  recordValidationResult(input: EventValidationResultInput): Promise<void>;
  listEventDefinitions(): Promise<GovernanceOverview>;
  createEventDefinition(
    input: Omit<
      EventDefinitionRecord,
      "id" | "projectName" | "lastSeenAt" | "optionalProperties"
    >,
  ): Promise<EventDefinitionRecord>;
  updateEventDefinition(
    id: string,
    input: Partial<
      Pick<
        EventDefinitionRecord,
        | "displayName"
        | "description"
        | "triggerTiming"
        | "module"
        | "platforms"
        | "status"
      >
    > & {
      requiredProperties?: EventPropertyRecord[];
    },
  ): Promise<EventDefinitionRecord>;
  deleteEventDefinition(id: string): Promise<void>;
  createAcceptanceRecord(
    eventDefinitionId: string,
    input: {
      actorUserId: string | null;
      status: "accepted" | "rejected" | "needs_fix";
      note: string;
    },
  ): Promise<EventAcceptanceRecord>;
  createReport(input: ReportInput): Promise<ReportRecord>;
  listReports(projectId: string): Promise<ReportRecord[]>;
};

function cloneProject(project: ProjectRecord): ProjectRecord {
  return {
    ...project,
    platforms: [...project.platforms],
  };
}

function cloneEnvironment(
  environment: ProjectEnvironmentRecord,
): ProjectEnvironmentRecord {
  return {
    ...environment,
  };
}

function cloneSdkKey(sdkKey: SdkKeyRecord): SdkKeyRecord {
  return {
    ...sdkKey,
  };
}

function cloneEventProperty(property: EventPropertyRecord): EventPropertyRecord {
  return {
    ...property,
  };
}

function cloneEventDefinition(
  definition: EventDefinitionRecord,
): EventDefinitionRecord {
  return {
    ...definition,
    platforms: [...definition.platforms],
    requiredProperties: definition.requiredProperties.map(cloneEventProperty),
    optionalProperties: definition.optionalProperties.map(cloneEventProperty),
  };
}

function toValidationResultRecord(
  input: EventValidationResultInput,
): EventValidationResultRecord {
  return {
    id: input.id,
    projectId: input.project_id,
    eventDefinitionId: input.event_definition_id,
    eventName: input.event_name,
    environment: input.environment,
    source: input.source,
    status: input.status,
    errors: [...input.errors],
    sampleEventId: input.sample_event_id,
    observedAt: input.observed_at,
  };
}

function cloneValidationResult(
  result: EventValidationResultRecord,
): EventValidationResultRecord {
  return {
    ...result,
    errors: [...result.errors],
  };
}

function cloneSourceQueryRefs(refs: ReportSourceQueryRef[]) {
  return JSON.parse(JSON.stringify(refs)) as ReportSourceQueryRef[];
}

function cloneReport(report: ReportRecord): ReportRecord {
  return {
    ...report,
    sourceQueryRefs: cloneSourceQueryRefs(report.sourceQueryRefs),
  };
}

export function createMemoryMetadataStore(): MetadataStore {
  const projects: ProjectRecord[] = [];
  const environments: ProjectEnvironmentRecord[] = [];
  const sdkKeys: SdkKeyRecord[] = [];
  const definitions: EventDefinitionRecord[] = [];
  const validationResults: EventValidationResultRecord[] = [];
  const acceptanceRecords: EventAcceptanceRecord[] = [];
  const reports: ReportRecord[] = [];
  let projectSequence = 1;
  let environmentSequence = 1;
  let sdkKeySequence = 1;
  let eventDefinitionSequence = 1;
  let acceptanceSequence = 1;
  let reportSequence = 1;

  function findProject(projectId: string): ProjectRecord {
    const project = projects.find((item) => item.id === projectId);

    if (!project) {
      throw new MetadataStoreError("PROJECT_NOT_FOUND");
    }

    return project;
  }

  function findEventDefinitionIndex(eventDefinitionId: string): number {
    const index = definitions.findIndex((item) => item.id === eventDefinitionId);

    if (index < 0) {
      throw new MetadataStoreError("EVENT_DEFINITION_NOT_FOUND");
    }

    return index;
  }

  return {
    async listProjectsOverview() {
      return {
        projects: projects.map(cloneProject),
        environments: environments.map(cloneEnvironment),
        sdkKeys: sdkKeys.map(cloneSdkKey),
      };
    },

    async createProject(input) {
      const project: ProjectRecord = {
        id: `project_${projectSequence++}`,
        ...input,
        platforms: [...input.platforms],
        status: "active",
      };

      projects.push(project);

      return cloneProject(project);
    },

    async upsertEnvironment(projectId, input) {
      const project = findProject(projectId);
      const existingIndex = environments.findIndex(
        (item) => item.projectId === projectId && item.name === input.name,
      );
      const environment: ProjectEnvironmentRecord = {
        id:
          existingIndex >= 0
            ? environments[existingIndex].id
            : `environment_${environmentSequence++}`,
        projectId,
        projectName: project.name,
        ...input,
      };

      if (existingIndex >= 0) {
        environments[existingIndex] = environment;
      } else {
        environments.push(environment);
      }

      return cloneEnvironment(environment);
    },

    async createSdkKey(projectId, environment, input) {
      const project = findProject(projectId);
      const projectEnvironment = environments.find(
        (item) => item.projectId === projectId && item.name === environment,
      );

      if (!projectEnvironment) {
        throw new MetadataStoreError("ENVIRONMENT_NOT_FOUND");
      }

      const sdkKey: SdkKeyRecord = {
        id: `sdk_key_${sdkKeySequence++}`,
        projectId,
        projectName: project.name,
        environment,
        lastUsedAt: null,
        ...input,
      };

      sdkKeys.push(sdkKey);

      return cloneSdkKey(sdkKey);
    },

    async updateSdkKeyStatus(sdkKeyId, status) {
      const sdkKeyIndex = sdkKeys.findIndex((item) => item.id === sdkKeyId);

      if (sdkKeyIndex < 0) {
        throw new MetadataStoreError("SDK_KEY_NOT_FOUND");
      }

      sdkKeys[sdkKeyIndex] = {
        ...sdkKeys[sdkKeyIndex],
        status,
      };

      return cloneSdkKey(sdkKeys[sdkKeyIndex]);
    },

    async verifySdkWriteKey(input) {
      const environment = environments.find(
        (item) =>
          item.projectId === input.projectId &&
          item.name === input.environment &&
          item.enabled,
      );

      if (!environment) {
        return { valid: false };
      }

      return {
        valid: sdkKeys.some(
          (item) =>
            item.projectId === input.projectId &&
            item.environment === input.environment &&
            item.source === input.source &&
            item.status === "active" &&
            item.keyHash === input.keyHash,
        ),
      };
    },

    async findValidatableEventDefinition(input) {
      const definition = definitions.find(
        (item) =>
          item.projectId === input.projectId &&
          item.name === input.eventName &&
          item.platforms.includes(input.source) &&
          ["ready", "released", "accepted"].includes(item.status),
      );

      return definition ? cloneEventDefinition(definition) : null;
    },

    async listEventDefinitions() {
      const definitionsWithLastSeen = definitions.map((definition) => {
        const definitionResults = validationResults.filter(
          (result) => result.eventDefinitionId === definition.id,
        );
        const lastSeenAt = definitionResults.reduce<string | null>(
          (latest, result) =>
            !latest || result.observedAt > latest ? result.observedAt : latest,
          null,
        );

        return cloneEventDefinition({
          ...definition,
          lastSeenAt,
        });
      });

      return {
        definitions: definitionsWithLastSeen,
        validationResults: validationResults
          .toSorted((left, right) => right.observedAt.localeCompare(left.observedAt))
          .map(cloneValidationResult),
      };
    },

    async recordValidationResult(input) {
      const existingIndex = validationResults.findIndex(
        (result) => result.id === input.id,
      );
      const result = toValidationResultRecord(input);

      if (existingIndex >= 0) {
        validationResults[existingIndex] = result;
      } else {
        validationResults.push(result);
      }
    },

    async createEventDefinition(input) {
      const project = findProject(input.projectId);
      const definition: EventDefinitionRecord = {
        id: `event_definition_${eventDefinitionSequence++}`,
        ...input,
        projectName: project.name,
        platforms: [...input.platforms],
        requiredProperties: input.requiredProperties.map(cloneEventProperty),
        optionalProperties: [],
        lastSeenAt: null,
      };

      definitions.push(definition);

      return cloneEventDefinition(definition);
    },

    async updateEventDefinition(id, input) {
      const definitionIndex = findEventDefinitionIndex(id);
      const definition = definitions[definitionIndex];

      definitions[definitionIndex] = {
        ...definition,
        displayName: input.displayName ?? definition.displayName,
        description: input.description ?? definition.description,
        triggerTiming: input.triggerTiming ?? definition.triggerTiming,
        module: input.module ?? definition.module,
        platforms: input.platforms
          ? [...input.platforms]
          : [...definition.platforms],
        status: input.status ?? definition.status,
        requiredProperties: input.requiredProperties
          ? input.requiredProperties.map(cloneEventProperty)
          : definition.requiredProperties.map(cloneEventProperty),
      };

      return cloneEventDefinition(definitions[definitionIndex]);
    },

    async deleteEventDefinition(id) {
      const definitionIndex = findEventDefinitionIndex(id);

      definitions.splice(definitionIndex, 1);
    },

    async createAcceptanceRecord(eventDefinitionId, input) {
      const definitionIndex = findEventDefinitionIndex(eventDefinitionId);
      const acceptanceRecord: EventAcceptanceRecord = {
        id: `acceptance_${acceptanceSequence++}`,
        eventDefinitionId,
        status: input.status,
        note: input.note,
      };

      acceptanceRecords.push(acceptanceRecord);

      if (input.status === "accepted") {
        definitions[definitionIndex] = {
          ...definitions[definitionIndex],
          status: "accepted",
        };
      }

      return { ...acceptanceRecord };
    },

    async createReport(input) {
      const project = findProject(input.projectId);
      const report: ReportRecord = {
        id: `report_${reportSequence++}`,
        projectId: input.projectId,
        projectName: project.name,
        type: input.type,
        title: input.title,
        content: input.content,
        sourceQueryRefs: cloneSourceQueryRefs(input.sourceQueryRefs),
        generatedBy: input.generatedBy,
        generatedAt: input.generatedAt ?? new Date().toISOString(),
      };

      reports.push(report);

      return cloneReport(report);
    },

    async listReports(projectId) {
      findProject(projectId);

      return reports
        .filter((report) => report.projectId === projectId)
        .toSorted((left, right) =>
          right.generatedAt.localeCompare(left.generatedAt),
        )
        .map(cloneReport);
    },
  };
}
