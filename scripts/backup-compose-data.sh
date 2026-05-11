#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="${TRACKINGHUB_BACKUP_DIR:-"$ROOT_DIR/.trackinghub-backups"}"
TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
BACKUP_DIR="${1:-"$BACKUP_ROOT/$TIMESTAMP"}"

cd "$ROOT_DIR"
mkdir -p "$BACKUP_DIR"

echo "Backing up TrackingHub compose data to $BACKUP_DIR"

docker compose exec -T postgres pg_dump \
  -U trackinghub \
  -d trackinghub \
  --format=custom > "$BACKUP_DIR/postgres.dump"

docker compose exec -T postgres pg_dump \
  -U trackinghub \
  -d trackinghub \
  --schema-only > "$BACKUP_DIR/postgres-schema.sql"

docker compose exec -T clickhouse clickhouse-client \
  --database trackinghub \
  --query "SHOW CREATE TABLE raw_events" \
  > "$BACKUP_DIR/clickhouse-raw_events-schema.sql"

docker compose exec -T clickhouse clickhouse-client \
  --database trackinghub \
  --query "SHOW CREATE TABLE event_validation_results" \
  > "$BACKUP_DIR/clickhouse-event_validation_results-schema.sql"

docker compose exec -T clickhouse clickhouse-client \
  --database trackinghub \
  --query "SELECT * FROM raw_events FORMAT JSONEachRow" \
  > "$BACKUP_DIR/clickhouse-raw_events.jsonl"

docker compose exec -T clickhouse clickhouse-client \
  --database trackinghub \
  --query "SELECT * FROM event_validation_results FORMAT JSONEachRow" \
  > "$BACKUP_DIR/clickhouse-event_validation_results.jsonl"

{
  echo "timestamp_utc=$TIMESTAMP"
  echo "git_commit=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
  echo "postgres_projects=$(docker compose exec -T postgres psql -U trackinghub -d trackinghub -Atc "SELECT count(*) FROM projects")"
  echo "postgres_event_definitions=$(docker compose exec -T postgres psql -U trackinghub -d trackinghub -Atc "SELECT count(*) FROM event_definitions")"
  echo "clickhouse_raw_events=$(docker compose exec -T clickhouse clickhouse-client --database trackinghub --query "SELECT count() FROM raw_events")"
  echo "clickhouse_validation_results=$(docker compose exec -T clickhouse clickhouse-client --database trackinghub --query "SELECT count() FROM event_validation_results")"
  echo "checksums:"
  (cd "$BACKUP_DIR" && shasum -a 256 postgres.dump postgres-schema.sql clickhouse-*.sql clickhouse-*.jsonl)
} > "$BACKUP_DIR/manifest.txt"

echo "Backup complete:"
echo "$BACKUP_DIR"
