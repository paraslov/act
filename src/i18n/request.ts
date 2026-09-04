import { getRequestConfig } from "next-intl/server";
import { defaultLocale, type Locale } from "@/i18n/config";
import { resolveLocale } from "@/i18n/locale";
import en from "@/i18n/messages/en.json";

type Messages = typeof en;

/**
 * Loads the message catalog for a locale, deep-merged over EN so any key not yet
 * translated falls back to the English source of truth.
 */
async function loadMessages(locale: Locale): Promise<Messages> {
  if (locale === defaultLocale) {
    return en;
  }
  const translated = (await import(`@/i18n/messages/${locale}.json`)).default;
  return deepMerge(en, translated) as Messages;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Recursively overlays `override` onto `base`, ignoring empty-string stubs. */
function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === "" || value === undefined || value === null) {
      continue; // keep the EN fallback for stubbed keys
    }
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return {
    locale,
    messages: await loadMessages(locale),
  };
});
