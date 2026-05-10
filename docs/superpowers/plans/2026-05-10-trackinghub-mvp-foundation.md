# TrackingHub MVP Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build the first testable TrackingHub foundation: monorepo scaffold, Next.js admin shell, shared event contract, ingestion validation surface, Postgres schema draft, ClickHouse schema draft, Web SDK package, and Flutter SDK package.

**Architecture:** Use a small pnpm workspace monorepo with `apps/web` as the Next.js full-stack app and `packages/web-sdk` as the browser SDK. Keep database DDL in `db/postgres` and `db/clickhouse` so model decisions are reviewable before migrations are wired to runtime. Keep the Flutter SDK as a standalone Dart package under `packages/flutter-sdk` because Flutter tooling does not participate in the JavaScript workspace.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Vitest, Postgres DDL, ClickHouse DDL, pnpm workspaces, Dart package layout.

---

## Scope

This plan implements the first foundation slice only. It does not complete authentication, production deployment, real database clients, or full analytics templates. Those are separate follow-up plans after the event contract and ingestion skeleton are verified.

## File Structure

- `package.json`: root pnpm scripts for lint, test, build, and SDK checks.
- `pnpm-workspace.yaml`: workspace package globs.
- `.gitignore`: Node, Next.js, coverage, Dart, and local environment ignores.
- `apps/web`: Next.js full-stack app with App Router, Tailwind, dashboard shell, and API route handlers.
- `apps/web/src/app/page.tsx`: first MVP home dashboard using static seed data from the product design.
- `apps/web/src/app/api/events/route.ts`: `POST /api/events` ingestion endpoint that validates the envelope and returns deterministic acceptance errors.
- `apps/web/src/lib/tracking/envelope.ts`: shared server-side envelope schema and validation helpers.
- `apps/web/src/lib/tracking/envelope.test.ts`: Vitest coverage for required fields, source compatibility, timestamp checks, and properties/context object checks.
- `db/postgres/001_metadata_schema.sql`: metadata schema for workspace, project, environment, members, tracking requests, event dictionary, properties, validation results, dashboards, and reports.
- `db/clickhouse/001_raw_events.sql`: raw events table and indexes for event trend/funnel/retention query foundations.
- `packages/web-sdk`: TypeScript browser SDK package with queueing, context defaults, and ingestion call.
- `packages/web-sdk/src/index.test.ts`: SDK request-shape tests using a fake fetch implementation.
- `packages/flutter-sdk`: Dart SDK package with the shared event envelope model and client skeleton.
- `packages/flutter-sdk/test/trackinghub_client_test.dart`: Dart tests for payload serialization.
- `docs/superpowers/plans/2026-05-10-trackinghub-mvp-foundation.md`: this implementation plan.

## Baseline Decisions

- Use pnpm workspaces to keep dependency installs faster and more disk-efficient as the monorepo grows.
- Use `apps/web` rather than a root Next.js app so SDK packages and database artifacts live beside the app without mixing concerns.
- Use App Router route handlers. `POST /api/events` lives at `apps/web/src/app/api/events/route.ts`.
- Store `timestamp` as epoch milliseconds in SDK payloads and convert later in database writers.
- Keep ingestion persistence behind an in-memory stub in this slice. The endpoint validates and returns a generated `event_id`; real ClickHouse writes come in the next plan.
- Use strict runtime validation without adding a schema library in the first slice. If validation grows beyond this envelope, add Zod in a later task.

---

### Task 1: Repository Workspace Scaffold

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`

- [x] **Step 1: Create root workspace manifest**

Write `package.json`:

```json
{
  "name": "trackinghub",
  "private": true,
  "version": "0.1.0",
  "description": "Internal tracking governance and product analytics platform.",
  "packageManager": "pnpm@10.13.1",
  "scripts": {
    "dev": "pnpm --filter web dev",
    "build": "pnpm --filter web build && pnpm --filter @trackinghub/web-sdk build",
    "lint": "pnpm --filter web lint && pnpm --filter @trackinghub/web-sdk lint",
    "test": "pnpm --filter web test && pnpm --filter @trackinghub/web-sdk test",
    "check": "pnpm run lint && pnpm run test && pnpm run build"
  }
}
```

- [x] **Step 2: Create pnpm workspace manifest**

Write `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/web"
  - "packages/web-sdk"
```

- [x] **Step 3: Create repository ignore rules**

Write `.gitignore`:

```gitignore
node_modules/
.next/
out/
dist/
coverage/
.turbo/

.env
.env.*
!.env.example

.DS_Store

packages/flutter-sdk/.dart_tool/
packages/flutter-sdk/build/
packages/flutter-sdk/.packages
packages/flutter-sdk/pubspec.lock
```

- [x] **Step 4: Verify workspace manifest parses**

Run: `pnpm list --depth -1`

Expected: output includes `apps/web` and `packages/web-sdk`.

---

### Task 2: Next.js Web App Scaffold

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/eslint.config.mjs`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/src/app/globals.css`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`

