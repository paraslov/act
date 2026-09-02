CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  failed_login_count integer NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_is_normalized CHECK (email = lower(email))
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);

-- Starter table showing the required pattern for every user-owned ACT table.
CREATE TABLE user_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings FORCE ROW LEVEL SECURITY;

CREATE POLICY user_settings_by_user_id
  ON user_settings
  FOR ALL
  TO PUBLIC
  USING (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  )
  WITH CHECK (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  );
