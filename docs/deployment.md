# GitHub CI and Vercel deployment

## Continuous integration

`.github/workflows/ci.yml` runs on pull requests, pushes to `main`, and manual
workflow runs. It installs the locked pnpm dependencies on Node.js 24 and runs:

- Biome lint and formatting checks, Next.js route type generation, TypeScript,
  all unit tests, and a production build.
- PostgreSQL 16 in a disposable service: create the restricted runtime role,
  apply all migrations twice, then test runtime permissions and user isolation
  for settings, day entries, and episodes, including pooled identity reset.

No GitHub secrets are required. Database credentials in CI are disposable test
credentials. The build fetches Google fonts and requires internet access.
Run `pnpm check` and `pnpm build` locally. `pnpm test:db` requires explicit
`DATABASE_ADMIN_URL` and `DATABASE_URL` pointing to a migrated test database;
it inserts temporary users and removes them afterwards. Never target production.

In GitHub, create a ruleset for `main` requiring pull requests and both checks:
`Lint, types, tests and build` and `Migrations and database isolation`.
Require branches to be up to date before merging, and restrict bypasses.

## One-time database setup

1. Provision a PostgreSQL database (for example Neon) near the Vercel function
   region you will choose in Project Settings. Create a separate database or
   branch for Preview; previews must never use production credentials or data.
2. As the database owner, create `act_app` using the SQL in the README's
   Production database roles section. This must happen **before** migration,
   because migrations grant permissions only when that role exists.
3. In a trusted operator shell, set `DATABASE_ADMIN_URL` to the provider's
   direct owner connection URL, including its required TLS options, and run
   `pnpm db:migrate`. Repeat for the preview database.
4. With that same environment, run `pnpm db:create-user you@example.com` and
   enter a password at the prompt. Repeat for a preview test account.
5. Obtain pooled connection URLs using `act_app` credentials for app runtime.
   Preserve provider-required TLS parameters. The app rejects superuser and
   BYPASSRLS connections; the provider's default owner URL is unsuitable.

Do not run migrations in the Vercel build command: preview builds may run
concurrently, and the deployed app must not receive owner credentials. For
later schema releases, apply backward-compatible migrations from a trusted
operator shell before merging the corresponding application change.

## Connect Vercel

1. Import this GitHub repository into Vercel. Select Next.js, repository root
   (`.`), Node.js 24.x, and production branch `main`.
2. Add these environment variables separately for Production and Preview:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Environment-specific pooled `act_app` URL with TLS |
   | `AUTH_THROTTLE_SECRET` | Unique random secret, at least 32 characters; generate with `openssl rand -base64 32` |

   Do not add `DATABASE_ADMIN_URL` or use `NEXT_PUBLIC_` for any secret.
   `AUTH_TRUST_PROXY_HEADERS` is unnecessary on Vercel.
3. Keep the checked-in `vercel.json` settings. The install uses Corepack and
   the exact pnpm version from `packageManager`; the Vercel build runs lint,
   type checking, unit tests, then Next.js compilation. Leave output-directory
   settings at the Next.js default. Select a function region near PostgreSQL.
4. Deploy, then verify login, save a moment and a daily entry, refresh to
   confirm persistence, log out, and confirm protected pages require login.
   Use two preview accounts to check their records stay separate.

Vercel's Git integration handles continuous deployment: branches/PRs create
Preview deployments, and merges to `main` create Production deployments.
GitHub's required checks gate merges; Vercel also repeats code quality checks
in its own build. Vercel does not automatically wait for the separate GitHub
database job, so the `main` ruleset is required for that gate. No Vercel token
in GitHub or separate deployment Action is needed for this setup.

Configure a custom domain and a login rate-limit rule in Vercel as appropriate.
To roll back, promote a known-good deployment in Vercel; database migrations
are not rolled back with application code. Keep schema changes compatible
with the previous release and use provider backups for database recovery.

References: [Vercel GitHub integration](https://vercel.com/docs/git/vercel-for-github),
[Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json),
[Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
