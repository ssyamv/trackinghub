# TrackingHub 元数据与本地身份基础 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 TrackingHub 从静态管理工作台升级为具备本地登录、角色权限、Postgres 元数据 API、项目管理与事件治理真实数据接入的第一阶段内部平台。

**Architecture:** 在 `apps/web` 内新增小型服务端模块：`auth` 负责密码、session 和权限，`metadata` 负责 Postgres 仓储和 API DTO 映射。API route 保持 Next.js App Router 形态，业务逻辑拆到可单测的 handler/repository 函数；页面先通过仓储函数读取服务端数据，组件继续复用现有 workbench props。

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Postgres SQL DDL, `pg`, `bcryptjs`, httpOnly cookie session.

---

## Scope

本计划只实现已确认 spec 的第一阶段：

- 本地内置登录和 `admin` / `editor` / `viewer` 角色。
- Postgres 元数据 DDL 与仓储接口。
- 项目、环境、SDK Key、事件字典、属性 Schema、验收记录 API。
- `/projects` 与 `/governance` 从真实仓储读取数据，保留静态 seed 作为无数据库配置时的开发回退。
- 为后续动态 Schema 验证提供 `EventDefinitionRepository` 接口，但不改 `/api/events` 热路径。

本计划不实现 OAuth、ClickHouse 分析查询、Codex 报告 runner、生产部署自动化、Flutter SDK 增强。

## File Structure

- `db/postgres/001_metadata_schema.sql`: 补齐 `users`、`sessions`、`sdk_keys`、`event_acceptance_records`，并让事件状态包含 `ready`。
- `apps/web/package.json`, `pnpm-lock.yaml`: 增加 `pg`、`bcryptjs`、`@types/pg`、`@types/bcryptjs`。
- `apps/web/src/lib/auth/password.ts`: 密码哈希与校验。
- `apps/web/src/lib/auth/session.ts`: session cookie 名称、过期时间、cookie 序列化与解析。
- `apps/web/src/lib/auth/permissions.ts`: 角色、权限判断、受保护 handler helper。
- `apps/web/src/lib/auth/auth-store.ts`: 用户/session 仓储接口和 Postgres 实现。
- `apps/web/src/lib/auth/auth-store.test.ts`: 仓储与权限的单元测试，使用内存仓储避免真实数据库。
- `apps/web/src/lib/metadata/postgres.ts`: `pg` pool 创建、查询封装、无配置错误。
- `apps/web/src/lib/metadata/metadata-store.ts`: 项目、环境、SDK Key、事件定义、属性、验收记录仓储接口与 Postgres 实现。
- `apps/web/src/lib/metadata/metadata-store.test.ts`: DTO 映射和权限无关仓储行为测试，使用内存仓储。
- `apps/web/src/lib/metadata/schema-contract.test.ts`: SQL DDL 合约测试，确保关键表和约束存在。
- `apps/web/src/lib/trackinghub/project-api.ts`: 将项目仓储结果映射为现有 `ProjectManagementWorkbench` props。
- `apps/web/src/lib/trackinghub/governance-api.ts`: 将事件仓储结果映射为现有 `GovernanceWorkbench` 和 `EventDictionaryEditor` props。
- `apps/web/src/app/api/auth/login/route.ts`: 登录 API。
- `apps/web/src/app/api/auth/logout/route.ts`: 登出 API。
- `apps/web/src/app/api/auth/me/route.ts`: 当前用户 API。
- `apps/web/src/app/api/projects/route.ts`: 项目列表和创建 API。
- `apps/web/src/app/api/projects/[id]/route.ts`: 项目更新 API。
- `apps/web/src/app/api/projects/[id]/environments/route.ts`: 环境创建/启用 API。
- `apps/web/src/app/api/sdk-keys/[id]/route.ts`: SDK Key 停用/轮换 API。
- `apps/web/src/app/api/event-definitions/route.ts`: 事件定义列表和创建 API。
- `apps/web/src/app/api/event-definitions/[id]/route.ts`: 事件定义更新 API。
- `apps/web/src/app/api/event-definitions/[id]/acceptance/route.ts`: 验收记录 API。
- `apps/web/src/app/api/**/route.test.ts`: API handler 测试，直接调用 handler 并注入内存仓储。
- `apps/web/src/app/projects/page.tsx`: 从项目 API mapper 读取数据。
- `apps/web/src/app/governance/page.tsx`: 从治理 API mapper 读取数据。

---

### Task 1: 补齐元数据 DDL 合约

**Files:**
- Modify: `db/postgres/001_metadata_schema.sql`
- Create: `apps/web/src/lib/metadata/schema-contract.test.ts`

- [ ] **Step 1: 写 DDL 合约失败测试**

Create `apps/web/src/lib/metadata/schema-contract.test.ts`:

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(
  path.resolve(process.cwd(), "../../db/postgres/001_metadata_schema.sql"),
  "utf8",
);

describe("metadata postgres schema", () => {
  it("defines local auth tables and role checks", () => {
    expect(schema).toContain("CREATE TABLE users");
    expect(schema).toContain("CREATE TABLE sessions");
    expect(schema).toContain("role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer'))");
    expect(schema).toContain("password_hash TEXT NOT NULL");
    expect(schema).toContain("expires_at TIMESTAMPTZ NOT NULL");
  });

  it("keeps SDK keys separate from environments", () => {
    expect(schema).toContain("CREATE TABLE sdk_keys");
    expect(schema).toContain("source TEXT NOT NULL CHECK (source IN ('web', 'flutter'))");
    expect(schema).toContain("key_hash TEXT NOT NULL");
    expect(schema).toContain("masked_key TEXT NOT NULL");
  });

  it("supports governance acceptance and ready event definitions", () => {
    expect(schema).toContain("CREATE TABLE event_acceptance_records");
    expect(schema).toContain("status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'released', 'accepted', 'deprecated'))");
  });
});
```

- [ ] **Step 2: 运行测试确认 RED**

Run:

```bash
pnpm --filter web test -- src/lib/metadata/schema-contract.test.ts
```

Expected: FAIL，因为 schema 中还没有 `users`、`sessions`、`sdk_keys`、`event_acceptance_records`。

- [ ] **Step 3: 修改 Postgres DDL**

Modify `db/postgres/001_metadata_schema.sql`:

```sql
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
```

Update `event_definitions.status` check to include `ready`:

```sql
status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'released', 'accepted', 'deprecated')),
```

Add after `project_environments`:

```sql
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
```

Add after `event_validation_results`:

```sql
CREATE TABLE event_acceptance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_definition_id UUID NOT NULL REFERENCES event_definitions(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('accepted', 'rejected', 'needs_fix')),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Add indexes:

```sql
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sdk_keys_environment_status ON sdk_keys(project_environment_id, status);
CREATE INDEX idx_event_acceptance_definition_created ON event_acceptance_records(event_definition_id, created_at DESC);
```

- [ ] **Step 4: 运行测试确认 GREEN**

Run:

```bash
pnpm --filter web test -- src/lib/metadata/schema-contract.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交 DDL 合约**

Run:

```bash
git add db/postgres/001_metadata_schema.sql apps/web/src/lib/metadata/schema-contract.test.ts
git commit -m "feat: 补齐元数据身份 schema"
```

Expected: commit succeeds。

---

### Task 2: 安装服务端依赖并实现认证基础模块

**Files:**
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/web/src/lib/auth/password.ts`
- Create: `apps/web/src/lib/auth/session.ts`
- Create: `apps/web/src/lib/auth/permissions.ts`
- Create: `apps/web/src/lib/auth/auth-store.ts`
- Create: `apps/web/src/lib/auth/auth-store.test.ts`

- [ ] **Step 1: 安装依赖**

Run:

```bash
pnpm --filter web add pg bcryptjs
pnpm --filter web add -D @types/pg @types/bcryptjs
```

Expected: `apps/web/package.json` 和 `pnpm-lock.yaml` 更新。

- [ ] **Step 2: 写认证模块失败测试**

