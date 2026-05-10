-- Local development bootstrap.
-- Apply this after 001_metadata_schema.sql when a fresh database needs an initial
-- workspace and admin account. Replace this user before using a shared database.

WITH existing_workspace AS (
  SELECT id
    FROM workspaces
   ORDER BY created_at ASC
   LIMIT 1
),
created_workspace AS (
  INSERT INTO workspaces (name)
  SELECT 'TrackingHub Local'
   WHERE NOT EXISTS (SELECT 1 FROM existing_workspace)
  RETURNING id
),
target_workspace AS (
  SELECT id FROM existing_workspace
  UNION ALL
  SELECT id FROM created_workspace
  LIMIT 1
)
INSERT INTO users (workspace_id, name, email, role, password_hash, enabled)
SELECT id,
       '本地管理员',
       'admin@example.com',
       'admin',
       '$2b$10$nw4ERjcG7mBTMAN61MeEK.IS6MXzzzAtTEq64Qy/40MxzNTdenRju',
       true
  FROM target_workspace
ON CONFLICT (workspace_id, email)
DO UPDATE SET
  role = 'admin',
  enabled = true,
  updated_at = now();
