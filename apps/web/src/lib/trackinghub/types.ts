export type NavItem = {
  href: string;
  label: string;
};

export type StatusCard = {
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "purple" | "red";
};

export type AcceptanceTone = "success" | "warning" | "danger";

export type AcceptanceItem = {
  event: string;
  project: string;
  source: string;
  environment: string;
  status: string;
  tone: AcceptanceTone;
};

export type PageShell = {
  title: string;
  eyebrow: string;
  badge: string;
  actionLabel: string;
  sections: string[];
};

export type EventDictionaryStatus = "ready" | "needs_fix" | "accepted";

export type EventDictionaryItem = {
  id: string;
  eventName: string;
  displayName: string;
  project: string;
  platforms: string;
  environment: string;
  owner: string;
  status: string;
  statusTone: AcceptanceTone;
  lastSeen: string;
};

export type EventProperty = {
  name: string;
  type: "string" | "number" | "boolean";
  description: string;
  example: string;
};

export type EventSampleStatus = {
  eventName: string;
  environment: string;
  source: string;
  status: "valid" | "invalid" | "unknown_event";
  errors: string[];
  sampleEventId: string;
  observedAt: string;
};

export type FeaturedEventDetail = {
  eventName: string;
  displayName: string;
  businessGoal: string;
  triggerTiming: string;
  platforms: string[];
  requiredProperties: EventProperty[];
  recentSamples?: EventSampleStatus[];
};

export type GovernanceAcceptanceCheck = {
  label: string;
  detail: string;
  tone: AcceptanceTone;
};

export type ProjectItem = {
  name: string;
  slug: string;
  description: string;
  platforms: string;
  status: string;
  owner: string;
  events: string;
};

export type ProjectEnvironmentItem = {
  project: string;
  name: "dev" | "staging" | "prod" | "test" | "develop" | "production";
  enabled: boolean;
  lastEventAt: string;
  writeKeyStatus: string;
};

export type SdkKeyItem = {
  id: string;
  project: string;
  environment: string;
  source: "Web" | "Flutter";
  maskedKey: string;
  status: "启用" | "轮换中" | "停用";
  lastUsed: string;
};

export type AnalyticsFunnelStep = {
  step: string;
  eventName: string;
  users: string;
  usersValue: number;
  conversion: string;
  conversionRate: number;
};

export type AnalyticsRetentionItem = {
  cohort: string;
  day: number;
  cohortUsers: string;
  cohortUsersValue: number;
  retainedUsers: string;
  retainedUsersValue: number;
  retention: string;
  retentionRate: number;
};

export type AnalyticsTrendItem = {
  bucket: string;
  eventName: string;
  environment: string;
  source: string;
  eventCount: string;
  eventCountValue: number;
  uniqueUsers: string;
  uniqueUsersValue: number;
};

export type AnalyticsPropertyValueItem = {
  propertyKey: string;
  propertyValue: string;
  distinctValues: number;
  eventCount: string;
  eventCountValue: number;
  uniqueUsers: string;
  uniqueUsersValue: number;
};

export type AnalyticsProjectOption = {
  id: string;
  name: string;
  slug: string;
};
