# TrackingHub MVP Product Design

## Positioning

TrackingHub is an internal multi-project tracking governance and product analytics platform.

It is not only a Firebase Analytics replacement. Its core purpose is to connect product, operations, and engineering around one trusted workflow:

```text
tracking request
-> event definition
-> Web / Flutter SDK integration
-> event ingestion
-> schema validation
-> acceptance
-> product analytics
-> Codex-generated reports
```

The first version serves internal product and operations analysis needs across multiple current and future Web and Flutter products.

## Goals

- Support multiple internal products from day one.
- Let product and operations define tracking needs in a structured event dictionary.
- Let engineering integrate Web and Flutter events using consistent SDK contracts.
- Validate real incoming events against expected schema.
- Provide product and operations dashboards for growth, feature usage, conversion, activity, and retention analysis.
- Use Codex CLI to generate periodic reports, anomaly explanations, and analysis summaries.

## Non-Goals For MVP

- Public commercial multi-tenant SaaS.
- Drag-and-drop BI builder.
- Complex approval workflow.
- Advanced attribution modeling.
- Complex enterprise permission hierarchy.
- Replacing all warehouse, BI, or data science workflows.

## Users

### Product

Product users create tracking requests, define business meaning, inspect funnels, compare versions, and review feature usage.

### Operations

Operations users analyze channels, campaigns, content/activity performance, retention, and conversion.

### Engineering

Engineering users view event definitions, integrate SDK calls, inspect validation failures, and complete tracking acceptance.

### Admin

Admins manage projects, members, SDK keys, environments, and data retention settings.

### Read-Only Viewer

Viewers can inspect dashboards, reports, and event definitions without changing configuration.

## Product Shape

TrackingHub uses a SaaS-style admin shell to manage governance objects, with analytics workbench pages as the most important daily workflow.

Main navigation:

```text
Home
Projects
Tracking Governance
Analytics
Reports
Settings
```

## MVP Pages

### Home

Shows cross-project status:

- Active projects
- Today's active users and event volume
- Data anomalies
- Pending tracking acceptance
- Codex analysis summary

### Projects

Manages internal product projects:

- Project list
- Project detail
- Web / Flutter source configuration
- dev / staging / prod environments
- SDK keys

### Tracking Requests

Tracks product and operations requests before implementation:

- Request title
- Business goal
- Related project
- Related module
- Target platforms: Web, Flutter, or both
- Owner
- Status: draft, ready for development, in development, released, accepted, deprecated
- Linked event definitions

### Event Dictionary

Defines governed events:

- Event name
- Display name
- Description
- Trigger timing
- Project
- Module
- Platforms
- Environment availability
- Required properties
- Optional properties
- Example payload
- Related dashboards, funnels, and reports

### Event Schema

Defines property-level contracts:

- Property name
- Data type
- Required or optional
- Description
- Allowed values when applicable
- Example value
- Platform compatibility notes

### Event Acceptance

Validates production or staging event data:

- Has the event been received?
- Are required fields present?
- Do property types match schema?
- Are Web and Flutter payloads consistent?
- Which app versions are reporting?
- When was the last valid event received?
- What validation errors happened recently?

### Analytics Overview

Project-level product and operations dashboard:

- New users
- Active users
- Sessions
- Core event volume
- Conversion rate
- Revenue or order events when available
- Retention snapshot
- Top channels
- Top campaigns or activities
- Codex daily interpretation

### Event Analysis

Lets product and operations analyze event trends:

- Event count
- Unique users
- Sessions
- Time grouping: minute, hour, day
- Filters: platform, environment, version, channel, campaign, country, user segment
- Breakdown by selected property

### Funnel Analysis

Supports fixed funnel configuration:

- Select ordered events
- Filter by project, platform, environment, channel, campaign, version
- Show step conversion, drop-off, and time-to-convert

### Retention Analysis

Supports common product retention views:

- D1, D3, D7 retention
- Cohort by first seen date
- Breakdowns by channel, campaign, platform, version, and first-day behavior

### Activity / Content / Commercial Analysis

MVP keeps these focused and template-driven:

- Campaign exposure -> click -> conversion
- Content view -> engagement -> conversion
- Product view -> checkout -> pay success
- Subscription or order event trends when relevant

### Reports

Stores generated reports:

- Daily report
- Weekly report
- Anomaly explanation
- Version comparison
- Campaign comparison
- Funnel drop-off explanation

Codex CLI can generate these from ClickHouse query results and metadata.

## Data Model

### Workspace

Represents the internal team or organization.

Fields:

- id
- name
- created_at
- updated_at

### Project

Represents one Web/App product.

Fields:

- id
- workspace_id
- name
- slug
- description
- status
- created_at
- updated_at

### Project Environment

Represents dev, staging, or prod.

Fields:

- id
- project_id
- name
- write_key_hash
- enabled
- created_at
- updated_at

### Member

Represents a platform user.

Fields:

- id
- workspace_id
- name
- email
- role
- created_at
- updated_at

### Project Member

Represents project-level access.

Fields:

- id
- project_id
- member_id
- role
- created_at
- updated_at

### Tracking Request

Represents a product or operations tracking need.

Fields:

- id
- project_id
- title
- business_goal
- module
- owner_id
- status
- platforms
- created_at
- updated_at

