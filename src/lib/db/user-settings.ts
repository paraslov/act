import "server-only";

import { withCurrentUserDb } from "@/lib/db/user-context";

/** Free-form per-user settings bag stored as jsonb on `user_settings`. */
export type UserSettings = {
  locale?: string;
  timezone?: string;
  [key: string]: unknown;
};

/**
 * Reads the current user's settings bag, creating an empty row on first access
 * so later merges have something to update.
 */
export async function getUserSettings(): Promise<UserSettings> {
  return withCurrentUserDb(async (client, userId) => {
    const result = await client.query<{ settings: UserSettings }>(
      `INSERT INTO user_settings (user_id)
         VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
       RETURNING settings`,
      [userId],
    );
    return result.rows[0]?.settings ?? {};
  });
}

/**
 * Shallow-merges `patch` into the current user's settings bag and returns the
 * merged result.
 */
export async function updateUserSettings(
  patch: Partial<UserSettings>,
): Promise<UserSettings> {
  return withCurrentUserDb(async (client, userId) => {
    const result = await client.query<{ settings: UserSettings }>(
      `INSERT INTO user_settings (user_id, settings)
         VALUES ($1, $2::jsonb)
       ON CONFLICT (user_id) DO UPDATE
         SET settings = user_settings.settings || EXCLUDED.settings,
             updated_at = now()
       RETURNING settings`,
      [userId, JSON.stringify(patch)],
    );
    return result.rows[0]?.settings ?? {};
  });
}