Create `apps/web/src/lib/auth/auth-store.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  assertCanWrite,
  canManageSdkKeys,
  canWriteMetadata,
  type UserRole,
} from "./permissions";
import {
  createSessionCookie,
  parseSessionCookie,
  SESSION_COOKIE_NAME,
} from "./session";

describe("auth permissions", () => {
  it("allows admin and editor to write metadata", () => {
    expect(canWriteMetadata("admin")).toBe(true);
    expect(canWriteMetadata("editor")).toBe(true);
    expect(canWriteMetadata("viewer")).toBe(false);
  });

  it("only allows admin to manage SDK keys", () => {
    expect(canManageSdkKeys("admin")).toBe(true);
    expect(canManageSdkKeys("editor")).toBe(false);
    expect(canManageSdkKeys("viewer")).toBe(false);
  });

  it("throws stable forbidden errors for blocked writes", () => {
    expect(() => assertCanWrite({ role: "viewer" as UserRole })).toThrow(
      "FORBIDDEN",
    );
  });
});

describe("session cookies", () => {
  it("creates and parses httpOnly session cookies", () => {
    const cookie = createSessionCookie("token_123", new Date("2026-05-11T00:00:00.000Z"));

    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=token_123`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(parseSessionCookie(`${SESSION_COOKIE_NAME}=token_123; theme=dark`)).toBe(
      "token_123",
    );
  });
});
```

- [ ] **Step 3: 运行测试确认 RED**

Run:

```bash
pnpm --filter web test -- src/lib/auth/auth-store.test.ts
```

Expected: FAIL，因为 auth 模块不存在。

- [ ] **Step 4: 实现权限与 session 模块**

Create `apps/web/src/lib/auth/permissions.ts`:

```ts
export type UserRole = "admin" | "editor" | "viewer";

export type AuthenticatedUser = {
  id?: string;
  email?: string;
  name?: string;
  role: UserRole;
};

export class AuthError extends Error {
  constructor(
    public readonly code: "UNAUTHENTICATED" | "FORBIDDEN",
    message = code,
  ) {
    super(message);
  }
}

export function canWriteMetadata(role: UserRole) {
  return role === "admin" || role === "editor";
}

export function canManageSdkKeys(role: UserRole) {
  return role === "admin";
}

export function assertCanWrite(user: AuthenticatedUser | null) {
  if (!user) {
    throw new AuthError("UNAUTHENTICATED");
  }

  if (!canWriteMetadata(user.role)) {
    throw new AuthError("FORBIDDEN");
  }
}

export function assertCanManageSdkKeys(user: AuthenticatedUser | null) {
  if (!user) {
    throw new AuthError("UNAUTHENTICATED");
  }

  if (!canManageSdkKeys(user.role)) {
    throw new AuthError("FORBIDDEN");
  }
}
```

Create `apps/web/src/lib/auth/session.ts`:

```ts
export const SESSION_COOKIE_NAME = "trackinghub_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export function sessionExpiresAt(now = new Date()) {
  return new Date(now.getTime() + SESSION_TTL_MS);
}

export function createSessionCookie(
  token: string,
  expiresAt: Date,
  secure = process.env.NODE_ENV === "production",
) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${expiresAt.toUTCString()}`,
  ];

  if (secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function clearSessionCookie() {
  return [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ].join("; ");
}

export function parseSessionCookie(cookieHeader: string | null) {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");

    if (name === SESSION_COOKIE_NAME) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
}
```

Create `apps/web/src/lib/auth/password.ts`:

```ts
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}
```

Create `apps/web/src/lib/auth/auth-store.ts`:

```ts
import { createHash, randomBytes } from "node:crypto";
import type { AuthenticatedUser, UserRole } from "./permissions";

export type AuthUserRecord = AuthenticatedUser & {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  enabled: boolean;
};

export type SessionRecord = {
  id: string;
  token: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
};

export type AuthStore = {
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  createSession(userId: string, expiresAt: Date): Promise<SessionRecord>;
  findUserBySessionToken(token: string, now?: Date): Promise<AuthenticatedUser | null>;
  deleteSession(token: string): Promise<void>;
};

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
```

- [ ] **Step 5: 运行测试确认 GREEN**

Run:

```bash
pnpm --filter web test -- src/lib/auth/auth-store.test.ts
```

Expected: PASS。

- [ ] **Step 6: 提交认证基础模块**

Run:

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/lib/auth
git commit -m "feat: 添加本地认证基础模块"
```

Expected: commit succeeds。

---

### Task 3: 实现 API 响应、错误和受保护 handler helper

**Files:**
- Create: `apps/web/src/lib/api/http.ts`
- Create: `apps/web/src/lib/api/http.test.ts`

- [ ] **Step 1: 写 API helper 失败测试**

Create `apps/web/src/lib/api/http.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AuthError } from "@/lib/auth/permissions";
import { jsonError, mapApiError } from "./http";

describe("api http helpers", () => {
  it("returns stable Chinese error payloads", async () => {
    const response = jsonError(400, "VALIDATION_ERROR", "字段格式不正确");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "字段格式不正确",
      },
    });
  });

  it("maps auth errors to 401 and 403", async () => {
    const unauthenticated = mapApiError(new AuthError("UNAUTHENTICATED"));
    const forbidden = mapApiError(new AuthError("FORBIDDEN"));

    expect(unauthenticated.status).toBe(401);
    expect(await unauthenticated.json()).toEqual({
      ok: false,
      error: { code: "UNAUTHENTICATED", message: "请先登录" },
    });
    expect(forbidden.status).toBe(403);
  });
});
```

- [ ] **Step 2: 运行测试确认 RED**

Run:

```bash
pnpm --filter web test -- src/lib/api/http.test.ts
```

Expected: FAIL，因为 `http.ts` 不存在。

- [ ] **Step 3: 实现 API helper**

Create `apps/web/src/lib/api/http.ts`:

```ts
import { AuthError } from "@/lib/auth/permissions";

export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "DATABASE_UNAVAILABLE";

const DEFAULT_MESSAGES: Record<ApiErrorCode, string> = {
  UNAUTHENTICATED: "请先登录",
  FORBIDDEN: "当前账号没有权限执行此操作",
  VALIDATION_ERROR: "请求字段不完整或格式不正确",
  NOT_FOUND: "资源不存在",
  DATABASE_UNAVAILABLE: "元数据服务暂时不可用",
};

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return Response.json({ ok: true, data }, init);
}

export function jsonError(
  status: number,
  code: ApiErrorCode,
  message = DEFAULT_MESSAGES[code],
) {
  return Response.json(
    {
      ok: false,
      error: { code, message },
    },
    { status },
  );
}

export function mapApiError(error: unknown) {
  if (error instanceof AuthError) {
    return jsonError(error.code === "UNAUTHENTICATED" ? 401 : 403, error.code);
  }

  return jsonError(503, "DATABASE_UNAVAILABLE");
}
```

- [ ] **Step 4: 运行测试确认 GREEN**

Run:

```bash
pnpm --filter web test -- src/lib/api/http.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交 API helper**

Run:

```bash
git add apps/web/src/lib/api
git commit -m "feat: 添加 API 响应 helper"
```

Expected: commit succeeds。

---

### Task 4: 实现登录、登出、当前用户 API

**Files:**
- Create: `apps/web/src/app/api/auth/login/route.ts`
- Create: `apps/web/src/app/api/auth/login/route.test.ts`
- Create: `apps/web/src/app/api/auth/logout/route.ts`
- Create: `apps/web/src/app/api/auth/logout/route.test.ts`
- Create: `apps/web/src/app/api/auth/me/route.ts`
- Create: `apps/web/src/app/api/auth/me/route.test.ts`

- [ ] **Step 1: 写登录 API 失败测试**

