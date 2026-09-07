import "server-only";

import type { PoolClient } from "pg";
import type { DomainId } from "@/lib/act/constants";
import type { PersonalValue, PersonalValueSnapshot } from "@/lib/act/types";
import { withCurrentUserDb } from "@/lib/db/user-context";

type PersonalValueRow = {
  id: string;
  user_id: string;
  title: string;
  domains: string[];
  meaning: string;
  examples: string[];
  archived_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
};

export type CreatePersonalValueInput = {
  title: string;
  domains: DomainId[];
  meaning?: string;
  examples?: string[];
};

export type UpdatePersonalValueInput = CreatePersonalValueInput;

const valueColumns = `
  id, user_id, title, domains, meaning, examples,
  archived_at, created_at, updated_at
`;

function timestampValue(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapPersonalValue(row: PersonalValueRow): PersonalValue {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    domains: (row.domains ?? []) as DomainId[],
    meaning: row.meaning,
    examples: row.examples ?? [],
    archivedAt: row.archived_at ? timestampValue(row.archived_at) : null,
    createdAt: timestampValue(row.created_at),
    updatedAt: timestampValue(row.updated_at),
  };
}

/**
 * Lists the current user's values. Active values only by default — pickers must
 * never offer an archived value. Ordered by title so no list reads as a ranking.
 */
export async function listPersonalValues({
  includeArchived = false,
}: {
  includeArchived?: boolean;
} = {}): Promise<PersonalValue[]> {
  return withCurrentUserDb(async (client) => {
    const result = await client.query<PersonalValueRow>(
      `SELECT ${valueColumns}
         FROM personal_values
        WHERE $1::boolean OR archived_at IS NULL
        ORDER BY title ASC, created_at ASC`,
      [includeArchived],
    );

    return result.rows.map(mapPersonalValue);
  });
}

/** Gets one value owned by the current user, active or archived, else null. */
export async function getPersonalValue(
  id: string,
): Promise<PersonalValue | null> {
  return withCurrentUserDb(async (client) => {
    const result = await client.query<PersonalValueRow>(
      `SELECT ${valueColumns}
         FROM personal_values
        WHERE id = $1
        LIMIT 1`,
      [id],
    );

    const row = result.rows[0];
    return row ? mapPersonalValue(row) : null;
  });
}

/** Creates one value owned by the current user. */
export async function createPersonalValue(
  input: CreatePersonalValueInput,
): Promise<PersonalValue> {
  return withCurrentUserDb(async (client, userId) => {
    const result = await client.query<PersonalValueRow>(
      `INSERT INTO personal_values (user_id, title, domains, meaning, examples)
       VALUES ($1, $2, $3::text[], $4, $5::text[])
       RETURNING ${valueColumns}`,
      [
        userId,
        input.title,
        input.domains,
        input.meaning ?? "",
        input.examples ?? [],
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Personal value insert did not return a row");
    }
    return mapPersonalValue(row);
  });
}

/**
 * Replaces the editable fields of one owned value. Snapshots already attached to
 * a morning entry or an episode are untouched — history keeps the older wording.
 */
export async function updatePersonalValue(
  id: string,
  input: UpdatePersonalValueInput,
): Promise<PersonalValue | null> {
  return withCurrentUserDb(async (client) => {
    const result = await client.query<PersonalValueRow>(
      `UPDATE personal_values
          SET title = $2,
              domains = $3::text[],
              meaning = $4,
              examples = $5::text[],
              updated_at = now()
        WHERE id = $1
      RETURNING ${valueColumns}`,
      [
        id,
        input.title,
        input.domains,
        input.meaning ?? "",
        input.examples ?? [],
      ],
    );

    const row = result.rows[0];
    return row ? mapPersonalValue(row) : null;
  });
}

/**
 * Archives or restores one owned value. Archiving hides it from pickers without
 * deleting it; there is no delete path, because history references it.
 */
export async function setPersonalValueArchived(
  id: string,
  archived: boolean,
): Promise<PersonalValue | null> {
  return withCurrentUserDb(async (client) => {
    const result = await client.query<PersonalValueRow>(
      `UPDATE personal_values
          SET archived_at = CASE WHEN $2::boolean THEN now() ELSE NULL END,
              updated_at = now()
        WHERE id = $1
      RETURNING ${valueColumns}`,
      [id, archived],
    );

    const row = result.rows[0];
    return row ? mapPersonalValue(row) : null;
  });
}

/** Raised when a value cannot be attached: not owned, missing, or archived. */
export class UnavailableValueError extends Error {
  constructor(valueId: string) {
    super(`Value ${valueId} is not available to the current user`);
    this.name = "UnavailableValueError";
  }
}

/**
 * Resolves a snapshot for `valueId` inside the caller's transaction, so ownership
 * validation and snapshot derivation share one atomic read with the write that
 * stores it. RLS restricts the row to the current user; the `archived_at` check
 * additionally refuses a value the user has taken out of circulation.
 */
export async function resolveOwnedActiveSnapshot(
  client: PoolClient,
  valueId: string,
): Promise<PersonalValueSnapshot> {
  const result = await client.query<
    Pick<PersonalValueRow, "id" | "title" | "meaning" | "domains">
  >(
    `SELECT id, title, meaning, domains
       FROM personal_values
      WHERE id = $1 AND archived_at IS NULL
      LIMIT 1`,
    [valueId],
  );

  const row = result.rows[0];
  if (!row) {
    throw new UnavailableValueError(valueId);
  }

  return {
    valueId: row.id,
    title: row.title,
    meaning: row.meaning,
    domains: (row.domains ?? []) as DomainId[],
  };
}
