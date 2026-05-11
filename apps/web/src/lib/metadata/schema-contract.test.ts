import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(
  path.resolve(process.cwd(), "../../db/postgres/001_metadata_schema.sql"),
  "utf8",
);
const validationResultIdMigration = readFileSync(
  path.resolve(
    process.cwd(),
    "../../db/postgres/003_event_validation_result_text_ids.sql",
  ),
  "utf8",
);
const magicFrameEnvironmentMigration = readFileSync(
  path.resolve(
    process.cwd(),
    "../../db/postgres/004_magic_frame_environment_names.sql",
  ),
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
    expect(schema).toContain(
      "name TEXT NOT NULL CHECK (name IN ('dev', 'staging', 'prod', 'test', 'develop', 'production'))",
    );
  });

  it("supports governance acceptance and ready event definitions", () => {
    expect(schema).toContain("CREATE TABLE event_acceptance_records");
    expect(schema).toContain("status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'released', 'accepted', 'deprecated'))");
    expect(schema).toContain("id TEXT PRIMARY KEY");
  });

  it("documents the validation result id migration for existing databases", () => {
    expect(validationResultIdMigration).toContain(
      "ALTER TABLE event_validation_results",
    );
    expect(validationResultIdMigration).toContain(
      "ALTER COLUMN id TYPE TEXT USING id::text",
    );
  });

  it("documents the Magic Frame App environment migration for existing databases", () => {
    expect(magicFrameEnvironmentMigration).toContain(
      "project_environments_name_check",
    );
    expect(magicFrameEnvironmentMigration).toContain(
      "event_validation_results_environment_check",
    );
    expect(magicFrameEnvironmentMigration).toContain(
      "'test', 'develop', 'production'",
    );
  });

  it("stores reports with source query references", () => {
    expect(schema).toContain("CREATE TABLE reports");
    expect(schema).toContain("source_query_refs JSONB NOT NULL DEFAULT '[]'::jsonb");
    expect(schema).toContain("CREATE INDEX idx_reports_project_generated");
  });
});
