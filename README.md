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
container, which uses port `5433`.

1. Install dependencies with `pnpm install`.
2. Start PostgreSQL with `pnpm db:up`.
3. Apply the schema with `pnpm db:migrate`.
4. Create the first account with `pnpm db:create-user user@example.com`.
5. Start Next.js with `pnpm dev`.

Use `pnpm db:logs` to follow PostgreSQL logs and `pnpm db:down` to stop the
container. `db:down` preserves the `postgres_data` volume and its data.

`db:create-user` also resets the password and unlocks an existing account with
the same normalized email. There is intentionally no signup page or signup API.

## RLS contract

The `user_settings` table is the starter pattern for user-owned data:

- include a non-null `user_id` foreign key;
- enable and force RLS;
- compare `user_id` with `app.current_user_id` in both `USING` and `WITH CHECK`;
- access the table only inside `withCurrentUserDb(callback)` so the identity is
  read from the verified session, remains transaction-local, and cannot leak
  through the connection pool.

The `users` and `sessions` tables are authentication infrastructure. They are
queried only from server-only modules and are not exposed through a browser DB
client.

For Vercel, add `DATABASE_URL` and, when available, `DATABASE_URL_UNPOOLED` to
the project environment. Run migrations with the direct URL during deployment.
