-- A10: experience types gain "bodily sensation" and "other / several". Following
-- the 0005 decision (enums → text + CHECK, matching state/skill/dir), hook_type
-- stops being a Postgres enum so new values need no ALTER TYPE dance.
ALTER TABLE episodes
  ALTER COLUMN hook_type TYPE text USING hook_type::text,
  ADD CONSTRAINT episodes_hook_type_check CHECK (
    hook_type IN ('thought', 'feeling', 'urge', 'memory', 'sensation', 'other')
  );

DROP TYPE hook_type;

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
