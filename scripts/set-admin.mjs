import process from "node:process";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

// Grant or revoke the admin flag. The runtime role act_app cannot change
// is_admin, so admin promotion happens out-of-band through the privileged URL,
// same as account provisioning. This is the bootstrap for the very first admin,
// who cannot promote themselves through a panel they cannot yet reach.
const connectionString = process.env.DATABASE_ADMIN_URL;

if (!connectionString) {
  throw new Error("Set DATABASE_ADMIN_URL first");
}

const email = process.argv[2]?.trim().toLowerCase();
const revoke = process.argv.includes("--revoke");

if (!email || email.startsWith("--")) {
  throw new Error(
    "Usage: pnpm db:set-admin <email> [--revoke]\n" +
      "  Grants admin to <email>, or removes it with --revoke.",
  );
}

const pool = new pg.Pool({ connectionString, max: 1 });
const client = await pool.connect();

try {
  const result = await client.query(
    `UPDATE users
        SET is_admin = $2,
            updated_at = now()
      WHERE email = $1
      RETURNING email, is_admin`,
    [email, !revoke],
  );

  if (result.rowCount === 0) {
    throw new Error(`No account found for ${email}`);
  }

  const row = result.rows[0];
  console.log(`${row.email}: is_admin = ${row.is_admin}`);
} finally {
  client.release();
  await pool.end();
}
