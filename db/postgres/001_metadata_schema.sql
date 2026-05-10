CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  password_hash TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, email)
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

CREATE TABLE project_environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (name IN ('dev', 'staging', 'prod')),
  write_key_hash TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);

CREATE TABLE sdk_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_environment_id UUID NOT NULL REFERENCES project_environments(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('web', 'flutter')),
  key_hash TEXT NOT NULL,
  masked_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'rotating', 'disabled')),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_environment_id, source, masked_key)
);

CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'product', 'operations', 'engineering', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, email)
);

CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'product', 'operations', 'engineering', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, member_id)
);

CREATE TABLE tracking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  business_goal TEXT NOT NULL,
  module TEXT NOT NULL,
  owner_id UUID REFERENCES members(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (
    status IN (
      'draft',
      'ready_for_development',
      'in_development',
      'released',
      'accepted',
      'deprecated'
    )
  ),
  platforms TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE event_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tracking_request_id UUID REFERENCES tracking_requests(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  trigger_timing TEXT NOT NULL DEFAULT '',
  module TEXT NOT NULL,
  platforms TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'released', 'accepted', 'deprecated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);

CREATE TABLE event_property_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_definition_id UUID NOT NULL REFERENCES event_definitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('string', 'number', 'boolean', 'object', 'array')),
  required BOOLEAN NOT NULL DEFAULT false,
  description TEXT NOT NULL DEFAULT '',
  allowed_values JSONB NOT NULL DEFAULT '[]'::jsonb,
  example_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_definition_id, name)
);

CREATE TABLE event_validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  event_definition_id UUID REFERENCES event_definitions(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('dev', 'staging', 'prod')),
  source TEXT NOT NULL CHECK (source IN ('web', 'flutter')),
  status TEXT NOT NULL CHECK (status IN ('valid', 'invalid', 'unknown_event')),
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  sample_event_id TEXT,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE event_acceptance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_definition_id UUID NOT NULL REFERENCES event_definitions(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('accepted', 'rejected', 'needs_fix')),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('overview', 'event_trend', 'funnel', 'retention', 'campaign', 'commercial')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (
    type IN (
      'daily',
      'weekly',
      'anomaly',
      'version_comparison',
      'campaign_comparison',
      'funnel_dropoff',
      'schema_quality'
    )
  ),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_query_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_by TEXT NOT NULL DEFAULT 'codex',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sdk_keys_environment_status ON sdk_keys(project_environment_id, status);
CREATE INDEX idx_tracking_requests_project_status ON tracking_requests(project_id, status);
CREATE INDEX idx_event_definitions_project_status ON event_definitions(project_id, status);
CREATE INDEX idx_event_validation_recent ON event_validation_results(project_id, event_name, observed_at DESC);
CREATE INDEX idx_event_acceptance_definition_created ON event_acceptance_records(event_definition_id, created_at DESC);
CREATE INDEX idx_reports_project_generated ON reports(project_id, generated_at DESC);
