import "server-only";

import type { DayEntry, DayEvening, DayMorning } from "@/lib/act/types";
import { withCurrentUserDb } from "@/lib/db/user-context";
import { postgresDateValue } from "@/lib/db/values";

type DayEntryRow = {
  user_id: string;
  day: string | Date;
  morning: DayMorning;
  evening: DayEvening;
};

export type DayEntryPatch = {
  morning?: DayMorning;
  evening?: DayEvening;
};

function mapDayEntry(row: DayEntryRow): DayEntry {
  return {
    userId: row.user_id,
    day: postgresDateValue(row.day),
    morning: row.morning ?? {},
    evening: row.evening ?? {},
  };
}

/** Gets the current user's entry for a calendar day, or null when none exists. */
export async function getDayEntry(day: string): Promise<DayEntry | null> {
  return withCurrentUserDb(async (client) => {
    const result = await client.query<DayEntryRow>(
      `SELECT user_id, day, morning, evening
         FROM day_entries
        WHERE day = $1::date
        LIMIT 1`,
      [day],
    );

    const row = result.rows[0];
    return row ? mapDayEntry(row) : null;
  });
}

/** Lists every day entry owned by the current user, newest-first. */
export async function listDayEntries(): Promise<DayEntry[]> {
  return withCurrentUserDb(async (client) => {
    const result = await client.query<DayEntryRow>(
      `SELECT user_id, day, morning, evening
         FROM day_entries
        ORDER BY day DESC`,
    );

    return result.rows.map(mapDayEntry);
  });
}

/**
 * Creates or updates a day entry. Only supplied halves are changed, and partial
 * fields are merged so saving morning data never erases evening data (or vice versa).
 */
export async function upsertDayEntry(
  day: string,
  patch: DayEntryPatch,
): Promise<DayEntry> {
  return withCurrentUserDb(async (client, userId) => {
    const morning = patch.morning ? JSON.stringify(patch.morning) : null;
    const evening = patch.evening ? JSON.stringify(patch.evening) : null;
    const result = await client.query<DayEntryRow>(
      `INSERT INTO day_entries (user_id, day, morning, evening)
       VALUES (
         $1,
         $2::date,
         COALESCE($3::jsonb, '{}'::jsonb),
         COALESCE($4::jsonb, '{}'::jsonb)
       )
       ON CONFLICT (user_id, day) DO UPDATE
         SET morning = CASE
               WHEN $3::jsonb IS NULL THEN day_entries.morning
               ELSE day_entries.morning || $3::jsonb
             END,
             evening = CASE
               WHEN $4::jsonb IS NULL THEN day_entries.evening
               ELSE day_entries.evening || $4::jsonb
             END,
             updated_at = now()
       RETURNING user_id, day, morning, evening`,
      [userId, day, morning, evening],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Day entry upsert did not return a row");
    }
    return mapDayEntry(row);
  });
}
