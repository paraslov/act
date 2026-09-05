/**
 * Day-id helpers. A "day id" is a `YYYY-MM-DD` string and all math is done in UTC
 * off that string, mirroring `dayRecord()`/`shiftId()` in the design prototype.
 *
 * Weekday and month names are never stored — they are derived from the date via
 * `Intl` using the active display locale.
 *
 * Timezone: v1 uses a single fixed zone (`DEFAULT_TIMEZONE`) to decide which
 * calendar day "today" is. The per-user timezone will be stored in
 * `user_settings` before the first real save; until then this default applies.
 */
export const DEFAULT_TIMEZONE = "UTC";

const MS_PER_DAY = 86_400_000;

/** Parses a `YYYY-MM-DD` id into a UTC `Date` at midnight. */
export function idToDate(id: string): Date {
  const [y, m, d] = id.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Formats a UTC `Date` back into a `YYYY-MM-DD` id. */
export function dateToId(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${p(date.getUTCMonth() + 1)}-${p(date.getUTCDate())}`;
}

/** Returns the id `delta` days from `id` (delta may be negative). */
export function shiftId(id: string, delta: number): string {
  const dt = idToDate(id);
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dateToId(dt);
}

/** Whole days from `b` to `a` (`a - b`); positive when `a` is later. */
export function daysBetween(a: string, b: string): number {
  return Math.round(
    (idToDate(a).getTime() - idToDate(b).getTime()) / MS_PER_DAY,
  );
}

/** The current calendar day id in the given timezone. */
export function todayId(timeZone: string = DEFAULT_TIMEZONE): string {
  // en-CA renders as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function part(id: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    ...options,
  }).format(idToDate(id));
}

/** "Tue 1 Sep" — short label used in lists. */
export function formatDayLabel(id: string, locale = "en"): string {
  if (locale === "ru") {
    return new Intl.DateTimeFormat(locale, {
      timeZone: "UTC",
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(idToDate(id));
  }
  const d = idToDate(id);
  return `${part(id, { weekday: "short" })} ${d.getUTCDate()} ${part(id, { month: "short" })}`;
}

/** "TUE 1 SEP" — uppercase, for the mono header. */
export function formatDayMono(id: string, locale = "en"): string {
  return formatDayLabel(id, locale).toLocaleUpperCase(locale);
}

/** "Tuesday, 1 September" — long title. */
export function formatDayTitle(id: string, locale = "en"): string {
  if (locale === "ru") {
    return new Intl.DateTimeFormat(locale, {
      timeZone: "UTC",
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(idToDate(id));
  }
  const d = idToDate(id);
  return `${part(id, { weekday: "long" })}, ${d.getUTCDate()} ${part(id, { month: "long" })}`;
}
