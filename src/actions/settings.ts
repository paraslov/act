"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { getCurrentUser } from "@/auth/session";
import { LOCALE_COOKIE, locales } from "@/i18n/config";
import { isTimeZone } from "@/lib/act/date";
import { updateUserSettings } from "@/lib/db/user-settings";

const localeSchema = z.enum(locales);
const timezoneSchema = z.string().refine(isTimeZone, "Unknown time zone");

/**
 * Persists the chosen locale to `user_settings` and mirrors it in a cookie so it
 * is available on the sign-in screen too. Guests only update their locale cookie.
 */
export async function setLocaleAction(locale: string): Promise<void> {
  const parsed = localeSchema.parse(locale);

  if (await getCurrentUser()) {
    await updateUserSettings({ locale: parsed });
  }

  (await cookies()).set(LOCALE_COOKIE, parsed, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
}

/**
 * Persists the chosen event time zone to `user_settings`. It decides which
 * calendar day "today" is and is frozen onto each new episode; changing it never
 * moves existing records. Requires a session.
 */
export async function setTimezoneAction(timezone: string): Promise<void> {
  const parsed = timezoneSchema.parse(timezone);
  if (!(await getCurrentUser())) throw new Error("Sign in to change settings");
  await updateUserSettings({ timezone: parsed });
  revalidatePath("/", "layout");
}
