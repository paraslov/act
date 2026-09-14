-- Admin role + admin-only invite management.
--
-- Registration (0007) is self-service and needs no admin. This migration adds
-- the operator surface: an is_admin flag on users, and two SECURITY DEFINER
-- functions that let an admin create and revoke invite codes. As with
-- register_user, the runtime role act_app never gets raw write access to
-- invite_codes -- it only gets EXECUTE on functions that first verify the
-- caller is an active admin. Listing needs no function: act_app already has
-- SELECT on invite_codes from 0007 (this migration completes the columns).

ALTER TABLE users
  ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

-- admin_create_invite: stores a pre-hashed code on behalf of an admin. The
-- plaintext is generated in the app and shown once; only its sha256 arrives
-- here. p_admin_id is the authenticated session user; the function refuses
-- unless that user is an active admin, so act_app cannot write invite_codes
-- without naming a real admin.
CREATE OR REPLACE FUNCTION admin_create_invite(
  p_admin_id     uuid,
  p_code_hash    text,
  p_email        text,
  p_max_uses     integer,
  p_expires_days integer,
  p_note         text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users
     WHERE id = p_admin_id AND is_admin AND is_active
  ) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = 'insufficient_privilege';
  END IF;

  INSERT INTO invite_codes (code_hash, email, max_uses, expires_at, note)
    VALUES (
      p_code_hash,
      CASE WHEN p_email IS NULL THEN NULL ELSE lower(p_email) END,
      p_max_uses,
      CASE WHEN p_expires_days IS NULL THEN NULL
           ELSE now() + make_interval(days => p_expires_days) END,
      COALESCE(p_note, '')
    )
    RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- admin_revoke_invite: marks an invite revoked. Returns true when a row moved
-- from active to revoked, false otherwise (already revoked, or unknown id).
CREATE OR REPLACE FUNCTION admin_revoke_invite(
  p_admin_id  uuid,
  p_invite_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users
     WHERE id = p_admin_id AND is_admin AND is_active
  ) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = 'insufficient_privilege';
  END IF;

  UPDATE invite_codes
     SET revoked_at = now()
   WHERE id = p_invite_id
     AND revoked_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION admin_create_invite(uuid, text, text, integer, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_revoke_invite(uuid, uuid) FROM PUBLIC;

-- act_app: read is_admin (to gate the UI + session), read the remaining
-- invite_codes columns needed for the admin list, and execute the two admin
-- functions. Still no direct INSERT/UPDATE/DELETE on users or invite_codes.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'act_app') THEN
    GRANT SELECT (is_admin) ON users TO act_app;
    GRANT SELECT (note, created_at) ON invite_codes TO act_app;
    GRANT EXECUTE ON FUNCTION admin_create_invite(uuid, text, text, integer, integer, text) TO act_app;
    GRANT EXECUTE ON FUNCTION admin_revoke_invite(uuid, uuid) TO act_app;
  END IF;
END
$$;
