import "server-only";

import { cookies } from "next/headers";
import { getCurrentUser } from "@/auth/session";
import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from "@/i18n/config";
import { withCurrentUserDb } from "@/lib/db/user-context";

/**
 * Resolves the active locale for the current request.
 *
 * Precedence: `user_settings.settings.locale` → the `locale` cookie → `en`.
 * Never throws and never redirects — it is safe to call on unauthenticated
 * routes (the settings lookup is skipped when there is no session).
 */
export async function resolveLocale(): Promise<Locale> {
  try {
    const user = await getCurrentUser();
    if (user) {
      const settingsLocale = await withCurrentUserDb(async (client, userId) => {
        const result = await client.query<{ locale: string | null }>(
          "SELECT settings->>'locale' AS locale FROM user_settings WHERE user_id = $1",
          [userId],
        );
        return result.rows[0]?.locale ?? null;
      });
      if (isLocale(settingsLocale)) {
        return settingsLocale;
      }
    }
  } catch {
    // Fall through to the cookie / default; locale must never break rendering.
  }

  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) {
    return cookieLocale;
  }

  return defaultLocale;
}
