-- Preserve legacy interpretations; never infer a completed action or a time zone.
ALTER TABLE episodes
  ALTER COLUMN dir TYPE text USING dir::text,
  ADD CONSTRAINT episodes_dir_check CHECK (dir IN ('toward', 'away', 'mixed', 'unknown')),
  ALTER COLUMN hook_type DROP DEFAULT,
  ALTER COLUMN hook_type DROP NOT NULL,
  ADD COLUMN behavior_status text NOT NULL DEFAULT 'not-described'
    CHECK (behavior_status IN ('acted', 'planned', 'not-described')),
  ADD COLUMN immediate_outcome text NOT NULL DEFAULT '',
  ADD COLUMN later_consequences text NOT NULL DEFAULT '',
  ADD COLUMN consequence_status text NOT NULL DEFAULT 'unknown'
    CHECK (consequence_status IN ('observed', 'expected', 'unknown')),
  ADD COLUMN intended_function text NOT NULL DEFAULT '',
  ADD COLUMN next_experiment text NOT NULL DEFAULT '',
  ADD COLUMN interpretation text NOT NULL DEFAULT '',
  ADD COLUMN schema_version smallint NOT NULL DEFAULT 1 CHECK (schema_version IN (1, 2)),
  ADD COLUMN states text[] NOT NULL DEFAULT '{}',
  ADD COLUMN skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN event_timezone text,
  ADD COLUMN legacy_snapshot jsonb;

DROP TYPE episode_dir;
UPDATE episodes SET states = ARRAY[state], skills = ARRAY[skill];
ALTER TABLE episodes ALTER COLUMN schema_version SET DEFAULT 2;

-- Old scalar selections remain alongside arrays; new unanswered scalars are NULL.
ALTER TABLE episodes
  ALTER COLUMN state DROP NOT NULL,
  ALTER COLUMN skill DROP NOT NULL,
  ADD CONSTRAINT episodes_states_check CHECK (
    states <@ ARRAY['fusion','avoidance','autopilot','selfstory','drift','stuck','unknown','none-noticed','none']::text[]
    AND array_position(states, NULL) IS NULL
    AND (NOT states && ARRAY['unknown','none-noticed','none']::text[] OR cardinality(states) = 1)
  ),
  ADD CONSTRAINT episodes_skills_check CHECK (
    skills <@ ARRAY['notice','defuse','accept','anchor','orient','commit','unknown','no-skill','none']::text[]
    AND array_position(skills, NULL) IS NULL
    AND (NOT skills && ARRAY['unknown','no-skill','none']::text[] OR cardinality(skills) = 1)
  ),
  ADD CONSTRAINT episodes_action_check CHECK (behavior_status <> 'acted' OR length(btrim(move)) > 0),
  ADD CONSTRAINT episodes_content_check CHECK (
    schema_version = 1 OR length(btrim(situation)) > 0 OR length(btrim(hook)) > 0 OR length(btrim(move)) > 0
  );

-- Existing policies remain in force through ALTER TABLE; no replacement policy.
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes FORCE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'act_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON episodes TO act_app;
  END IF;
END
$$;
