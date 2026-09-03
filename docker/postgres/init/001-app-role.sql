-- POSTGRES_USER creates the migration/administration role. Next.js must never
-- connect as that role because PostgreSQL superusers bypass RLS.
CREATE ROLE act_app
  LOGIN
  PASSWORD 'act_app_local_password'
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOREPLICATION
  NOBYPASSRLS;

GRANT CONNECT ON DATABASE act TO act_app;
GRANT USAGE ON SCHEMA public TO act_app;
