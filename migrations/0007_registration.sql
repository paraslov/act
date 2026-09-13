-- Invite-gated self-service registration.
--
-- The runtime role act_app is intentionally NOT allowed to INSERT into users
-- (see 0002_security_hardening.sql): a compromised runtime must not be able to
-- mint accounts. Registration therefore does not run a raw INSERT from the app.
-- Instead the app calls register_user(), a SECURITY DEFINER function owned by
-- the migration/admin role (the role running this file). The function runs with
-- the owner's privileges, so it may insert into users, while act_app receives
-- only EXECUTE. The function refuses unless a valid invite is presented, and it
-- validates + consumes the invite and inserts the account in one transaction.
--
-- This preserves the property that the runtime can only create an account the
-- way we intended -- against a live invite -- and never arbitrarily.

-- Invite codes. Like sessions and login_throttle, this is a pre-authentication
-- table: it must be read before any user exists, so it uses explicit grants
-- rather than per-user RLS. Only the code HASH is stored (sha256 hex, 64 chars,
-- same convention as login_throttle.key_hash), so a database leak never exposes
-- a usable code. The plaintext is shown once at creation time and never again.
CREATE TABLE invite_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash   text NOT NULL UNIQUE CHECK (length(code_hash) = 64),
  email       text CHECK (email IS NULL OR email = lower(email)),  -- NULL = usable by any email
  max_uses    integer NOT NULL DEFAULT 1 CHECK (max_uses >= 1),
  used_count  integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  expires_at  timestamptz,                                         -- NULL = no expiry
  note        text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at  timestamptz                                          -- NULL = active
);

-- The app's cheap pre-check (used to reject a bad code before running the
-- expensive password hash) looks a code up by its hash.
CREATE INDEX invite_codes_code_hash_idx ON invite_codes(code_hash);

-- register_user: the ONLY path by which act_app can cause a row in users.
--
-- SECURITY DEFINER  -> runs as the owner (this migration's admin role), which
--                      owns users and may insert into it.
-- SET search_path   -> pins name resolution so a caller cannot pre-create an
--                      object (e.g. in pg_temp) that shadows something the body
--                      references and thereby hijack the elevated privileges.
--                      pg_temp is listed last so it can never shadow public.
--
-- Returns the new user id on success, or a stable error tag the server action
-- maps to a message. The error tags are deliberately coarse ('invalidInvite'
-- covers missing / revoked / expired / exhausted / email-mismatch) so the
-- response cannot tell an attacker WHY a code failed.
CREATE OR REPLACE FUNCTION register_user(
  p_email         text,
  p_password_hash text,
  p_code_hash     text
)
RETURNS TABLE (user_id uuid, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invite invite_codes%ROWTYPE;
  v_user_id uuid;
BEGIN
  -- Lock the invite row for the duration of the transaction so two concurrent
  -- sign-ups cannot both consume the last use of a single-use code.
  SELECT * INTO v_invite
    FROM invite_codes
   WHERE code_hash = p_code_hash
   FOR UPDATE;

  IF NOT FOUND
     OR v_invite.revoked_at IS NOT NULL
     OR (v_invite.expires_at IS NOT NULL AND v_invite.expires_at <= now())
     OR v_invite.used_count >= v_invite.max_uses
     OR (v_invite.email IS NOT NULL AND v_invite.email <> lower(p_email)) THEN
    RETURN QUERY SELECT NULL::uuid, 'invalidInvite';
    RETURN;
  END IF;

  -- A plain INSERT, never ON CONFLICT DO UPDATE. Reactivating or overwriting an
  -- existing account here would be an account-takeover vector: anyone holding an
  -- invite could re-register someone else's email and set a new password. An
  -- existing email is simply reported as taken, and the invite is NOT consumed.
  BEGIN
    INSERT INTO users (email, password_hash)
      VALUES (lower(p_email), p_password_hash)
      RETURNING id INTO v_user_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT NULL::uuid, 'emailTaken';
    RETURN;
  END;

  UPDATE invite_codes
     SET used_count = used_count + 1
   WHERE id = v_invite.id;

  RETURN QUERY SELECT v_user_id, NULL::text;
END;
$$;

-- CREATE FUNCTION grants EXECUTE to PUBLIC by default. Revoke that first so the
-- privileged path is not open to every role, then grant it narrowly below.
REVOKE ALL ON FUNCTION register_user(text, text, text) FROM PUBLIC;

-- The app connects as the un-privileged act_app role. Grant it EXECUTE on the
-- function and SELECT on invite_codes (for the pre-hash cheap check) -- and
-- nothing else. In particular act_app still has NO INSERT on users: the
-- SECURITY DEFINER function is the entire bridge. Guarded so the migration
-- still applies in environments without the role (same pattern as 0002-0006).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'act_app') THEN
    GRANT SELECT (id, code_hash, email, max_uses, used_count, expires_at, revoked_at)
      ON invite_codes TO act_app;
    GRANT EXECUTE ON FUNCTION register_user(text, text, text) TO act_app;
  END IF;
END
$$;