Create `apps/web/src/app/api/auth/login/route.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { AuthStore } from "@/lib/auth/auth-store";
import { handleLoginPost } from "./route";

const user = {
  id: "user_1",
  email: "admin@example.com",
  name: "管理员",
  role: "admin" as const,
  passwordHash: "$2a$12$ZrM.EWpJ6S6XHh9Ec4G4zekwu0eY4hu5yYMEF92H1CUWWXLGcF9Ui", // password: secret123
  enabled: true,
};

describe("POST /api/auth/login", () => {
  it("creates a session cookie for valid credentials", async () => {
    const store: AuthStore = {
      findUserByEmail: async () => user,
      createSession: async (_userId, expiresAt) => ({
        id: "session_1",
        token: "token_123",
        tokenHash: "hash_123",
        userId: "user_1",
        expiresAt,
      }),
      findUserBySessionToken: async () => null,
      deleteSession: async () => undefined,
    };

    const response = await handleLoginPost(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "admin@example.com", password: "secret123" }),
      }),
      { store, now: () => new Date("2026-05-10T00:00:00.000Z") },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("trackinghub_session=token_123");
    expect(await response.json()).toEqual({
      ok: true,
      data: {
        user: {
          id: "user_1",
          email: "admin@example.com",
          name: "管理员",
          role: "admin",
        },
      },
    });
  });
});
```

- [ ] **Step 2: 运行测试确认 RED**

Run:

```bash
pnpm --filter web test -- src/app/api/auth/login/route.test.ts
```

Expected: FAIL，因为 route 不存在。

- [ ] **Step 3: 实现登录 handler 和 route**

Create `apps/web/src/app/api/auth/login/route.ts`:

```ts
import { createSessionCookie, sessionExpiresAt } from "@/lib/auth/session";
import type { AuthStore } from "@/lib/auth/auth-store";
import { verifyPassword } from "@/lib/auth/password";
import { jsonError, jsonOk, mapApiError } from "@/lib/api/http";

export const runtime = "nodejs";

type LoginDependencies = {
  store: AuthStore;
  now?: () => Date;
};

export async function handleLoginPost(request: Request, dependencies: LoginDependencies) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return jsonError(400, "VALIDATION_ERROR", "邮箱和密码不能为空");
    }

    const user = await dependencies.store.findUserByEmail(email);

    if (!user || !user.enabled || !(await verifyPassword(password, user.passwordHash))) {
      return jsonError(401, "UNAUTHENTICATED", "邮箱或密码不正确");
    }

    const expiresAt = sessionExpiresAt(dependencies.now?.() ?? new Date());
    const session = await dependencies.store.createSession(user.id, expiresAt);

    return jsonOk(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      {
        headers: {
          "Set-Cookie": createSessionCookie(session.token, expiresAt),
        },
      },
    );
  } catch (error) {
    return mapApiError(error);
  }
}

export async function POST(request: Request) {
  const { defaultAuthStore } = await import("@/lib/auth/default-auth-store");
  return handleLoginPost(request, { store: defaultAuthStore });
}
```

- [ ] **Step 4: 写并实现 logout/me handler**

Create `apps/web/src/app/api/auth/logout/route.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { AuthStore } from "@/lib/auth/auth-store";
import { handleLogoutPost } from "./route";

describe("POST /api/auth/logout", () => {
  it("deletes the current session and clears the cookie", async () => {
    const deletedTokens: string[] = [];
    const store: AuthStore = {
      findUserByEmail: async () => null,
      createSession: async () => {
        throw new Error("not used");
      },
      findUserBySessionToken: async () => null,
      deleteSession: async (token) => {
        deletedTokens.push(token);
      },
    };

    const response = await handleLogoutPost(
      new Request("http://localhost/api/auth/logout", {
        method: "POST",
        headers: { cookie: "trackinghub_session=token_123" },
      }),
      { store },
    );

    expect(response.status).toBe(200);
    expect(deletedTokens).toEqual(["token_123"]);
    expect(response.headers.get("set-cookie")).toContain("Expires=Thu, 01 Jan 1970");
  });
});
```

Create `apps/web/src/app/api/auth/me/route.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { AuthStore } from "@/lib/auth/auth-store";
import { handleMeGet } from "./route";

const store: AuthStore = {
  findUserByEmail: async () => null,
  createSession: async () => {
    throw new Error("not used");
  },
  findUserBySessionToken: async (token) =>
    token === "token_123"
      ? { id: "user_1", email: "admin@example.com", name: "管理员", role: "admin" }
      : null,
  deleteSession: async () => undefined,
};

describe("GET /api/auth/me", () => {
  it("returns the current user for a valid session", async () => {
    const response = await handleMeGet(
      new Request("http://localhost/api/auth/me", {
        headers: { cookie: "trackinghub_session=token_123" },
      }),
      { store },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      data: {
        user: {
          id: "user_1",
          email: "admin@example.com",
          name: "管理员",
          role: "admin",
        },
      },
    });
  });

  it("returns 401 without a valid session", async () => {
    const response = await handleMeGet(
      new Request("http://localhost/api/auth/me"),
      { store },
    );

    expect(response.status).toBe(401);
  });
});
```

Create `apps/web/src/app/api/auth/logout/route.ts` and `apps/web/src/app/api/auth/me/route.ts` with injected `AuthStore`, `parseSessionCookie`, `clearSessionCookie`, `jsonOk`, and `jsonError`. `handleLogoutPost` deletes the parsed token when present and always returns `{ ok: true, data: { loggedOut: true } }`. `handleMeGet` returns `401 UNAUTHENTICATED` when the cookie is missing or the store returns `null`.

- [ ] **Step 5: 运行认证 API 测试**

Run:

```bash
pnpm --filter web test -- src/app/api/auth/login/route.test.ts src/app/api/auth/logout/route.test.ts src/app/api/auth/me/route.test.ts
```

Expected: PASS。

- [ ] **Step 6: 暂不提交**

Expected: Keep changes staged for Task 5 because the route exports import `defaultAuthStore` that is created by Task 5.

---

### Task 5: 实现 Postgres 连接与默认认证仓储

**Files:**
- Create: `apps/web/src/lib/metadata/postgres.ts`
- Create: `apps/web/src/lib/metadata/postgres.test.ts`
- Create: `apps/web/src/lib/auth/default-auth-store.ts`
- Create: `apps/web/src/lib/auth/default-auth-store.test.ts`

- [ ] **Step 1: 写 Postgres 配置失败测试**

Create `apps/web/src/lib/metadata/postgres.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getPostgresConnectionString } from "./postgres";

describe("postgres config", () => {
  it("uses TrackingHub-specific database url first", () => {
    expect(
      getPostgresConnectionString({
        TRACKINGHUB_POSTGRES_URL: "postgres://trackinghub",
        DATABASE_URL: "postgres://generic",
      }),
    ).toBe("postgres://trackinghub");
  });

  it("falls back to DATABASE_URL", () => {
    expect(getPostgresConnectionString({ DATABASE_URL: "postgres://generic" })).toBe(
      "postgres://generic",
    );
  });

  it("returns null when no database is configured", () => {
    expect(getPostgresConnectionString({})).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试确认 RED**

Run:

```bash
pnpm --filter web test -- src/lib/metadata/postgres.test.ts
```

Expected: FAIL，因为 `postgres.ts` 不存在。

- [ ] **Step 3: 实现 Postgres helper**

Create `apps/web/src/lib/metadata/postgres.ts`:

```ts
import { Pool, type QueryResultRow } from "pg";

type Env = Record<string, string | undefined>;

let pool: Pool | null = null;

export function getPostgresConnectionString(env: Env = process.env) {
  return env.TRACKINGHUB_POSTGRES_URL ?? env.DATABASE_URL ?? null;
}

export function getPostgresPool(env: Env = process.env) {
  const connectionString = getPostgresConnectionString(env);

  if (!connectionString) {
    return null;
  }

  pool ??= new Pool({ connectionString });
  return pool;
}

export async function queryPostgres<T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  const activePool = getPostgresPool();

  if (!activePool) {
    throw new Error("TRACKINGHUB_POSTGRES_URL is not configured");
  }

  return activePool.query<T>(text, values);
}
```

- [ ] **Step 4: 实现默认认证仓储**

Create `apps/web/src/lib/auth/default-auth-store.ts`:

```ts
import type { QueryResultRow } from "pg";
import {
  createSessionToken,
  hashSessionToken,
  type AuthStore,
  type AuthUserRecord,
} from "./auth-store";
import { queryPostgres } from "@/lib/metadata/postgres";

