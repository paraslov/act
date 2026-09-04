/**
 * Preserves a PostgreSQL `date` as a calendar-day id.
 *
 * node-postgres parses `date` at midnight in the process's local timezone. Using
 * `toISOString()` would convert that midnight to UTC and can shift the visible
 * day backward or forward. Local date fields retain the date stored in Postgres.
 */
export function postgresDateValue(value: string | Date): string {
  if (typeof value === "string") return value;

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}
