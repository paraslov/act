-- Personal values: the user's own value statements, grouped into the four life
-- domains. Values are descriptions of how someone wants to act, so nothing here
-- is ever scored, ranked or completed — there is no counter, streak or status
-- column, and `domains` is a plain set with no ordering meaning.
--
-- Archival is the only way a value leaves circulation (`archived_at`); values are
-- never deleted, because morning entries and episodes may reference them.

CREATE TABLE personal_values (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       text NOT NULL CHECK (length(btrim(title)) > 0),
  domains     text[] NOT NULL CHECK (cardinality(domains) >= 1),  -- domain ids
  meaning     text NOT NULL DEFAULT '',
  examples    text[] NOT NULL DEFAULT '{}',
  archived_at timestamptz,  -- NULL = active; archived values stay readable
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX personal_values_user_idx ON personal_values(user_id, archived_at);

-- A linked value is stored twice on purpose: `value_id` is the live link (used to
-- suggest a value and to show where else it appears), and `value_snapshot` freezes
-- the title/meaning/domains as they read at attach time, so editing or archiving a
-- value never rewrites history. Historical surfaces render from the snapshot.
--
-- `value_id` carries no foreign key: a plain FK proves the row exists but not that
-- it belongs to the same user, and it would block archival semantics. Ownership and
-- active status are validated in-app when the snapshot is resolved.
ALTER TABLE episodes
  ADD COLUMN value_id uuid,
  ADD COLUMN value_snapshot jsonb;

-- day_entries needs no DDL change: valueId/valueSnapshot live inside the existing
-- `morning` jsonb, which is merged key-wise on write.

-- Per-user Row-Level Security (same pattern as episodes in 0003_act_tables.sql).
ALTER TABLE personal_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_values FORCE ROW LEVEL SECURITY;

CREATE POLICY personal_values_by_user_id
  ON personal_values
  FOR ALL
  TO PUBLIC
  USING (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  )
  WITH CHECK (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  );

-- The app connects as the un-privileged act_app role, which has no rights on new
-- tables by default. Guarded so the migration still applies without the role.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'act_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON personal_values TO act_app;
  END IF;
END
$$;