type UserRow = QueryResultRow & {
  id: string;
  email: string;
  name: string;
  role: AuthUserRecord["role"];
  password_hash: string;
  enabled: boolean;
};

function toUser(row: UserRow): AuthUserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    passwordHash: row.password_hash,
    enabled: row.enabled,
  };
}

export const defaultAuthStore: AuthStore = {
  async findUserByEmail(email) {
    const result = await queryPostgres<UserRow>(
      "SELECT id, email, name, role, password_hash, enabled FROM users WHERE lower(email) = lower($1) LIMIT 1",
      [email],
    );
    return result.rows[0] ? toUser(result.rows[0]) : null;
  },

  async createSession(userId, expiresAt) {
    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    const result = await queryPostgres<{ id: string }>(
      "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING id",
      [userId, tokenHash, expiresAt.toISOString()],
    );
    return {
      id: result.rows[0].id,
      token,
      tokenHash,
      userId,
      expiresAt,
    };
  },

  async findUserBySessionToken(token, now = new Date()) {
    const result = await queryPostgres<UserRow>(
      `SELECT users.id, users.email, users.name, users.role, users.password_hash, users.enabled
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = $1 AND sessions.expires_at > $2 AND users.enabled = true
       LIMIT 1`,
      [hashSessionToken(token), now.toISOString()],
    );
    return result.rows[0] ? toUser(result.rows[0]) : null;
  },

  async deleteSession(token) {
    await queryPostgres("DELETE FROM sessions WHERE token_hash = $1", [
      hashSessionToken(token),
    ]);
  },
};
```

- [ ] **Step 5: 运行认证与 Postgres 测试确认 GREEN**

Run:

```bash
pnpm --filter web test -- src/lib/metadata/postgres.test.ts src/lib/auth/auth-store.test.ts src/app/api/auth/login/route.test.ts src/app/api/auth/logout/route.test.ts src/app/api/auth/me/route.test.ts
```

Expected: PASS。

- [ ] **Step 6: 提交认证 API 与 Postgres helper**

Run:

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/lib/metadata/postgres.ts apps/web/src/lib/metadata/postgres.test.ts apps/web/src/lib/auth apps/web/src/app/api/auth
git commit -m "feat: 添加本地登录 API"
```

Expected: commit succeeds。

---

### Task 6: 实现元数据仓储接口与内存测试仓储

**Files:**
- Create: `apps/web/src/lib/metadata/metadata-store.ts`
- Create: `apps/web/src/lib/metadata/metadata-store.test.ts`

- [ ] **Step 1: 写仓储行为失败测试**

Create `apps/web/src/lib/metadata/metadata-store.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createMemoryMetadataStore } from "./metadata-store";

describe("metadata store contract", () => {
  it("creates projects with environments and masked SDK keys", async () => {
    const store = createMemoryMetadataStore();

    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web", "flutter"],
    });
    await store.upsertEnvironment(project.id, {
      name: "prod",
      enabled: true,
      lastEventAt: null,
    });
    await store.createSdkKey(project.id, "prod", {
      source: "web",
      maskedKey: "write_key_live_****91",
      status: "active",
      keyHash: "hash",
    });

    const overview = await store.listProjectsOverview();

    expect(overview.projects[0].slug).toBe("magic-frame");
    expect(overview.environments[0].name).toBe("prod");
    expect(overview.sdkKeys[0].maskedKey).toBe("write_key_live_****91");
  });

  it("creates event definitions with required properties", async () => {
    const store = createMemoryMetadataStore();
    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web"],
    });

    const definition = await store.createEventDefinition({
      projectId: project.id,
      name: "pay_button_click",
      displayName: "支付按钮点击",
      description: "点击支付按钮",
      triggerTiming: "点击支付主按钮",
      module: "checkout",
      platforms: ["web"],
      status: "ready",
      requiredProperties: [
        {
          name: "product_id",
          type: "string",
          required: true,
          description: "商品 ID",
          exampleValue: "p_123",
        },
      ],
    });

    const governance = await store.listEventDefinitions();

    expect(definition.name).toBe("pay_button_click");
    expect(governance.definitions[0].requiredProperties[0].name).toBe(
      "product_id",
    );
  });
});
```

- [ ] **Step 2: 运行测试确认 RED**

Run:

```bash
pnpm --filter web test -- src/lib/metadata/metadata-store.test.ts
```

Expected: FAIL，因为 `metadata-store.ts` 不存在。

- [ ] **Step 3: 实现仓储类型和内存实现**

Create `apps/web/src/lib/metadata/metadata-store.ts` with these exported types and memory implementation:

```ts
export type PlatformSource = "web" | "flutter";
export type ProjectEnvironmentName = "dev" | "staging" | "prod";
export type SdkKeyStatus = "active" | "rotating" | "disabled";
export type EventDefinitionStatus = "draft" | "ready" | "released" | "accepted" | "deprecated";

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
  createProject(input: Omit<ProjectRecord, "id" | "status">): Promise<ProjectRecord>;
  upsertEnvironment(projectId: string, input: Omit<ProjectEnvironmentRecord, "id" | "projectId" | "projectName">): Promise<ProjectEnvironmentRecord>;
  createSdkKey(projectId: string, environment: ProjectEnvironmentName, input: Omit<SdkKeyRecord, "id" | "projectId" | "projectName" | "environment" | "lastUsedAt">): Promise<SdkKeyRecord>;
  listEventDefinitions(): Promise<GovernanceOverview>;
  createEventDefinition(input: Omit<EventDefinitionRecord, "id" | "projectName" | "lastSeenAt" | "optionalProperties">): Promise<EventDefinitionRecord>;
};
```

Implement `createMemoryMetadataStore()` with arrays and deterministic ids. `createProject()` pushes `{ id: "project_1", status: "active", ...input }`; `upsertEnvironment()` finds the project by id, updates an existing environment with the same project/name or pushes `environment_1`; `createSdkKey()` finds the matching environment and pushes `sdk_key_1`; `createEventDefinition()` finds the project and pushes `event_definition_1` with `optionalProperties: []` and `lastSeenAt: null`; list methods return shallow copies of the arrays so tests cannot mutate store internals accidentally.

- [ ] **Step 4: 运行测试确认 GREEN**

Run:

```bash
pnpm --filter web test -- src/lib/metadata/metadata-store.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交仓储接口**

Run:

```bash
git add apps/web/src/lib/metadata/metadata-store.ts apps/web/src/lib/metadata/metadata-store.test.ts
git commit -m "feat: 定义元数据仓储接口"
```

Expected: commit succeeds。

---

### Task 7: 实现项目 API 与权限

**Files:**
- Create: `apps/web/src/app/api/projects/route.ts`
- Create: `apps/web/src/app/api/projects/route.test.ts`
- Create: `apps/web/src/app/api/projects/[id]/environments/route.ts`
- Create: `apps/web/src/app/api/projects/[id]/environments/route.test.ts`
- Create: `apps/web/src/app/api/sdk-keys/[id]/route.ts`
- Create: `apps/web/src/app/api/sdk-keys/[id]/route.test.ts`

- [ ] **Step 1: 写项目 API 失败测试**

Create `apps/web/src/app/api/projects/route.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createMemoryMetadataStore } from "@/lib/metadata/metadata-store";
import { handleProjectsGet, handleProjectsPost } from "./route";

