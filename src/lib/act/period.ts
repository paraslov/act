/** The Observations period windows. `all` is the full recorded span. */
export const PERIOD_VALUES = ["all", "30", "90"] as const;
export type PeriodValue = (typeof PERIOD_VALUES)[number];

export function isPeriodValue(value: string | null): value is PeriodValue {
  return PERIOD_VALUES.some((item) => item === value);
}

/** Days back each bounded window spans, inclusive of today. */
export const PERIOD_WINDOW_DAYS: Record<Exclude<PeriodValue, "all">, number> = {
  "30": 30,
  "90": 90,
};
