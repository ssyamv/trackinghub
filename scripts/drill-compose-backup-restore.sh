#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="${TRACKINGHUB_BACKUP_DIR:-"$ROOT_DIR/.trackinghub-backups"}"

find_latest_backup() {
  if [[ ! -d "$BACKUP_ROOT" ]]; then
    return 1
  fi

  find "$BACKUP_ROOT" -mindepth 2 -maxdepth 2 -name manifest.txt -print0 \
    | xargs -0 ls -t 2>/dev/null \
    | head -n 1 \
    | xargs dirname
}

manifest_value() {
  local key="$1"
  awk -F= -v key="$key" '$1 == key { print $2; exit }' "$BACKUP_DIR/manifest.txt"
}

restore_clickhouse_schema() {
  local file="$1"
  perl -pe "s/\\\\n/\n/g; s/\\\\'/'/g" "$file" \
    | sed "s/CREATE TABLE trackinghub\\./CREATE TABLE ${CLICKHOUSE_DRILL_DB}./" \
    | docker compose exec -T clickhouse clickhouse-client --multiquery
}

if [[ "${1:-}" == "--" ]]; then
  shift
fi

BACKUP_DIR="${1:-}"
if [[ -z "$BACKUP_DIR" ]]; then
  BACKUP_DIR="$(find_latest_backup || true)"
fi

if [[ -z "$BACKUP_DIR" || ! -d "$BACKUP_DIR" ]]; then
  echo "Backup directory not found. Pass a backup path or run pnpm run backup:compose first." >&2
  exit 1
fi

cd "$ROOT_DIR"

DRILL_ID="$(date -u +"%Y%m%d%H%M%S")_$$"
POSTGRES_DRILL_DB="trackinghub_restore_drill_${DRILL_ID}"
CLICKHOUSE_DRILL_DB="trackinghub_restore_drill_${DRILL_ID}"

cleanup() {
  docker compose exec -T postgres dropdb -U trackinghub --if-exists "$POSTGRES_DRILL_DB" >/dev/null 2>&1 || true
  docker compose exec -T clickhouse clickhouse-client --query "DROP DATABASE IF EXISTS ${CLICKHOUSE_DRILL_DB}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "Running backup restore drill:"
echo "$BACKUP_DIR"

cleanup

docker compose exec -T postgres createdb -U trackinghub "$POSTGRES_DRILL_DB"
docker compose exec -T postgres pg_restore \
  -U trackinghub \
  -d "$POSTGRES_DRILL_DB" \
  --no-owner \
  --role=trackinghub \
  < "$BACKUP_DIR/postgres.dump"

expected_projects="$(manifest_value postgres_projects)"
expected_event_definitions="$(manifest_value postgres_event_definitions)"
actual_projects="$(docker compose exec -T postgres psql -U trackinghub -d "$POSTGRES_DRILL_DB" -Atc "SELECT count(*) FROM projects")"
actual_event_definitions="$(docker compose exec -T postgres psql -U trackinghub -d "$POSTGRES_DRILL_DB" -Atc "SELECT count(*) FROM event_definitions")"

if [[ "$actual_projects" != "$expected_projects" ]]; then
  echo "Postgres projects count mismatch: expected $expected_projects, got $actual_projects" >&2
  exit 1
fi

if [[ "$actual_event_definitions" != "$expected_event_definitions" ]]; then
  echo "Postgres event_definitions count mismatch: expected $expected_event_definitions, got $actual_event_definitions" >&2
  exit 1
fi

docker compose exec -T clickhouse clickhouse-client --query "CREATE DATABASE ${CLICKHOUSE_DRILL_DB}"
restore_clickhouse_schema "$BACKUP_DIR/clickhouse-raw_events-schema.sql"
restore_clickhouse_schema "$BACKUP_DIR/clickhouse-event_validation_results-schema.sql"

if [[ -s "$BACKUP_DIR/clickhouse-raw_events.jsonl" ]]; then
  docker compose exec -T clickhouse clickhouse-client \
    --database "$CLICKHOUSE_DRILL_DB" \
    --query "INSERT INTO raw_events FORMAT JSONEachRow" \
    < "$BACKUP_DIR/clickhouse-raw_events.jsonl"
fi

if [[ -s "$BACKUP_DIR/clickhouse-event_validation_results.jsonl" ]]; then
  docker compose exec -T clickhouse clickhouse-client \
    --database "$CLICKHOUSE_DRILL_DB" \
    --query "INSERT INTO event_validation_results FORMAT JSONEachRow" \
    < "$BACKUP_DIR/clickhouse-event_validation_results.jsonl"
fi

expected_raw_events="$(manifest_value clickhouse_raw_events)"
expected_validation_results="$(manifest_value clickhouse_validation_results)"
actual_raw_events="$(docker compose exec -T clickhouse clickhouse-client --database "$CLICKHOUSE_DRILL_DB" --query "SELECT count() FROM raw_events")"
actual_validation_results="$(docker compose exec -T clickhouse clickhouse-client --database "$CLICKHOUSE_DRILL_DB" --query "SELECT count() FROM event_validation_results")"

if [[ "$actual_raw_events" != "$expected_raw_events" ]]; then
  echo "ClickHouse raw_events count mismatch: expected $expected_raw_events, got $actual_raw_events" >&2
  exit 1
fi

if [[ "$actual_validation_results" != "$expected_validation_results" ]]; then
  echo "ClickHouse event_validation_results count mismatch: expected $expected_validation_results, got $actual_validation_results" >&2
  exit 1
fi

{
  echo "timestamp_utc=$(date -u +"%Y%m%dT%H%M%SZ")"
  echo "status=ok"
  echo "backup_dir=$BACKUP_DIR"
  echo "postgres_projects=$actual_projects"
  echo "postgres_event_definitions=$actual_event_definitions"
  echo "clickhouse_raw_events=$actual_raw_events"
  echo "clickhouse_validation_results=$actual_validation_results"
} > "$BACKUP_DIR/restore-drill.txt"

echo "Backup restore drill ok:"
echo "postgres_projects=$actual_projects"
echo "postgres_event_definitions=$actual_event_definitions"
echo "clickhouse_raw_events=$actual_raw_events"
echo "clickhouse_validation_results=$actual_validation_results"
