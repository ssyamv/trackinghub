CREATE TABLE IF NOT EXISTS raw_events
(
  event_id UUID DEFAULT generateUUIDv4(),
  project_id String,
  environment LowCardinality(String),
  source LowCardinality(String),
  event_name LowCardinality(String),
  user_id Nullable(String),
  anonymous_id Nullable(String),
  device_id Nullable(String),
  session_id Nullable(String),
  timestamp DateTime64(3, 'UTC'),
  received_at DateTime64(3, 'UTC') DEFAULT now64(3),
  app_version Nullable(String),
  sdk_version String,
  channel Nullable(String),
  campaign Nullable(String),
  country Nullable(String),
  properties String,
  context String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (project_id, environment, event_name, timestamp)
TTL timestamp + INTERVAL 400 DAY
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS event_validation_results
(
  id UUID DEFAULT generateUUIDv4(),
  project_id String,
  event_definition_id Nullable(String),
  event_name LowCardinality(String),
  environment LowCardinality(String),
  source LowCardinality(String),
  status LowCardinality(String),
  errors String,
  sample_event_id Nullable(String),
  observed_at DateTime64(3, 'UTC') DEFAULT now64(3)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(observed_at)
ORDER BY (project_id, event_name, environment, source, observed_at)
TTL observed_at + INTERVAL 400 DAY
SETTINGS index_granularity = 8192;
