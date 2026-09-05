"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { getCurrentUser } from "@/auth/session";
import { LOCALE_COOKIE, locales } from "@/i18n/config";
import { updateUserSettings } from "@/lib/db/user-settings";

const localeSchema = z.enum(locales);

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
