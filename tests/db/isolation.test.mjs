import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";

// Explicit environment only: never load a developer's .env.local here.
test("runtime grants and transaction-local RLS isolate users", async () => {
  assert.ok(process.env.DATABASE_ADMIN_URL, "Set DATABASE_ADMIN_URL");
  assert.ok(process.env.DATABASE_URL, "Set DATABASE_URL");
  const admin = new pg.Client({
    connectionString: process.env.DATABASE_ADMIN_URL,
  });
  const app = new pg.Client({ connectionString: process.env.DATABASE_URL });
  const users = [randomUUID(), randomUUID()];
  try {
    await admin.connect();
    await app.connect();
    const role = (
      await app.query(
        "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
      )
    ).rows[0];
    assert.equal(role.rolsuper, false);
    assert.equal(role.rolbypassrls, false);
    for (const id of users) {
      await admin.query(
        "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, 'test-only')",
        [id, `${id}@example.test`],
      );
      await admin.query("INSERT INTO user_settings (user_id) VALUES ($1)", [
        id,
      ]);
      await admin.query(
        "INSERT INTO day_entries (user_id, day) VALUES ($1, CURRENT_DATE)",
        [id],
      );
      await admin.query(
        "INSERT INTO episodes (user_id, day, band, dir, hook, state, skill) VALUES ($1, CURRENT_DATE, 0, 'toward', 'test', 'test', 'test')",
        [id],
      );
    }
    for (const table of ["user_settings", "day_entries", "episodes"]) {
      assert.equal((await app.query(`SELECT * FROM ${table}`)).rowCount, 0);
      await app.query("BEGIN");
      await app.query("SELECT set_config('app.current_user_id', $1, true)", [
        users[0],
      ]);
      const rows = (await app.query(`SELECT user_id FROM ${table}`)).rows;
      assert.deepEqual(rows, [{ user_id: users[0] }]);
      assert.equal(
        (await app.query(`DELETE FROM ${table} WHERE user_id = $1`, [users[1]]))
          .rowCount,
        0,
      );
      await assert.rejects(
        app.query(`UPDATE ${table} SET user_id = $1 WHERE user_id = $2`, [
          users[1],
          users[0],
        ]),
        { code: "42501" },
      );
      await app.query("ROLLBACK");
      assert.equal((await app.query(`SELECT * FROM ${table}`)).rowCount, 0);
      await app.query("BEGIN");
      await app.query("SELECT set_config('app.current_user_id', $1, true)", [
        users[1],
      ]);
      assert.deepEqual((await app.query(`SELECT user_id FROM ${table}`)).rows, [
        { user_id: users[1] },
      ]);
      await app.query("COMMIT");
      assert.equal((await app.query(`SELECT * FROM ${table}`)).rowCount, 0);
    }
    await assert.rejects(app.query("SELECT * FROM schema_migrations"), {
      code: "42501",
    });
    await assert.rejects(
      app.query("UPDATE users SET password_hash = 'forbidden' WHERE id = $1", [
        users[0],
      ]),
      { code: "42501" },
    );
    await assert.rejects(
      app.query(
        "INSERT INTO users (email, password_hash) VALUES ('forbidden@example.test', 'forbidden')",
      ),
      { code: "42501" },
    );
  } finally {
    await app.end();
    try {
      await admin.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [
        users,
      ]);
    } finally {
      await admin.end();
    }
  }
});