describe("/api/projects", () => {
  it("lists project overview for viewers", async () => {
    const store = createMemoryMetadataStore();
    await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web"],
    });

    const response = await handleProjectsGet({ store, user: { role: "viewer" } });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: {
        projects: [{ slug: "magic-frame" }],
      },
    });
  });

  it("blocks viewers from creating projects", async () => {
    const response = await handleProjectsPost(
      new Request("http://localhost/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: "Magic Frame", slug: "magic-frame" }),
      }),
      {
        store: createMemoryMetadataStore(),
        user: { role: "viewer" },
      },
    );

    expect(response.status).toBe(403);
  });
});
```

- [ ] **Step 2: 运行测试确认 RED**

Run:

```bash
pnpm --filter web test -- src/app/api/projects/route.test.ts
```

Expected: FAIL，因为 route 不存在。

- [ ] **Step 3: 实现项目 API handler**

Create `apps/web/src/app/api/projects/route.ts`:

```ts
import { jsonError, jsonOk, mapApiError } from "@/lib/api/http";
import { assertCanWrite, type AuthenticatedUser } from "@/lib/auth/permissions";
import type { MetadataStore } from "@/lib/metadata/metadata-store";

export const runtime = "nodejs";

export async function handleProjectsGet({
  store,
}: {
  store: MetadataStore;
  user: AuthenticatedUser | null;
}) {
  try {
    return jsonOk(await store.listProjectsOverview());
  } catch (error) {
    return mapApiError(error);
  }
}

export async function handleProjectsPost(
  request: Request,
  { store, user }: { store: MetadataStore; user: AuthenticatedUser | null },
) {
  try {
    assertCanWrite(user);
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";

    if (!name || !slug) {
      return jsonError(400, "VALIDATION_ERROR", "项目名称和 slug 不能为空");
    }

    const project = await store.createProject({
      name,
      slug,
      description: typeof body.description === "string" ? body.description : "",
      ownerName: typeof body.ownerName === "string" ? body.ownerName : "未分配",
      platforms: Array.isArray(body.platforms) ? body.platforms : [],
    });

    return jsonOk({ project }, { status: 201 });
  } catch (error) {
    return mapApiError(error);
  }
}
```

Add `GET` and `POST` exports after `defaultMetadataStore` and `defaultAuthStore` are available. The exports should parse the current user from the request cookie and call the same handlers tested above; handler tests remain the source of truth for behavior.

- [ ] **Step 4: 实现环境和 SDK Key handler 测试与代码**

Create `apps/web/src/app/api/projects/[id]/environments/route.test.ts` with two tests: editor can create `{ name: "prod", enabled: true }` and viewer receives `403`. Create `apps/web/src/app/api/sdk-keys/[id]/route.test.ts` with three tests: admin can patch `{ status: "disabled" }`, editor receives `403`, viewer receives `403`.

Implement `handleProjectEnvironmentPost(request, { store, user, projectId })` with `assertCanWrite(user)`, JSON validation for `name`, and `store.upsertEnvironment(projectId, ...)`. Implement `handleSdkKeyPatch(request, { store, user, sdkKeyId })` with `assertCanManageSdkKeys(user)`, JSON validation for `status`, and a new `store.updateSdkKeyStatus(sdkKeyId, status)` method added to `MetadataStore` and the memory store.

- [ ] **Step 5: 运行项目 API 测试确认 GREEN**

Run:

```bash
pnpm --filter web test -- src/app/api/projects/route.test.ts src/app/api/projects/[id]/environments/route.test.ts src/app/api/sdk-keys/[id]/route.test.ts
```

Expected: PASS。

- [ ] **Step 6: 提交项目 API**

Run:

```bash
git add apps/web/src/app/api/projects apps/web/src/app/api/sdk-keys
git commit -m "feat: 添加项目元数据 API"
```

Expected: commit succeeds。

---

### Task 8: 实现事件字典 API 与验收 API

**Files:**
- Create: `apps/web/src/app/api/event-definitions/route.ts`
- Create: `apps/web/src/app/api/event-definitions/route.test.ts`
- Create: `apps/web/src/app/api/event-definitions/[id]/route.ts`
- Create: `apps/web/src/app/api/event-definitions/[id]/route.test.ts`
- Create: `apps/web/src/app/api/event-definitions/[id]/acceptance/route.ts`
- Create: `apps/web/src/app/api/event-definitions/[id]/acceptance/route.test.ts`

- [ ] **Step 1: 写事件字典 API 失败测试**

Create `apps/web/src/app/api/event-definitions/route.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createMemoryMetadataStore } from "@/lib/metadata/metadata-store";
import { handleEventDefinitionsGet, handleEventDefinitionsPost } from "./route";

describe("/api/event-definitions", () => {
  it("creates event definitions with required properties for editors", async () => {
    const store = createMemoryMetadataStore();
    const project = await store.createProject({
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      ownerName: "增长产品",
      platforms: ["web"],
    });

    const response = await handleEventDefinitionsPost(
      new Request("http://localhost/api/event-definitions", {
        method: "POST",
        body: JSON.stringify({
          projectId: project.id,
          name: "pay_button_click",
          displayName: "支付按钮点击",
          module: "checkout",
          platforms: ["web"],
          requiredProperties: [{ name: "product_id", type: "string", required: true }],
        }),
      }),
      { store, user: { role: "editor" } },
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: {
        definition: {
          name: "pay_button_click",
          requiredProperties: [{ name: "product_id" }],
        },
      },
    });
  });

  it("lists event definitions for viewers", async () => {
    const response = await handleEventDefinitionsGet({
      store: createMemoryMetadataStore(),
      user: { role: "viewer" },
    });

    expect(response.status).toBe(200);
  });
});
```

- [ ] **Step 2: 运行测试确认 RED**

Run:

```bash
pnpm --filter web test -- src/app/api/event-definitions/route.test.ts
```

Expected: FAIL，因为 route 不存在。

- [ ] **Step 3: 实现事件字典 API handler**

Create `apps/web/src/app/api/event-definitions/route.ts`:

```ts
import { jsonError, jsonOk, mapApiError } from "@/lib/api/http";
import { assertCanWrite, type AuthenticatedUser } from "@/lib/auth/permissions";
import type { MetadataStore } from "@/lib/metadata/metadata-store";

export const runtime = "nodejs";

export async function handleEventDefinitionsGet({
  store,
}: {
  store: MetadataStore;
  user: AuthenticatedUser | null;
}) {
  try {
    return jsonOk(await store.listEventDefinitions());
  } catch (error) {
    return mapApiError(error);
  }
}

export async function handleEventDefinitionsPost(
  request: Request,
  { store, user }: { store: MetadataStore; user: AuthenticatedUser | null },
) {
  try {
    assertCanWrite(user);
    const body = await request.json();

    if (!body.projectId || !body.name || !body.displayName) {
      return jsonError(400, "VALIDATION_ERROR", "项目、事件名和展示名不能为空");
    }

    const definition = await store.createEventDefinition({
      projectId: body.projectId,
      name: body.name,
      displayName: body.displayName,
      description: body.description ?? "",
      triggerTiming: body.triggerTiming ?? "",
      module: body.module ?? "",
      platforms: body.platforms ?? [],
      status: body.status ?? "draft",
      requiredProperties: body.requiredProperties ?? [],
    });

    return jsonOk({ definition }, { status: 201 });
  } catch (error) {
    return mapApiError(error);
  }
}
```

- [ ] **Step 4: 实现更新和验收 handler**

Create `apps/web/src/app/api/event-definitions/[id]/route.test.ts` with tests that `editor` can patch `{ status: "accepted" }` and `viewer` receives `403`. Create `apps/web/src/app/api/event-definitions/[id]/acceptance/route.test.ts` with tests that `editor` can post `{ status: "accepted", note: "样本完整" }` and `viewer` receives `403`.

Extend `MetadataStore` with:

```ts
updateEventDefinition(
  id: string,
  input: Partial<Pick<EventDefinitionRecord, "displayName" | "description" | "triggerTiming" | "module" | "platforms" | "status">> & {
    requiredProperties?: EventPropertyRecord[];
  },
): Promise<EventDefinitionRecord>;

