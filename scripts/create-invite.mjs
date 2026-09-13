import { createHash, randomBytes } from "node:crypto";
import process from "node:process";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

const connectionString = process.env.DATABASE_ADMIN_URL;

if (!connectionString) {
  throw new Error("Set DATABASE_ADMIN_URL first");
}

// Only the hash is ever stored (see migrations/0007_registration.sql). The
// plaintext below is the sole copy and is printed exactly once.
function hashCode(code) {
  return createHash("sha256").update(code).digest("hex");
}

// Accepts `--flag value` and `--flag=value`. Bare flags are not used here.
function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const equals = token.indexOf("=");
    if (equals !== -1) {
      args[token.slice(2, equals)] = token.slice(equals + 1);
    } else {
      const next = argv[index + 1];
      if (next === undefined || next.startsWith("--")) {
        throw new Error(`Missing value for ${token}`);
      }
      args[token.slice(2)] = next;
      index += 1;
    }
  }
  return args;
}

const usage = `Usage: pnpm db:create-invite [options]

  --uses <n>          How many accounts this code can create (default 1)
  --expires-days <n>  Expire the code after N days (default: no expiry)
  --email <address>   Bind the code so only this email can register with it
  --note <text>       A label shown in the admin list (e.g. who it's for)`;

const args = parseArgs(process.argv.slice(2));

if (args.help !== undefined || args.h !== undefined) {
  console.log(usage);
  process.exit(0);
}

const knownFlags = new Set(["uses", "expires-days", "email", "note"]);
for (const flag of Object.keys(args)) {
  if (!knownFlags.has(flag)) {
    throw new Error(`Unknown option --${flag}\n\n${usage}`);
  }
}

const maxUses = args.uses === undefined ? 1 : Number(args.uses);
if (!Number.isInteger(maxUses) || maxUses < 1) {
  throw new Error("--uses must be a whole number of at least 1");
}

let expiresDays = null;
if (args["expires-days"] !== undefined) {
  expiresDays = Number(args["expires-days"]);
  if (!Number.isInteger(expiresDays) || expiresDays < 1) {
    throw new Error("--expires-days must be a whole number of at least 1");
  }
}

let email = null;
if (args.email !== undefined) {
  email = args.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error("--email must be a valid email address");
  }
}

const note = (args.note ?? "").trim();
if (note.length > 200) {
  throw new Error("--note must be 200 characters or fewer");
}

// 24 random bytes -> 32 base64url characters. base64url is case-significant, so
// the register form compares the trimmed code as-is.
const code = randomBytes(24).toString("base64url");
const codeHash = hashCode(code);

const pool = new pg.Pool({ connectionString, max: 1 });
const client = await pool.connect();

try {
  const result = await client.query(
    `INSERT INTO invite_codes (code_hash, email, max_uses, expires_at, note)
     VALUES (
       $1,
       $2,
       $3,
       CASE WHEN $4::int IS NULL THEN NULL
            ELSE now() + make_interval(days => $4::int) END,
       $5
     )
     RETURNING id, expires_at`,
    [codeHash, email, maxUses, expiresDays, note],
  );

  const { id, expires_at: expiresAt } = result.rows[0];

  console.log("");
  console.log(
    "  Invite code (save it now — it is not stored and won't be shown again):",
  );
  console.log("");
  console.log(`      ${code}`);
  console.log("");
  console.log(`  id        ${id.slice(0, 8)}`);
  console.log(`  uses      ${maxUses}`);
  console.log(
    `  expires   ${expiresAt ? new Date(expiresAt).toISOString() : "never"}`,
  );
  console.log(`  bound to  ${email ?? "any email"}`);
  if (note) {
    console.log(`  note      ${note}`);
  }
  console.log("");
} finally {
  client.release();
  await pool.end();
}
