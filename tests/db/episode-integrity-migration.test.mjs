import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { copyFile, mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import pg from "pg";
import { runMigrations } from "../../scripts/lib/migrations.mjs";

test("0005 preserves legacy rows and separates unanswered, unknown and explicit absence", async () => {
  assert.ok(process.env.DATABASE_ADMIN_URL, "Set DATABASE_ADMIN_URL");
  const schema = `episode_integrity_${randomUUID().replaceAll("-", "")}`;
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "act-episode-integrity-"),
  );
  const source = new URL("../../migrations/", import.meta.url);
  const migration = "0005_episode_integrity.sql";
  const client = new pg.Client({
    connectionString: process.env.DATABASE_ADMIN_URL,
  });
  const user = randomUUID();
  try {
    await client.connect();
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET search_path TO ${schema}`);
    for (const name of (await readdir(source)).filter(
      (name) => name.endsWith(".sql") && name < migration,
    )) {
      await copyFile(new URL(name, source), path.join(directory, name));
    }
    await runMigrations(client, directory, () => {});
    await client.query(
      "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, 'test-only')",
      [user, `${user}@example.test`],
    );
    for (const dir of ["toward", "away"])
      await client.query(
        `
      INSERT INTO episodes (user_id, day, band, dir, hook, state, skill, move, checks, value_snapshot)
      VALUES ($1, '2026-09-01', 7, $2, 'Мои слова', 'none', 'commit', '—', '{"awareness":0,"action":2}', '{"title":"As recorded"}')
    `,
        [user, dir],
      );
    const before = (
      await client.query(
        "SELECT to_jsonb(e) AS entry FROM episodes e ORDER BY id",
      )
    ).rows;
    await copyFile(new URL(migration, source), path.join(directory, migration));
    await runMigrations(client, directory, () => {});
    assert.deepEqual(
      (
        await client.query(
          "SELECT to_jsonb(e) AS entry FROM episodes e ORDER BY id",
        )
      ).rows,
      before.map(({ entry }) => ({
        entry: {
          ...entry,
          behavior_status: "not-described",
          immediate_outcome: "",
          later_consequences: "",
          consequence_status: "unknown",
          intended_function: "",
          next_experiment: "",
          interpretation: "",
          schema_version: 1,
          states: ["none"],
          skills: ["commit"],
          event_timezone: null,
          legacy_snapshot: null,
        },
      })),
    );
    await runMigrations(client, directory, () => {});
    assert.equal(
      (await client.query("SELECT to_regtype('episode_dir') AS type")).rows[0]
        .type,
      null,
    );
    for (const dir of ["toward", "away", "mixed", "unknown"]) {
      const {
        rows: [row],
      } = await client.query(
        `INSERT INTO episodes (user_id, day, band, dir, hook)
        VALUES ($1, '2026-09-02', 0, $2, 'A note') RETURNING *`,
        [user, dir],
      );
      assert.equal(row.schema_version, 2);
      assert.equal(row.behavior_status, "not-described");
      assert.equal(row.hook_type, null);
      assert.equal(row.state, null);
      assert.equal(row.skill, null);
      assert.deepEqual(row.states, []);
      assert.deepEqual(row.skills, []);
      assert.deepEqual(row.checks, {});
    }
    for (const [states, skills] of [
      [["unknown"], []],
      [["none-noticed"], ["no-skill"]],
      [[], ["unknown"]],
      [
        ["fusion", "avoidance"],
        ["notice", "commit"],
      ],
    ]) {
      await client.query(
        `INSERT INTO episodes (user_id, day, band, dir, hook, states, skills)
        VALUES ($1, '2026-09-02', 0, 'unknown', 'A note', $2, $3)`,
        [user, states, skills],
      );
    }
    for (const [states, skills] of [
      [["unknown", "fusion"], []],
      [["none", "fusion"], []],
      [["unknown", "none-noticed"], []],
      [[], ["no-skill", "commit"]],
      [[], ["unknown", "no-skill"]],
      [[null], []],
    ]) {
      await assert.rejects(
        client.query(
          `INSERT INTO episodes (user_id, day, band, dir, hook, states, skills)
        VALUES ($1, '2026-09-02', 0, 'unknown', 'A note', $2, $3)`,
          [user, states, skills],
        ),
        { code: "23514" },
      );
    }
    await assert.rejects(
      client.query(
        `INSERT INTO episodes (user_id, day, band, dir, hook, behavior_status)
      VALUES ($1, '2026-09-02', 0, 'toward', 'A note', 'acted')`,
        [user],
      ),
      { code: "23514" },
    );
    await assert.rejects(
      client.query(
        `INSERT INTO episodes (user_id, day, band, dir, hook)
      VALUES ($1, '2026-09-02', 0, 'unknown', '')`,
        [user],
      ),
      { code: "23514" },
    );
    const security = (
      await client.query(
        "SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid = 'episodes'::regclass",
      )
    ).rows[0];
    assert.deepEqual(security, {
      relrowsecurity: true,
      relforcerowsecurity: true,
    });
  } finally {
    try {
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    } finally {
      await client.end();
      await rm(directory, { recursive: true, force: true });
    }
  }
});
