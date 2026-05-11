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

required_files=(
  "manifest.txt"
  "postgres.dump"
  "postgres-schema.sql"
  "clickhouse-raw_events-schema.sql"
  "clickhouse-event_validation_results-schema.sql"
  "clickhouse-raw_events.jsonl"
  "clickhouse-event_validation_results.jsonl"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$BACKUP_DIR/$file" ]]; then
    echo "Missing backup file: $file" >&2
    exit 1
  fi
done

if [[ ! -s "$BACKUP_DIR/postgres.dump" ]]; then
  echo "postgres.dump is empty" >&2
  exit 1
fi

if ! grep -q "CREATE TABLE" "$BACKUP_DIR/postgres-schema.sql"; then
  echo "postgres-schema.sql does not look like a schema dump" >&2
  exit 1
fi

if ! grep -q "CREATE TABLE" "$BACKUP_DIR/clickhouse-raw_events-schema.sql"; then
  echo "clickhouse-raw_events-schema.sql does not look like a ClickHouse schema" >&2
  exit 1
fi

if ! grep -q "CREATE TABLE" "$BACKUP_DIR/clickhouse-event_validation_results-schema.sql"; then
  echo "clickhouse-event_validation_results-schema.sql does not look like a ClickHouse schema" >&2
  exit 1
fi

awk '/^checksums:/{flag=1; next} flag {print}' "$BACKUP_DIR/manifest.txt" \
  | (cd "$BACKUP_DIR" && shasum -a 256 -c -)

docker compose exec -T postgres pg_restore --list < "$BACKUP_DIR/postgres.dump" >/dev/null

raw_event_lines="$(wc -l < "$BACKUP_DIR/clickhouse-raw_events.jsonl" | tr -d ' ')"
validation_lines="$(wc -l < "$BACKUP_DIR/clickhouse-event_validation_results.jsonl" | tr -d ' ')"

echo "Backup verified:"
echo "$BACKUP_DIR"
echo "clickhouse_raw_event_lines=$raw_event_lines"
echo "clickhouse_validation_result_lines=$validation_lines"