createAcceptanceRecord(
  eventDefinitionId: string,
  input: { actorUserId: string | null; status: "accepted" | "rejected" | "needs_fix"; note: string },
): Promise<{ id: string; eventDefinitionId: string; status: string; note: string }>;
```

Implement memory store updates deterministically: `updateEventDefinition()` replaces only provided fields and required properties; `createAcceptanceRecord()` returns `acceptance_1` and, when status is `accepted`, updates the definition status to `accepted`.

- [ ] **Step 5: 运行治理 API 测试确认 GREEN**

Run:

```bash
pnpm --filter web test -- src/app/api/event-definitions/route.test.ts src/app/api/event-definitions/[id]/route.test.ts src/app/api/event-definitions/[id]/acceptance/route.test.ts src/lib/metadata/metadata-store.test.ts
```

Expected: PASS。

- [ ] **Step 6: 提交治理 API**

Run:

```bash
git add apps/web/src/app/api/event-definitions apps/web/src/lib/metadata/metadata-store.ts apps/web/src/lib/metadata/metadata-store.test.ts
git commit -m "feat: 添加事件字典元数据 API"
```

Expected: commit succeeds。

---

### Task 9: 实现 Postgres 元数据仓储和默认 API 装配

**Files:**
- Create: `apps/web/src/lib/metadata/default-metadata-store.ts`
- Modify: API route files from Tasks 7 and 8

- [ ] **Step 1: 写 SQL 映射测试**

Extend `apps/web/src/lib/metadata/metadata-store.test.ts` with pure row mapping tests:

```ts
import { toProjectRecord, toSdkKeyRecord } from "./default-metadata-store";

it("maps postgres project rows to project records", () => {
  expect(
    toProjectRecord({
      id: "project_1",
      name: "Magic Frame",
      slug: "magic-frame",
      description: "AI 相框分析",
      owner_name: "增长产品",
      platforms: ["web", "flutter"],
      status: "active",
    }),
  ).toEqual({
    id: "project_1",
    name: "Magic Frame",
    slug: "magic-frame",
    description: "AI 相框分析",
    ownerName: "增长产品",
    platforms: ["web", "flutter"],
    status: "active",
  });
});
```

- [ ] **Step 2: 运行测试确认 RED**

Run:

```bash
pnpm --filter web test -- src/lib/metadata/metadata-store.test.ts
```

Expected: FAIL，因为 `default-metadata-store.ts` 不存在。

- [ ] **Step 3: 实现 Postgres 元数据仓储**

Create `apps/web/src/lib/metadata/default-metadata-store.ts` implementing `MetadataStore` with `queryPostgres`. Use focused SQL:

```ts
import type { QueryResultRow } from "pg";
import { queryPostgres } from "./postgres";
import type {
  EventDefinitionRecord,
  MetadataStore,
  ProjectRecord,
  SdkKeyRecord,
} from "./metadata-store";

export function toProjectRecord(row: QueryResultRow): ProjectRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    ownerName: row.owner_name ?? "未分配",
    platforms: row.platforms ?? [],
    status: row.status,
  };
}

export function toSdkKeyRecord(row: QueryResultRow): SdkKeyRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    environment: row.environment,
    source: row.source,
    maskedKey: row.masked_key,
    status: row.status,
    lastUsedAt: row.last_used_at,
  };
}

