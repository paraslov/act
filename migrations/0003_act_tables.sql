-- ACT core tables: episodes (one logged moment) and day_entries (morning/evening).
-- Everything in Journal and Progress is derived from episodes at read time; there are
-- no aggregate or counter tables. Reference data (status effects, skills, axes, loop
-- steps, vault cards) stays in TypeScript constants, not the database.

CREATE TYPE episode_dir AS ENUM ('toward', 'away');
CREATE TYPE hook_type AS ENUM ('thought', 'feeling', 'urge', 'memory');

CREATE TABLE episodes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day         date NOT NULL,
  band        smallint NOT NULL CHECK (band BETWEEN 0 AND 7),  -- index into the 8 bands
  dir         episode_dir NOT NULL,
  weight      smallint NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 3),
  hook        text NOT NULL,
  hook_type   hook_type NOT NULL DEFAULT 'thought',
  situation   text NOT NULL DEFAULT '',
  state       text NOT NULL,   -- status-effect id
  skill       text NOT NULL,
  value       text NOT NULL DEFAULT '',
  move        text NOT NULL DEFAULT '',
  workable    text NOT NULL DEFAULT '',
  checks      jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {awareness,openness,choice,values,action}: 0..2
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX episodes_user_day_idx ON episodes(user_id, day DESC);

CREATE TABLE day_entries (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day        date NOT NULL,
  morning    jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {open,aware,engaged,toward}
  evening    jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {hook,away,flex,next}
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

-- Per-user Row-Level Security (same pattern as user_settings in 0001_initial.sql).
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes FORCE ROW LEVEL SECURITY;

CREATE POLICY episodes_by_user_id
  ON episodes
  FOR ALL
  TO PUBLIC
  USING (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  )
  WITH CHECK (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  );

ALTER TABLE day_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_entries FORCE ROW LEVEL SECURITY;

CREATE POLICY day_entries_by_user_id
  ON day_entries
  FOR ALL
  TO PUBLIC
  USING (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  )
  WITH CHECK (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  );

-- The app connects as the un-privileged act_app role, which has no rights on new
-- tables by default. Without these GRANTs every query fails even though RLS is
-- correct. Guarded so the migration still applies in environments without the role.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'act_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON episodes TO act_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON day_entries TO act_app;
  END IF;
END
$$;
