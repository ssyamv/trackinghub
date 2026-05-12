#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

cd "$ROOT_DIR"

info() {
  printf '\033[1;34m%s\033[0m\n' "$*"
}

warn() {
  printf '\033[1;33m%s\033[0m\n' "$*"
}

fail() {
  printf '\033[1;31m%s\033[0m\n' "$*" >&2
  exit 1
}

require_docker() {
  command -v docker >/dev/null 2>&1 || fail "未找到 docker，请先安装 Docker Desktop 或 Docker Engine。"
  docker compose version >/dev/null 2>&1 || fail "当前 docker 不支持 compose 子命令，请安装 Docker Compose v2。"
  docker info >/dev/null 2>&1 || fail "Docker daemon 不可用，请先启动 Docker。"
}

read_env_var() {
  local key="$1"
  local value

  value="${!key:-}"
  if [[ -n "$value" ]]; then
    printf '%s\n' "$value"
    return
  fi

  if [[ ! -f "$ENV_FILE" ]]; then
    return 0
  fi

  awk -F= -v key="$key" '
    $1 == key {
      sub(/^[^=]*=/, "")
      gsub(/^'\''|'\''$/, "")
      gsub(/^"|"$/, "")
      print
      exit
    }
  ' "$ENV_FILE"
}

set_env_var() {
  local key="$1"
  local value="$2"
  local tmp

  tmp="$(mktemp)"
  awk -v key="$key" -v value="$value" '
    BEGIN { replaced = 0 }
    $0 ~ "^" key "=" {
      print key "=" value
      replaced = 1
      next
    }
    { print }
    END {
      if (replaced == 0) {
        print key "=" value
      }
    }
  ' "$ENV_FILE" > "$tmp"
  mv "$tmp" "$ENV_FILE"
}

random_password() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 24 | tr -d '\n'
    return
  fi

  LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32
}

ensure_env_file() {
  if [[ -f "$ENV_FILE" ]]; then
    return
  fi

  cp "$ROOT_DIR/.env.example" "$ENV_FILE"
  info "已从 .env.example 生成 .env"
}

ensure_admin_env() {
  local generated_password="false"
  local email
  local password
  local name
  local workspace

  email="$(read_env_var TRACKINGHUB_ADMIN_EMAIL)"
  password="$(read_env_var TRACKINGHUB_ADMIN_PASSWORD)"
  name="$(read_env_var TRACKINGHUB_ADMIN_NAME)"
  workspace="$(read_env_var TRACKINGHUB_WORKSPACE_NAME)"

  if [[ -z "$email" ]]; then
    email="admin@trackinghub.local"
    set_env_var TRACKINGHUB_ADMIN_EMAIL "$email"
  fi

  if [[ -z "$password" ]]; then
    password="$(random_password)"
    generated_password="true"
    set_env_var TRACKINGHUB_ADMIN_PASSWORD "$password"
  fi

  if [[ -z "$name" ]]; then
    name="平台管理员"
    set_env_var TRACKINGHUB_ADMIN_NAME "$name"
  fi

  if [[ -z "$workspace" ]]; then
    workspace="TrackingHub"
    set_env_var TRACKINGHUB_WORKSPACE_NAME "$workspace"
  fi

  [[ "$email" == *@* ]] || fail "TRACKINGHUB_ADMIN_EMAIL 必须是有效邮箱。"
  [[ "${#password}" -ge 12 ]] || fail "TRACKINGHUB_ADMIN_PASSWORD 至少需要 12 个字符。"

  ADMIN_EMAIL="$email"
  ADMIN_PASSWORD="$password"
  ADMIN_NAME="$name"
  WORKSPACE_NAME="$workspace"
  ADMIN_PASSWORD_GENERATED="$generated_password"
}

wait_for_service() {
  local service="$1"
  local deadline=$((SECONDS + 180))
  local container_id
  local status

  info "等待 $service 容器健康..."

  while (( SECONDS < deadline )); do
    container_id="$(docker compose ps -q "$service" 2>/dev/null || true)"
    if [[ -n "$container_id" ]]; then
      status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"
      if [[ "$status" == "healthy" || "$status" == "running" ]]; then
        info "$service 已就绪"
        return
      fi
    fi
    sleep 3
  done

  docker compose ps
  fail "$service 在 180 秒内未进入健康状态，请查看 docker compose logs $service。"
}

bootstrap_admin() {
  info "初始化管理员账号..."

  docker compose exec -T postgres psql \
    -U trackinghub \
    -d trackinghub \
    -v ON_ERROR_STOP=1 \
    -v admin_email="$ADMIN_EMAIL" \
    -v admin_password="$ADMIN_PASSWORD" \
    -v admin_name="$ADMIN_NAME" \
    -v workspace_name="$WORKSPACE_NAME" <<'SQL'
WITH existing_workspace AS (
  SELECT id
    FROM workspaces
   ORDER BY created_at ASC
   LIMIT 1
),
created_workspace AS (
  INSERT INTO workspaces (name)
  SELECT :'workspace_name'
   WHERE NOT EXISTS (SELECT 1 FROM existing_workspace)
  RETURNING id
),
selected_workspace AS (
  SELECT id FROM existing_workspace
  UNION ALL
  SELECT id FROM created_workspace
  LIMIT 1
)
INSERT INTO users (workspace_id, name, email, role, password_hash, enabled)
SELECT id,
       :'admin_name',
       lower(:'admin_email'),
       'admin',
       crypt(:'admin_password', gen_salt('bf', 12)),
       true
  FROM selected_workspace
ON CONFLICT (workspace_id, email)
DO UPDATE SET
  name = EXCLUDED.name,
  role = 'admin',
  password_hash = EXCLUDED.password_hash,
  enabled = true,
  updated_at = now();
SQL
}

main() {
  require_docker
  ensure_env_file
  ensure_admin_env

  info "构建并启动 TrackingHub Docker 栈..."
  docker compose up --build -d

  wait_for_service postgres
  wait_for_service clickhouse
  wait_for_service web
  bootstrap_admin

  local web_port
  web_port="$(read_env_var TRACKINGHUB_WEB_PORT)"
  web_port="${web_port:-3000}"

  printf '\nTrackingHub 已启动。\n'
  printf '访问地址: http://localhost:%s\n' "$web_port"
  printf '健康检查: http://localhost:%s/api/health\n' "$web_port"
  printf '管理员账号: %s\n' "$ADMIN_EMAIL"

  if [[ "$ADMIN_PASSWORD_GENERATED" == "true" ]]; then
    warn "已生成管理员密码并写入本地 .env：$ADMIN_PASSWORD"
  else
    warn "管理员密码沿用环境变量或本地 .env 中的 TRACKINGHUB_ADMIN_PASSWORD。"
  fi
}

main "$@"
