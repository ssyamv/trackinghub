export type PlatformSource = "web" | "flutter";
export type ProjectEnvironmentName = "dev" | "staging" | "prod";
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

export type ProjectsOverview = {
  projects: ProjectRecord[];
  environments: ProjectEnvironmentRecord[];
  sdkKeys: SdkKeyRecord[];
};

export type GovernanceOverview = {
  definitions: EventDefinitionRecord[];
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
  listEventDefinitions(): Promise<GovernanceOverview>;
  createEventDefinition(
    input: Omit<
      EventDefinitionRecord,
      "id" | "projectName" | "lastSeenAt" | "optionalProperties"
    >,
  ): Promise<EventDefinitionRecord>;
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

export function createMemoryMetadataStore(): MetadataStore {
  const projects: ProjectRecord[] = [];
  const environments: ProjectEnvironmentRecord[] = [];
  const sdkKeys: SdkKeyRecord[] = [];
  const definitions: EventDefinitionRecord[] = [];
  let projectSequence = 1;
  let environmentSequence = 1;
  let sdkKeySequence = 1;
  let eventDefinitionSequence = 1;

  function findProject(projectId: string): ProjectRecord {
    const project = projects.find((item) => item.id === projectId);

    if (!project) {
      throw new MetadataStoreError("PROJECT_NOT_FOUND");
    }

    return project;
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

    async listEventDefinitions() {
      return {
        definitions: definitions.map(cloneEventDefinition),
      };
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
  };
}