- [x] **Step 1: Generate the app shell**

Run:

```bash
pnpm dlx create-next-app@latest apps/web --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --yes
```

Expected: `apps/web/package.json`, `apps/web/src/app/page.tsx`, and `apps/web/src/app/layout.tsx` exist.

- [x] **Step 2: Add test dependencies to the web app**

Run:

```bash
pnpm --filter web add -D vitest @vitejs/plugin-react jsdom
```

Expected: `apps/web/package.json` contains a `vitest` dev dependency.

- [x] **Step 3: Configure web app scripts**

Set `apps/web/package.json` scripts to:

```json
{
  "dev": "next dev",
  "build": "next build",
  "lint": "eslint",
  "test": "vitest run"
}
```

- [x] **Step 4: Create Vitest config**

Write `apps/web/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
```

- [x] **Step 5: Replace starter home with TrackingHub MVP shell**

`apps/web/src/app/page.tsx` should render navigation labels from the design doc: Home, Projects, Tracking Governance, Analytics, Reports, Settings. It should show cross-project status cards for active projects, today's active users, event volume, anomalies, pending acceptance, and Codex summary.

- [x] **Step 6: Verify web app boots**

Run: `pnpm --filter web lint`

Expected: no lint errors.

---

### Task 3: Shared Event Envelope Validation

**Files:**
- Create: `apps/web/src/lib/tracking/envelope.ts`
- Create: `apps/web/src/lib/tracking/envelope.test.ts`

- [x] **Step 1: Write failing validation tests**

Write tests for:

```ts
import { describe, expect, it } from "vitest";
import { validateTrackingEnvelope } from "./envelope";

const validPayload = {
  project_id: "project_x",
  environment: "prod",
  source: "web",
  event_name: "pay_button_click",
  user_id: "u_123",
  anonymous_id: "anon_123",
  device_id: "device_456",
  session_id: "session_789",
  timestamp: 1710000000000,
  app_version: "1.2.0",
  sdk_version: "0.1.0",
  channel: "google",
  campaign: "spring_sale",
  country: "US",
  properties: {
    product_id: "p_123",
    price: 19.9,
    currency: "USD",
    source_page: "product_detail"
  },
  context: {
    locale: "en-US",
    timezone: "Asia/Shanghai"
  }
};

describe("validateTrackingEnvelope", () => {
  it("accepts a valid Web payload", () => {
    expect(validateTrackingEnvelope(validPayload)).toEqual({
      ok: true,
      value: validPayload
    });
  });

  it("rejects missing required fields", () => {
    const { event_name, ...payload } = validPayload;
    expect(validateTrackingEnvelope(payload)).toEqual({
      ok: false,
      errors: ["event_name is required"]
    });
  });

  it("rejects unsupported sources", () => {
    expect(validateTrackingEnvelope({ ...validPayload, source: "ios" })).toEqual({
      ok: false,
      errors: ["source must be one of web, flutter"]
    });
  });
});
```

- [x] **Step 2: Run tests and verify RED**

Run: `pnpm --filter web test -- src/lib/tracking/envelope.test.ts`

Expected: FAIL because `./envelope` does not exist.

- [x] **Step 3: Implement minimal envelope validator**

Implement exported types and `validateTrackingEnvelope(input: unknown)` returning `{ ok: true, value }` or `{ ok: false, errors }`.

- [x] **Step 4: Run tests and verify GREEN**

Run: `pnpm --filter web test -- src/lib/tracking/envelope.test.ts`

Expected: PASS.

---

### Task 4: Ingestion Route Skeleton

**Files:**
- Create: `apps/web/src/app/api/events/route.ts`
- Create: `apps/web/src/app/api/events/route.test.ts`

- [x] **Step 1: Write failing route tests**

Write tests that call `POST(new Request("http://localhost/api/events", { method: "POST", body: JSON.stringify(payload) }))` and assert:

```ts
expect(response.status).toBe(202);
expect(await response.json()).toMatchObject({
  accepted: true,
  event_name: "pay_button_click"
});
```

For invalid payloads, assert status `400` and `accepted: false`.

- [x] **Step 2: Run tests and verify RED**

Run: `pnpm --filter web test -- src/app/api/events/route.test.ts`

Expected: FAIL because the route does not exist.

- [x] **Step 3: Implement `POST /api/events`**

Use Next.js App Router route handler convention:

