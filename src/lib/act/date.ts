/**
 * Day-id helpers. A "day id" is a `YYYY-MM-DD` string and all math is done in UTC
 * off that string, mirroring `dayRecord()`/`shiftId()` in the design prototype.
 *
 * Weekday and month names are never stored — they are derived from the date via
 * `Intl` using the active display locale.
 *
 * Timezone: the calendar day and time band an entry belongs to are resolved in
 * the user's own zone (stored in `user_settings.settings.timezone`). `UTC` is the
 * fallback when no zone is set. Whatever zone was in force is frozen onto the row
 * at write time (`event_timezone`), so changing it later never moves history.
 */
export const DEFAULT_TIMEZONE = "UTC";

const MS_PER_DAY = 86_400_000;

/** True when `value` is an IANA zone this runtime accepts; guards user input. */
export function isTimeZone(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** A valid zone unchanged, otherwise the UTC fallback. */
export function normalizeTimeZone(value: string | null | undefined): string {
  return isTimeZone(value) ? value : DEFAULT_TIMEZONE;
}

/** The `YYYY-MM-DD` calendar day that `date` falls on in `timeZone`. */
export function zonedDayId(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  // en-CA renders as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** The three-hour band index (0–7) that `date` falls in, in `timeZone`. */
export function zonedBand(date: Date, timeZone = DEFAULT_TIMEZONE): number {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(date),
  );
  return Math.min(7, Math.floor(hour / 3));
}

/** The current three-hour band index in `timeZone`. */
export function bandForNow(timeZone = DEFAULT_TIMEZONE): number {
  return zonedBand(new Date(), timeZone);
}

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
  return zonedDayId(new Date(), timeZone);
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
