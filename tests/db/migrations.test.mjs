import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { copyFile, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import pg from "pg";
import { runMigrations } from "../../scripts/lib/migrations.mjs";

test("0004 preserves legacy episodes and day entries without creating values", async () => {
  assert.ok(process.env.DATABASE_ADMIN_URL, "Set DATABASE_ADMIN_URL");
  const schema = `values_migration_test_${randomUUID().replaceAll("-", "")}`;
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "act-values-migration-"),
  );
  const client = new pg.Client({
    connectionString: process.env.DATABASE_ADMIN_URL,
  });
  const source = new URL("../../migrations/", import.meta.url);
  const valueMigration = "0004_personal_values.sql";
  const userId = randomUUID();
  try {
    await client.connect();
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET search_path TO ${schema}`);
    for (const name of (await readdir(source)).filter(
      (name) => name.endsWith(".sql") && name < valueMigration,
    )) {
      await copyFile(new URL(name, source), path.join(directory, name));
    }
    await runMigrations(client, directory, () => {});
    await client.query(
      "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, 'test-only')",
      [userId, `${userId}@example.test`],
    );
    await client.query(
      `INSERT INTO episodes (user_id, day, band, dir, hook, state, skill, value, move, checks)
       VALUES ($1, '2026-09-01', 2, 'away', 'A difficult conversation', 'none', 'none',
               'Мои собственные слова', 'Ask for time', '{"values": 1}')`,
      [userId],
    );
    await client.query(
      `INSERT INTO day_entries (user_id, day, morning, evening)
       VALUES ($1, '2026-09-01', $2::jsonb, $3::jsonb),
              ($1, '2026-09-02', '{}'::jsonb, '{}'::jsonb)`,
      [
        userId,
        JSON.stringify({ open: "Make room", toward: "Спросить" }),
        JSON.stringify({ flex: "Listened", next: "Try again" }),
      ],
    );
    const episodesBefore = (
      await client.query("SELECT to_jsonb(e) AS entry FROM episodes e")
    ).rows;
    const daysBefore = (
      await client.query(
        "SELECT to_jsonb(d) AS entry FROM day_entries d ORDER BY day",
      )
    ).rows;

    await copyFile(
      new URL(valueMigration, source),
      path.join(directory, valueMigration),
    );
    const logs = [];
    await runMigrations(client, directory, (line) => logs.push(line));
    assert.deepEqual(
      logs.filter((line) => line.startsWith("apply ")),
      [`apply ${valueMigration}`],
    );
    const assertLegacyData = async () => {
      assert.deepEqual(
        (await client.query("SELECT to_jsonb(e) AS entry FROM episodes e"))
          .rows,
        episodesBefore.map(({ entry }) => ({
          entry: { ...entry, value_id: null, value_snapshot: null },
        })),
      );
      // Morning JSON stays verbatim: absent link keys read as null, without a rewrite.
      assert.deepEqual(
        (
          await client.query(
            "SELECT to_jsonb(d) AS entry FROM day_entries d ORDER BY day",
          )
        ).rows,
        daysBefore,
      );
      assert.deepEqual(
        (
          await client.query(`SELECT morning->>'valueId' AS value_id,
          morning->'valueSnapshot' AS value_snapshot FROM day_entries ORDER BY day`)
        ).rows,
        [
          { value_id: null, value_snapshot: null },
          { value_id: null, value_snapshot: null },
        ],
      );
      assert.equal(
        (await client.query("SELECT * FROM personal_values")).rowCount,
        0,
      );
    };
    await assertLegacyData();
    const rerunLogs = [];
    await runMigrations(client, directory, (line) => rerunLogs.push(line));
    assert.ok(rerunLogs.includes(`skip ${valueMigration}`));
    assert.ok(rerunLogs.every((line) => line.startsWith("skip ")));
    await assertLegacyData();
  } finally {
    try {
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    } finally {
      await client.end();
      await rm(directory, { recursive: true, force: true });
    }
  }
});

// An isolated schema in the explicitly configured disposable test database.
test(
  "migrations serialize, skip applied files and roll back a failed file",
  { timeout: 20_000 },
  async () => {
    assert.ok(process.env.DATABASE_ADMIN_URL, "Set DATABASE_ADMIN_URL");
    const schema = `migration_test_${randomUUID().replaceAll("-", "")}`;
    const directory = await mkdtemp(path.join(os.tmpdir(), "act-migrations-"));
    const first = new pg.Client({
      connectionString: process.env.DATABASE_ADMIN_URL,
    });
    const second = new pg.Client({
      connectionString: process.env.DATABASE_ADMIN_URL,
    });
    try {
      await first.connect();
      await second.connect();
      await first.query(`CREATE SCHEMA ${schema}`);
      await first.query(`SET search_path TO ${schema}`);
      await second.query(`SET search_path TO ${schema}`);
      await writeFile(
        path.join(directory, "0001_initial.sql"),
        "CREATE TABLE marker (value integer); SELECT pg_sleep(0.1); INSERT INTO marker VALUES (1);",
      );
      const logs = [];
      await Promise.all([
        runMigrations(first, directory, (line) => logs.push(line)),
        runMigrations(second, directory, (line) => logs.push(line)),
      ]);
      assert.deepEqual(logs.sort(), [
        "apply 0001_initial.sql",
        "skip 0001_initial.sql",
      ]);
      assert.deepEqual((await first.query("SELECT * FROM marker")).rows, [
        { value: 1 },
      ]);

      // A committed file before a failing file remains applied. Changes made
      // inside the failed file and its metadata must both roll back.
      await writeFile(
        path.join(directory, "0002_next.sql"),
        "INSERT INTO marker VALUES (2);",
      );
      await writeFile(
        path.join(directory, "0003_failure.sql"),
        "INSERT INTO marker VALUES (3); SELECT * FROM missing_table;",
      );
      await assert.rejects(
        runMigrations(first, directory, () => {}),
        { code: "42P01" },
      );
      assert.deepEqual(
        (await first.query("SELECT value FROM marker ORDER BY value")).rows,
        [{ value: 1 }, { value: 2 }],
      );
      assert.deepEqual(
        (await first.query("SELECT name FROM schema_migrations ORDER BY name"))
          .rows,
        [{ name: "0001_initial.sql" }, { name: "0002_next.sql" }],
      );

      // The lock must be released after failure so another connection can retry.
      await writeFile(
        path.join(directory, "0003_failure.sql"),
        "INSERT INTO marker VALUES (3);",
      );
      await runMigrations(second, directory, () => {});
      await runMigrations(first, directory, () => {});
      assert.deepEqual(
        (await first.query("SELECT value FROM marker ORDER BY value")).rows,
        [{ value: 1 }, { value: 2 }, { value: 3 }],
      );
    } finally {
      await second.end();
      try {
        await first.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      } finally {
        await first.end();
        await rm(directory, { recursive: true, force: true });
      }
    }
  },
);
