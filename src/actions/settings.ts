"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { LOCALE_COOKIE, locales } from "@/i18n/config";
import { updateUserSettings } from "@/lib/db/user-settings";

const localeSchema = z.enum(locales);

/**
 * Persists the chosen locale to `user_settings` and mirrors it in a cookie so it
 * is available before the settings row loads. Called by the sidebar locale switch.
 */
export async function setLocaleAction(locale: string): Promise<void> {
  const parsed = localeSchema.parse(locale);

  await updateUserSettings({ locale: parsed });

  (await cookies()).set(LOCALE_COOKIE, parsed, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
}