export const defaultMetadataStore: MetadataStore = {
  async listProjectsOverview() {
    const projects = await queryPostgres(`
      SELECT id, name, slug, description, status, '' AS owner_name, '{}'::text[] AS platforms
      FROM projects
      ORDER BY created_at DESC
    `);
    const environments = await queryPostgres(`
      SELECT project_environments.id, projects.id AS project_id, projects.name AS project_name,
             project_environments.name, project_environments.enabled, NULL AS last_event_at
      FROM project_environments
      JOIN projects ON projects.id = project_environments.project_id
      ORDER BY projects.name, project_environments.name
    `);
    const sdkKeys = await queryPostgres(`
      SELECT sdk_keys.id, projects.id AS project_id, projects.name AS project_name,
             project_environments.name AS environment, sdk_keys.source, sdk_keys.masked_key,
             sdk_keys.status, sdk_keys.last_used_at
      FROM sdk_keys
      JOIN project_environments ON project_environments.id = sdk_keys.project_environment_id
      JOIN projects ON projects.id = project_environments.project_id
      ORDER BY projects.name, project_environments.name, sdk_keys.source
    `);

    return {
      projects: projects.rows.map(toProjectRecord),
      environments: environments.rows.map((row) => ({
        id: row.id,
        projectId: row.project_id,
        projectName: row.project_name,
        name: row.name,
        enabled: row.enabled,
        lastEventAt: row.last_event_at,
      })),
      sdkKeys: sdkKeys.rows.map(toSdkKeyRecord),
    };
  },

  async createProject(input) {
    const result = await queryPostgres(`
      INSERT INTO projects (workspace_id, name, slug, description, status)
      SELECT id, $1, $2, $3, 'active' FROM workspaces ORDER BY created_at ASC LIMIT 1
      RETURNING id, name, slug, description, status, $4::text AS owner_name, $5::text[] AS platforms
    `, [input.name, input.slug, input.description, input.ownerName, input.platforms]);
    return toProjectRecord(result.rows[0]);
  },

  async upsertEnvironment(projectId, input) {
    const result = await queryPostgres(`
      INSERT INTO project_environments (project_id, name, write_key_hash, enabled)
      VALUES ($1, $2, 'managed-in-sdk-keys', $3)
      ON CONFLICT (project_id, name)
      DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now()
      RETURNING id, project_id, name, enabled, NULL AS last_event_at
    `, [projectId, input.name, input.enabled]);
    const project = await queryPostgres(`SELECT name FROM projects WHERE id = $1`, [projectId]);
    return {
      id: result.rows[0].id,
      projectId,
      projectName: project.rows[0]?.name ?? "未知项目",
      name: result.rows[0].name,
      enabled: result.rows[0].enabled,
      lastEventAt: null,
    };
  },

  async createSdkKey(projectId, environment, input) {
    const env = await queryPostgres(`
      SELECT id FROM project_environments WHERE project_id = $1 AND name = $2 LIMIT 1
    `, [projectId, environment]);
    const result = await queryPostgres(`
      INSERT INTO sdk_keys (project_environment_id, source, key_hash, masked_key, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [env.rows[0].id, input.source, input.keyHash, input.maskedKey, input.status]);
    return {
      id: result.rows[0].id,
      projectId,
      projectName: "",
      environment,
      source: input.source,
      maskedKey: input.maskedKey,
      status: input.status,
      lastUsedAt: null,
    };
  },

  async updateSdkKeyStatus(id, status) {
    const result = await queryPostgres(`
      UPDATE sdk_keys SET status = $2, updated_at = now() WHERE id = $1
      RETURNING id, source, masked_key, status, last_used_at
    `, [id, status]);
    return toSdkKeyRecord({ ...result.rows[0], project_id: "", project_name: "", environment: "prod" });
  },

  async listEventDefinitions() {
    const definitions = await queryPostgres(`
      SELECT event_definitions.*, projects.name AS project_name
      FROM event_definitions
      JOIN projects ON projects.id = event_definitions.project_id
      ORDER BY event_definitions.created_at DESC
    `);
    const properties = await queryPostgres(`
      SELECT * FROM event_property_definitions
      ORDER BY required DESC, name ASC
    `);
    return {
      definitions: definitions.rows.map((row) => toEventDefinitionRecord(row, properties.rows)),
    };
  },

  async createEventDefinition(input) {
    const result = await queryPostgres(`
      INSERT INTO event_definitions (project_id, name, display_name, description, trigger_timing, module, platforms, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [input.projectId, input.name, input.displayName, input.description, input.triggerTiming, input.module, input.platforms, input.status]);
    for (const property of input.requiredProperties) {
      await queryPostgres(`
        INSERT INTO event_property_definitions (event_definition_id, name, type, required, description, example_value)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [result.rows[0].id, property.name, property.type, property.required, property.description, JSON.stringify(property.exampleValue)]);
    }
    return (await this.listEventDefinitions()).definitions.find((item) => item.id === result.rows[0].id)!;
  },

  async updateEventDefinition(id, input) {
    await queryPostgres(`
      UPDATE event_definitions
      SET display_name = COALESCE($2, display_name),
          description = COALESCE($3, description),
          trigger_timing = COALESCE($4, trigger_timing),
          module = COALESCE($5, module),
          platforms = COALESCE($6, platforms),
          status = COALESCE($7, status),
          updated_at = now()
      WHERE id = $1
    `, [id, input.displayName, input.description, input.triggerTiming, input.module, input.platforms, input.status]);
    return (await this.listEventDefinitions()).definitions.find((item) => item.id === id)!;
  },

  async createAcceptanceRecord(eventDefinitionId, input) {
    const result = await queryPostgres(`
      INSERT INTO event_acceptance_records (event_definition_id, actor_user_id, status, note)
      VALUES ($1, $2, $3, $4)
      RETURNING id, event_definition_id, status, note
    `, [eventDefinitionId, input.actorUserId, input.status, input.note]);
    if (input.status === "accepted") {
      await queryPostgres(`UPDATE event_definitions SET status = 'accepted', updated_at = now() WHERE id = $1`, [eventDefinitionId]);
    }
    return {
      id: result.rows[0].id,
      eventDefinitionId: result.rows[0].event_definition_id,
      status: result.rows[0].status,
      note: result.rows[0].note,
    };
  },
};
```

Add `toEventDefinitionRecord(row, propertyRows)` next to the other mapper functions. It filters `propertyRows` by `event_definition_id`, maps JSON `example_value` into `exampleValue`, splits required and optional properties, and returns `lastSeenAt: null` until ClickHouse validation joins are implemented.

- [ ] **Step 4: 装配 route exports**

For each API route from Tasks 7 and 8:

- Import `defaultMetadataStore`.
- Import `defaultAuthStore`.
- Parse current user from request cookie using `parseSessionCookie`.
- Call the handler with `store` and `user`.

Keep handler tests unchanged.

- [ ] **Step 5: 运行完整 API 测试**

Run:

```bash
pnpm --filter web test -- src/app/api/auth src/app/api/projects src/app/api/event-definitions src/lib/metadata
```

Expected: PASS。

- [ ] **Step 6: 提交 Postgres 仓储装配**

Run:

```bash
git add apps/web/src/lib/metadata/default-metadata-store.ts apps/web/src/lib/metadata/metadata-store.test.ts apps/web/src/app/api
git commit -m "feat: 接入 Postgres 元数据仓储"
```

Expected: commit succeeds。

---

### Task 10: 接入 `/projects` 页面数据映射

**Files:**
- Create: `apps/web/src/lib/trackinghub/project-api.ts`
- Create: `apps/web/src/lib/trackinghub/project-api.test.ts`
- Modify: `apps/web/src/app/projects/page.tsx`

- [ ] **Step 1: 写 mapper 失败测试**

Create `apps/web/src/lib/trackinghub/project-api.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mapProjectsOverviewToWorkbench } from "./project-api";

describe("project api mapper", () => {
  it("maps metadata projects into existing workbench props", () => {
    const result = mapProjectsOverviewToWorkbench({
      projects: [
        {
          id: "project_1",
          name: "Magic Frame",
          slug: "magic-frame",
          description: "AI 相框分析",
          ownerName: "增长产品",
          platforms: ["web", "flutter"],
          status: "active",
        },
      ],
      environments: [
        {
          id: "env_1",
          projectId: "project_1",
          projectName: "Magic Frame",
          name: "prod",
          enabled: true,
          lastEventAt: null,
        },
      ],
      sdkKeys: [
        {
          id: "key_1",
          projectId: "project_1",
          projectName: "Magic Frame",
          environment: "prod",
          source: "web",
          maskedKey: "write_key_live_****91",
          status: "active",
          lastUsedAt: null,
        },
      ],
    });

    expect(result.projects[0]).toMatchObject({
      name: "Magic Frame",
      slug: "magic-frame",
      platforms: "Web + Flutter",
      status: "运行中",
      owner: "增长产品",
    });
    expect(result.environments[0].writeKeyStatus).toBe("启用");
    expect(result.sdkKeys[0].source).toBe("Web");
  });
});
```

- [ ] **Step 2: 运行测试确认 RED**

Run:

```bash
pnpm --filter web test -- src/lib/trackinghub/project-api.test.ts
```

Expected: FAIL，因为 mapper 不存在。

- [ ] **Step 3: 实现项目 mapper**

Create `apps/web/src/lib/trackinghub/project-api.ts`:

```ts
import type { ProjectsOverview, PlatformSource, SdkKeyStatus } from "@/lib/metadata/metadata-store";

function sourceLabel(source: PlatformSource) {
  return source === "web" ? "Web" : "Flutter";
}

function platformLabel(platforms: PlatformSource[]) {
  if (platforms.length === 0) {
    return "未配置";
  }
  return platforms.map(sourceLabel).join(" + ");
}

function sdkStatusLabel(status: SdkKeyStatus) {
  return status === "active" ? "启用" : status === "rotating" ? "轮换中" : "停用";
}

export function mapProjectsOverviewToWorkbench(overview: ProjectsOverview) {
  return {
    summaryCards: [
      { label: "项目总数", value: String(overview.projects.length), detail: "来自 Postgres 元数据", tone: "blue" as const },
      { label: "生产环境", value: String(overview.environments.filter((item) => item.name === "prod" && item.enabled).length), detail: "已启用 prod 环境", tone: "green" as const },
      { label: "启用 SDK Key", value: String(overview.sdkKeys.filter((item) => item.status === "active").length), detail: "按来源区分 Web / Flutter", tone: "purple" as const },
      { label: "待处理接入", value: String(overview.sdkKeys.filter((item) => item.status !== "active").length), detail: "轮换或停用 Key", tone: "red" as const },
    ],
    projects: overview.projects.map((project) => ({
      name: project.name,
      slug: project.slug,
      description: project.description,
      platforms: platformLabel(project.platforms),
      status: project.status === "active" ? "运行中" : "停用",
      owner: project.ownerName,
      events: "等待事件字典关联",
    })),
    environments: overview.environments.map((environment) => ({
      project: environment.projectName,
      name: environment.name,
      enabled: environment.enabled,
      lastEventAt: environment.lastEventAt ?? "暂无",
      writeKeyStatus: overview.sdkKeys.some((key) => key.projectId === environment.projectId && key.environment === environment.name && key.status === "active") ? "启用" : "停用",
    })),
    sdkKeys: overview.sdkKeys.map((key) => ({
      project: key.projectName,
      environment: key.environment,
      source: sourceLabel(key.source),
      maskedKey: key.maskedKey,
      status: sdkStatusLabel(key.status),
      lastUsed: key.lastUsedAt ?? "暂无",
    })),
  };
}
```

- [ ] **Step 4: 修改 `/projects` 页面**

Modify `apps/web/src/app/projects/page.tsx`:

```tsx
import { AppShell } from "@/components/trackinghub/app-shell";
import { PageHeader } from "@/components/trackinghub/page-header";
import { ProjectManagementWorkbench } from "@/components/trackinghub/project-management-workbench";
import { defaultMetadataStore } from "@/lib/metadata/default-metadata-store";
import { pageShells, projectEnvironmentItems, projectItems, projectSummaryCards, sdkKeyItems } from "@/lib/trackinghub/sample-data";
import { mapProjectsOverviewToWorkbench } from "@/lib/trackinghub/project-api";

export default async function ProjectsPage() {
  let workbench = {
    summaryCards: projectSummaryCards,
    projects: projectItems,
    environments: projectEnvironmentItems,
    sdkKeys: sdkKeyItems,
  };

  try {
    workbench = mapProjectsOverviewToWorkbench(
      await defaultMetadataStore.listProjectsOverview(),
    );
  } catch {
    // Keep the local seed view usable when Postgres is not configured.
  }

  return (
    <AppShell activeHref="/projects">
      <PageHeader
        description={pageShells.projects.description}
        eyebrow={pageShells.projects.eyebrow}
        title={pageShells.projects.title}
      />
      <div className="mt-6">
        <ProjectManagementWorkbench
          environments={workbench.environments}
          projects={workbench.projects}
          sdkKeys={workbench.sdkKeys}
          summaryCards={workbench.summaryCards}
        />
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 5: 运行 mapper 和组件测试**

Run:

```bash
pnpm --filter web test -- src/lib/trackinghub/project-api.test.ts src/components/trackinghub/components.test.tsx
```

Expected: PASS。

- [ ] **Step 6: 提交项目页面接入**

Run:

```bash
git add apps/web/src/lib/trackinghub/project-api.ts apps/web/src/lib/trackinghub/project-api.test.ts apps/web/src/app/projects/page.tsx
git commit -m "feat: 项目页接入元数据仓储"
```

Expected: commit succeeds。

---

### Task 11: 接入 `/governance` 页面数据映射

**Files:**
- Create: `apps/web/src/lib/trackinghub/governance-api.ts`
- Create: `apps/web/src/lib/trackinghub/governance-api.test.ts`
- Modify: `apps/web/src/app/governance/page.tsx`

- [ ] **Step 1: 写治理 mapper 失败测试**

Create `apps/web/src/lib/trackinghub/governance-api.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mapGovernanceOverviewToWorkbench } from "./governance-api";

describe("governance api mapper", () => {
  it("maps metadata event definitions into workbench props", () => {
    const result = mapGovernanceOverviewToWorkbench({
      definitions: [
        {
          id: "event_1",
          projectId: "project_1",
          projectName: "Magic Frame",
          name: "pay_button_click",
          displayName: "支付按钮点击",
          description: "点击支付按钮",
          triggerTiming: "点击支付主按钮",
          module: "checkout",
          platforms: ["web", "flutter"],
          status: "ready",
          requiredProperties: [
            {
              name: "product_id",
              type: "string",
              required: true,
              description: "商品 ID",
              exampleValue: "p_123",
            },
          ],
          optionalProperties: [],
          lastSeenAt: null,
        },
      ],
    });

    expect(result.events[0]).toMatchObject({
      eventName: "pay_button_click",
      project: "Magic Frame",
      platforms: "Web + Flutter",
      status: "待验收",
    });
    expect(result.eventDetail.requiredProperties[0].name).toBe("product_id");
    expect(result.editableDefinitions[0].eventName).toBe("pay_button_click");
  });
});
```

- [ ] **Step 2: 运行测试确认 RED**

Run:

```bash
pnpm --filter web test -- src/lib/trackinghub/governance-api.test.ts
```

Expected: FAIL，因为 mapper 不存在。

- [ ] **Step 3: 实现治理 mapper**

Create `apps/web/src/lib/trackinghub/governance-api.ts`:

```ts
import type { GovernanceOverview, PlatformSource, EventDefinitionStatus } from "@/lib/metadata/metadata-store";

function platformLabel(platforms: PlatformSource[]) {
  return platforms.map((item) => (item === "web" ? "Web" : "Flutter")).join(" + ");
}

function statusLabel(status: EventDefinitionStatus) {
  return status === "accepted"
    ? "已验收"
    : status === "ready"
      ? "待验收"
      : status === "deprecated"
        ? "已弃用"
        : "草稿";
}

function statusTone(status: EventDefinitionStatus) {
  return status === "accepted" ? "success" as const : status === "deprecated" ? "danger" as const : "warning" as const;
}

export function mapGovernanceOverviewToWorkbench(overview: GovernanceOverview) {
  const first = overview.definitions[0];

  return {
    summaryCards: [
      { label: "治理事件", value: String(overview.definitions.length), detail: "来自 Postgres 事件字典", tone: "blue" as const },
      { label: "待验收", value: String(overview.definitions.filter((item) => item.status === "ready").length), detail: "ready 状态事件", tone: "green" as const },
      { label: "Schema 异常", value: "0", detail: "下一阶段接入验证结果", tone: "red" as const },
      { label: "最近接收", value: first?.lastSeenAt ?? "暂无", detail: first?.name ?? "暂无事件", tone: "purple" as const },
    ],
    events: overview.definitions.map((item) => ({
      eventName: item.name,
      displayName: item.displayName,
      project: item.projectName,
      platforms: platformLabel(item.platforms),
      environment: "按环境验证",
      owner: item.module || "未分配",
      status: statusLabel(item.status),
      statusTone: statusTone(item.status),
      lastSeen: item.lastSeenAt ?? "暂无",
    })),
    eventDetail: first
      ? {
          eventName: first.name,
          displayName: first.displayName,
          businessGoal: first.description,
          triggerTiming: first.triggerTiming,
          platforms: first.platforms.map((item) => (item === "web" ? "Web" : "Flutter")),
          requiredProperties: first.requiredProperties.map((property) => ({
            name: property.name,
            type: property.type === "object" || property.type === "array" ? "string" as const : property.type,
            description: property.description,
            example: String(property.exampleValue ?? ""),
          })),
        }
      : {
          eventName: "暂无事件",
          displayName: "暂无事件",
          businessGoal: "创建事件定义后展示业务目标。",
          triggerTiming: "创建事件定义后展示触发时机。",
          platforms: [],
          requiredProperties: [],
        },
    acceptanceChecks: [],
    editableDefinitions: overview.definitions.map((item) => ({
      id: item.id,
      eventName: item.name,
      displayName: item.displayName,
      description: item.description,
      platforms: item.platforms.map((source) => (source === "web" ? "Web" : "Flutter")),
      requiredProperties: item.requiredProperties.map((property) => property.name),
      status: item.status === "accepted" ? "accepted" as const : item.status === "ready" ? "ready" as const : "released" as const,
    })),
  };
}
```

- [ ] **Step 4: 修改 `/governance` 页面**

Modify `apps/web/src/app/governance/page.tsx` to use `defaultMetadataStore.listEventDefinitions()` and `mapGovernanceOverviewToWorkbench()`, with existing sample data fallback when Postgres is not configured.

- [ ] **Step 5: 运行治理 mapper 和组件测试**

Run:

```bash
pnpm --filter web test -- src/lib/trackinghub/governance-api.test.ts src/components/trackinghub/event-dictionary-editor.test.tsx src/components/trackinghub/components.test.tsx
```

Expected: PASS。

- [ ] **Step 6: 提交治理页面接入**

Run:

```bash
git add apps/web/src/lib/trackinghub/governance-api.ts apps/web/src/lib/trackinghub/governance-api.test.ts apps/web/src/app/governance/page.tsx
git commit -m "feat: 治理页接入元数据仓储"
```

Expected: commit succeeds。

---

### Task 12: 更新 Obsidian 任务上下文并做完整验证

**Files:**
- Modify: `/Users/chenqi/Obsidian Vault/TrackingHub/TrackingHub 待办事项.md`

- [ ] **Step 1: 运行完整验证**

Run:

```bash
pnpm run check
```

Expected: PASS，包括 lint、web tests、web build、web-sdk tests、web-sdk build。

- [ ] **Step 2: 检查工作树**

Run:

```bash
git status --short --branch
```

Expected: 只有 Obsidian 任务上下文待更新，或没有未提交代码改动。

- [ ] **Step 3: 更新 Obsidian 任务上下文**

Append a new section to `/Users/chenqi/Obsidian Vault/TrackingHub/TrackingHub 待办事项.md`:

```md
## 当前实施阶段

- [x] 第一阶段设计：本地身份与 Postgres 元数据 API。
- [x] 第一阶段实现：本地登录、角色权限、项目/环境/SDK Key API、事件字典/属性 Schema/验收 API。
- [x] 页面接入：`/projects` 与 `/governance` 优先读取元数据仓储，保留无数据库配置时的 seed 回退。
- [x] 验证：`pnpm run check` 通过。
```

- [ ] **Step 4: 提交 Obsidian 上下文更新**

If the vault is not part of this repo, do not include it in the repo commit. Report it in the final answer as an updated external Obsidian note. If the vault is git-backed, commit it in the vault only if the user has previously asked for vault commits.

- [ ] **Step 5: 最终状态核对**

Run:

```bash
git log --oneline --decorate -8
git status --short --branch
```

Expected: implementation commits are present and repo tree is clean.
