export const RAW_LOGS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS raw_logs
  (
    log_id UUID DEFAULT generateUUIDv4(),
    project_id String,
    environment LowCardinality(String),
    source LowCardinality(String),
    level LowCardinality(String),
    message String,
    logger Nullable(String),
    user_id Nullable(String),
    anonymous_id Nullable(String),
    device_id Nullable(String),
    session_id Nullable(String),
    timestamp DateTime64(3, 'UTC'),
    received_at DateTime64(3, 'UTC') DEFAULT now64(3),
    app_version Nullable(String),
    sdk_version String,
    channel Nullable(String),
    country Nullable(String),
    trace_id Nullable(String),
    error_name Nullable(String),
    error_message Nullable(String),
    stack Nullable(String),
    attributes String,
    context String
  )
  ENGINE = MergeTree
  PARTITION BY toYYYYMM(timestamp)
  ORDER BY (project_id, environment, level, timestamp)
  TTL toDateTime(timestamp) + INTERVAL 90 DAY
  SETTINGS index_granularity = 8192
`;