```ts
export async function POST(request: Request) {
  const payload = await request.json();
  const result = validateTrackingEnvelope(payload);

  if (!result.ok) {
    return Response.json({ accepted: false, errors: result.errors }, { status: 400 });
  }

  return Response.json(
    {
      accepted: true,
      event_id: crypto.randomUUID(),
      event_name: result.value.event_name,
      received_at: new Date().toISOString()
    },
    { status: 202 }
  );
}
```

- [x] **Step 4: Run tests and verify GREEN**

Run: `pnpm --filter web test -- src/app/api/events/route.test.ts`

Expected: PASS.

---

### Task 5: Database Schema Drafts

**Files:**
- Create: `db/postgres/001_metadata_schema.sql`
- Create: `db/clickhouse/001_raw_events.sql`

- [x] **Step 1: Create Postgres metadata schema**

Write DDL for the design-doc entities with UUID primary keys, `created_at`, `updated_at`, foreign keys, unique project slug per workspace, unique environment name per project, unique event name per project, and JSONB fields for flexible configuration.

- [x] **Step 2: Create ClickHouse raw events schema**

Write a `raw_events` table using `MergeTree`, partitioned by month, ordered by `(project_id, environment, event_name, timestamp)`, with `properties` and `context` as JSON strings for the MVP.

- [x] **Step 3: Verify SQL files are inspectable**

Run: `rg -n "CREATE TABLE|raw_events|event_definitions|tracking_requests" db`

Expected: output includes both Postgres and ClickHouse schemas.

---

### Task 6: Web SDK Skeleton

**Files:**
- Create: `packages/web-sdk/package.json`
- Create: `packages/web-sdk/tsconfig.json`
- Create: `packages/web-sdk/vitest.config.ts`
- Create: `packages/web-sdk/src/index.ts`
- Create: `packages/web-sdk/src/index.test.ts`

- [x] **Step 1: Create SDK package manifest**

Use package name `@trackinghub/web-sdk`, ESM output, TypeScript build script, and Vitest test script.

- [x] **Step 2: Write failing SDK request-shape tests**

Test that `client.track("pay_button_click", { product_id: "p_123" })` sends one JSON request to `/api/events` with source `web`, SDK version `0.1.0`, project/environment config, generated anonymous/session identifiers, properties, and context.

- [x] **Step 3: Run tests and verify RED**

Run: `pnpm --filter @trackinghub/web-sdk test`

Expected: FAIL because `src/index.ts` does not exist.

- [x] **Step 4: Implement minimal browser SDK**

Expose `createTrackingHubClient({ endpoint, projectId, environment, writeKey, fetch })`. The client should provide `track(eventName, properties, options)` and send the shared envelope.

- [x] **Step 5: Run tests and verify GREEN**

Run: `pnpm --filter @trackinghub/web-sdk test`

Expected: PASS.

---

### Task 7: Flutter SDK Skeleton

**Files:**
- Create: `packages/flutter-sdk/pubspec.yaml`
- Create: `packages/flutter-sdk/lib/trackinghub_flutter.dart`
- Create: `packages/flutter-sdk/test/trackinghub_client_test.dart`

- [x] **Step 1: Create Dart package manifest**

Use package name `trackinghub_flutter`, SDK constraint `>=3.3.0 <4.0.0`, and dev dependency `test`.

- [x] **Step 2: Write Dart serialization test**

Assert `TrackingHubEvent(...).toJson()` returns the shared envelope fields with source `flutter`, project/environment config, event name, timestamp, properties, and context.

- [x] **Step 3: Implement minimal Dart model and client skeleton**

Create `TrackingHubConfig`, `TrackingHubEvent`, and `TrackingHubClient.track(...)`. Network transport can remain injectable so tests do not require real HTTP.

- [x] **Step 4: Run Dart tests if Dart is installed**

Run: `cd packages/flutter-sdk && dart test`

Expected: PASS when Dart SDK is available. If `dart` is unavailable, record that verification is blocked by missing local Dart tooling.

---

### Task 8: Full Verification

**Files:**
- Modify only files touched by Tasks 1-7.

- [x] **Step 1: Install dependencies**

Run: `pnpm install`

Expected: `pnpm-lock.yaml` is created and all pnpm workspace packages install.

- [x] **Step 2: Run lint**

Run: `pnpm run lint`

Expected: PASS.

- [x] **Step 3: Run tests**

Run: `pnpm run test`

Expected: PASS for web app and Web SDK.

- [x] **Step 4: Run build**

Run: `pnpm run build`

Expected: PASS for Next.js app and Web SDK.

- [x] **Step 5: Inspect git scope**

Run: `git status --short`

Expected: only plan, scaffold, database, app, and SDK files are changed.

## Follow-Up Plans

- Metadata CRUD and local auth.
- Real ClickHouse writer and validation persistence.
- Project/event dictionary UI flows.
- Analytics templates: overview, event trend, funnel, retention.
- Codex report job runner and report storage.
- Production deployment and environment management.