### Event Definition

Represents a governed event.

Fields:

- id
- project_id
- tracking_request_id
- name
- display_name
- description
- trigger_timing
- module
- platforms
- status
- created_at
- updated_at

### Event Property Definition

Represents one event property schema item.

Fields:

- id
- event_definition_id
- name
- type
- required
- description
- allowed_values
- example_value
- created_at
- updated_at

### Raw Event

Stored in ClickHouse.

Fields:

- event_id
- project_id
- environment
- source
- event_name
- user_id
- anonymous_id
- device_id
- session_id
- timestamp
- received_at
- app_version
- sdk_version
- channel
- campaign
- country
- properties
- context

### Event Validation Result

Can be stored in Postgres for workflow visibility and optionally in ClickHouse for analysis.

Fields:

- id
- project_id
- event_definition_id
- event_name
- environment
- source
- status
- errors
- sample_event_id
- observed_at

### Dashboard

Represents saved project dashboards.

Fields:

- id
- project_id
- name
- type
- config
- created_by
- created_at
- updated_at

### Report

Represents Codex-generated analysis output.

Fields:

- id
- project_id
- type
- title
- content
- source_query_refs
- generated_by
- generated_at

## Event Payload Contract

Web and Flutter SDKs should send a consistent envelope:

```json
{
  "project_id": "project_x",
  "environment": "prod",
  "source": "web",
  "event_name": "pay_button_click",
  "user_id": "u_123",
  "anonymous_id": "anon_123",
  "device_id": "device_456",
  "session_id": "session_789",
  "timestamp": 1710000000000,
  "app_version": "1.2.0",
  "sdk_version": "0.1.0",
  "channel": "google",
  "campaign": "spring_sale",
  "properties": {
    "product_id": "p_123",
    "price": 19.9,
    "currency": "USD",
    "source_page": "product_detail"
  },
  "context": {
    "locale": "en-US",
    "timezone": "Asia/Shanghai"
  }
}
```

## Architecture

MVP architecture:

```text
Next.js full-stack app
  -> admin and analytics UI
  -> metadata APIs
  -> ingestion endpoint
  -> report task entrypoints

Postgres
  -> projects, members, tracking requests, event dictionary, schema, dashboards, reports

ClickHouse
  -> raw events, analytical queries, funnels, retention, aggregations

Web SDK
  -> TypeScript package for browser apps

Flutter SDK
  -> Dart package for Flutter apps

Codex CLI
  -> scheduled analysis tasks
  -> anomaly explanation
  -> daily and weekly reports
```

The ingestion endpoint can start inside the Next.js app. It should be designed so it can later move to a dedicated ingestion service with a queue.

## Validation Flow

1. Product or operations creates a tracking request.
2. Event definitions and property schema are added.
3. Engineering integrates Web or Flutter SDK events.
4. SDK sends events to ingestion API.
5. Ingestion writes raw events to ClickHouse.
6. Validation job compares observed payloads against event schema.
7. Tracking request shows validation status.
8. Product or operations accepts the tracking request.
9. Accepted events become available in analytics templates.

## Analytics Scope

MVP analytics should be template-driven, not free-form BI.

Required templates:

- Overview dashboard
- Event trend
- Funnel
- Retention
- Campaign / activity performance
- Commercial conversion

## Codex CLI Scope

Codex CLI should not sit in the hot ingestion path.

It should run asynchronous analysis jobs:

- Daily product operations report
- Weekly product summary
- Anomaly explanation
- Funnel drop-off interpretation
- Version comparison
- Campaign comparison
- Event schema quality report

Each job should receive structured query outputs and project metadata, then produce a report saved back to the platform.

## Technology Choice

Initial stack:

- Next.js full-stack app
- TypeScript
- Postgres for metadata
- ClickHouse for events and analytics
- TypeScript Web SDK
- Dart Flutter SDK
- Codex CLI for report generation

Queue is deferred until event volume or reliability requires it.

Future queue candidates:

- Redpanda
- Kafka
- NATS

## MVP Success Criteria

- A new project can be created.
- Web and Flutter SDK keys can be configured.
- Product or operations can create a tracking request and event definition.
- Web and Flutter can send events using the shared payload contract.
- Raw events are visible within seconds.
- Schema validation can show whether the event is acceptable.
- Accepted events can be used in overview, event trend, funnel, and retention pages.
- Codex CLI can generate at least one daily project report from real query results.

## Risks

### Event Naming Drift

Mitigation: enforce event dictionary and naming rules before events become accepted.

### Inconsistent Web And Flutter Payloads

Mitigation: shared event contract, platform compatibility flags, and acceptance checks.

### Product Scope Creep

Mitigation: use template analytics first and defer free-form BI.

### Slow Analytical Queries

Mitigation: ClickHouse-first event storage and later materialized views for high-traffic dashboards.

### Codex Hallucinated Analysis

Mitigation: pass structured query results, cite metric values, and store source query references with every report.

## Open Decisions

- Final product name.
- Whether the UI uses a custom component system or a library such as shadcn/ui.
- Whether auth starts with local email login, OAuth, or an existing internal identity provider.
- Initial deployment target.
- Expected daily event volume for sizing ClickHouse tables.
