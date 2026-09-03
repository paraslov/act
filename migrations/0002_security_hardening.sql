-- Remove the account-wide lock. It can be triggered anonymously and used to
-- deny service to a known user. Throttling is now source-aware and time-bound.
ALTER TABLE users DROP COLUMN IF EXISTS failed_login_count;
ALTER TABLE users DROP COLUMN IF EXISTS locked_until;

CREATE TABLE login_throttle (
  key_hash text PRIMARY KEY CHECK (length(key_hash) = 64),
  scope text NOT NULL CHECK (scope IN ('account', 'source', 'pair')),
  failure_count integer NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX login_throttle_updated_at_idx ON login_throttle(updated_at);

-- The authentication tables intentionally do not use per-user RLS because
-- they must be queried before a user is authenticated. Instead, the runtime
-- role receives only the operations used by the application. It cannot create
-- accounts, change password hashes, change activation state, or run migrations.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'act_app') THEN
    REVOKE ALL ON TABLE users FROM act_app;
    REVOKE ALL ON TABLE sessions FROM act_app;
    REVOKE ALL ON TABLE user_settings FROM act_app;
    REVOKE ALL ON TABLE login_throttle FROM act_app;
    REVOKE ALL ON TABLE schema_migrations FROM act_app;

    GRANT SELECT (id, email, password_hash, is_active) ON users TO act_app;
    GRANT UPDATE (last_login_at, updated_at) ON users TO act_app;
    GRANT SELECT, INSERT, DELETE ON sessions TO act_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON user_settings TO act_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON login_throttle TO act_app;
  END IF;
END
$$;
