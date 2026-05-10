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
