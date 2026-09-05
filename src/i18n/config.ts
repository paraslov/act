/**
 * Locale configuration for the single-user app.
 *
 * There is deliberately no `/[locale]` route segment: the active locale is
 * resolved per request from `user_settings.settings.locale`, falling back to a
 * cookie, then to `en`. Both EN and RU ship complete catalogs; missing
 * translations still fall back to EN key by key.
 */
export const locales = ["en", "ru"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Cookie that mirrors the chosen locale so it survives before settings load. */
export const LOCALE_COOKIE = "locale";

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (locales as readonly string[]).includes(value)
  );
}
