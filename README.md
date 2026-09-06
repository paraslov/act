# ACT

Minimal private ACT application starter.

## Stack

- Next.js 16 (App Router)
- PostgreSQL (Vercel Postgres/Neon compatible)
- Email/password accounts with opaque database sessions
- No public registration
- Direct server-side Next.js → PostgreSQL access
- PostgreSQL row-level security for user-owned data

## Local setup

The checked-in `.env.example` and ignored `.env.local` use an ACT-only local
PostgreSQL container on port `5434`. This lets it run alongside the Jira admin
container, which uses port `5433`. PostgreSQL is published only on
`127.0.0.1`.

Local PostgreSQL has two distinct roles:

- `act_admin` owns the schema and is used only by CLI migrations and account
  provisioning through `DATABASE_ADMIN_URL`;
- `act_app` is a `NOSUPERUSER`/`NOBYPASSRLS` runtime role used by Next.js
  through `DATABASE_URL`.

The application also checks the connected role on first database use and fails
closed if `DATABASE_URL` points to a superuser or `BYPASSRLS` role.

1. Install dependencies with `pnpm install`.
2. Start PostgreSQL with `pnpm db:up`.
3. Apply the schema with `pnpm db:migrate`.
4. Create the first account with `pnpm db:create-user user@example.com`.
5. Start Next.js with `pnpm dev`.

Use `pnpm db:logs` to follow PostgreSQL logs and `pnpm db:down` to stop the
container. `db:down` preserves the `postgres_data` volume and its data.

`db:create-user` also resets the password and reactivates an existing account
with the same normalized email. Account creation and password reset happen in
one transaction, and a reset revokes every existing session for that account.
There is intentionally no signup page or signup API. Because the app does not
yet use MFA, provisioned passwords must contain at least 15 characters.

## Languages

Choose English or Русский from the language selector on the sign-in screen or
in the sidebar. Signed-in preferences are saved to your account and mirrored in
a cookie; guests use the cookie. English is the default. Russian covers the main
interface and reference content, with ACT terms such as Toward/Away retained.

Message catalogs live in `src/i18n/messages`. Missing translations fall back to
English; dates and plural forms follow the selected language. User-written notes
and the IDs stored in PostgreSQL are unchanged by language selection.

## Authentication abuse protection

Failed sign-ins are tracked in PostgreSQL so throttling is shared by every
Vercel instance. A noisy source is temporarily blocked across accounts, while
an account/source pair gets progressive backoff. Account-wide counts are used
only for security logs and never lock the user out from another source.

`AUTH_THROTTLE_SECRET` HMACs emails and source addresses before they are stored.
Use a unique random value of at least 32 characters in production. Vercel's
trusted forwarded-IP header is used automatically. For another production
reverse proxy, set `AUTH_TRUST_PROXY_HEADERS=true` only if that proxy overwrites
untrusted forwarded headers. Configure a Vercel Firewall rate-limit rule for
the login endpoint as an additional edge-level control.

## RLS contract

The `user_settings` table is the starter pattern for user-owned data:

- include a non-null `user_id` foreign key;
- enable and force RLS;
- compare `user_id` with `app.current_user_id` in both `USING` and `WITH CHECK`;
- access the table only inside `withCurrentUserDb(callback)` so the identity is
  read from the verified session, remains transaction-local, and cannot leak
  through the connection pool.

The `users`, `sessions`, and `login_throttle` tables are authentication
infrastructure. They are queried only from server-only modules and are not
exposed through a browser DB client. The runtime role has narrowly scoped table
and column grants and cannot create users, change passwords, reactivate users,
or read migration metadata.

## Production database roles

Create a dedicated `act_app` login role in the production PostgreSQL database
before running migrations:

```sql
CREATE ROLE act_app
  LOGIN PASSWORD '<generated-runtime-password>'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
GRANT CONNECT ON DATABASE <database_name> TO act_app;
GRANT USAGE ON SCHEMA public TO act_app;
```

Run migrations with `DATABASE_ADMIN_URL` set only in the trusted operator or CI
environment. Migration `0002_security_hardening.sql` grants `act_app` the exact
runtime permissions. In Vercel, configure only the restricted role's pooled URL
as `DATABASE_URL`, plus `AUTH_THROTTLE_SECRET`; do not expose
`DATABASE_ADMIN_URL` to the application runtime.

## CI and deployment

Use Node.js 24 (`.node-version`) and the pinned pnpm version in `package.json`.
Run `pnpm check` for lint, type checking, and unit tests; `pnpm build` verifies
production compilation. GitHub Actions also validates migrations and PostgreSQL
row-level security in an isolated database.

See [the deployment guide](docs/deployment.md) for GitHub required checks,
production/preview database provisioning, Vercel environment variables, automatic
production migrations and deployment through GitHub Actions, and rollback
instructions. Production releases require a GitHub `production` environment with
`DATABASE_ADMIN_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` secrets.
The workflow tests, migrates, then deploys; native Vercel Git deployments for
`main` are disabled so they cannot bypass migrations.
