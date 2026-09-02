import "server-only";

import { Pool, type PoolClient, type QueryResultRow } from "pg";

const globalForDatabase = globalThis as unknown as { actPool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  return new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  });
}

export function getPool() {
  if (!globalForDatabase.actPool) {
    globalForDatabase.actPool = createPool();
  }

  return globalForDatabase.actPool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
) {
  return getPool().query<T>(text, [...values]);
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
) {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
