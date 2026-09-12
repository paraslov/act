"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { BANDS } from "@/lib/act/constants";
import { cn } from "@/lib/utils";

/** One band's directional counts — the three segments the track stacks. */
export type ByTimeBand = {
  index: number;
  toward: number;
  away: number;
  mixed: number;
};

/** Segment fills match the direction card; tokens carry the dark-mode lift. */
const SEGMENT_FILL = {
  toward: "bg-toward",
  away: "bg-away",
  mixed: "bg-[oklch(0.72_0_0)]",
} as const;

/** Swatch glyph per direction — same shape set as the direction card. */
const LEGEND_SWATCH = {
  toward: "size-[9px] rounded-[2px] bg-toward",
  away: "size-[9px] rounded-full bg-away",
  mixed: "size-[9px] rounded-[2px] bg-[oklch(0.72_0_0)]",
} as const;

/**
 * "Entries by time of day" as eight stacked toward/away/mixed rows.
 * The Volume / Mix% toggle is the only interactive part: Volume scales every
 * row against the busiest band (when entries land), Mix% fills each row to its
 * own total (the proportions only). Every number is printed, so no tooltips.
 */
export function ByTimeChart({
  bands,
  toward,
  away,
  mixed,
  completed,
  peak,
}: {
  bands: ByTimeBand[];
  toward: number;
  away: number;
  mixed: number;
  completed: number;
  peak: { band: string; away: number; total: number } | null;
}) {
  const t = useTranslations("actV2.ui.observations");
  const locale = useLocale();
  const [mode, setMode] = useState<"volume" | "mix">("volume");

  const percent = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: 0,
      }),
    [locale],
  );
  const pct = (n: number, d: number) => percent.format(d > 0 ? n / d : 0);

  const dirTotal = (b: ByTimeBand) => b.toward + b.away + b.mixed;
  const maxTotal = Math.max(1, ...bands.map(dirTotal));
  const width = (n: number, bandTotal: number) => {
    if (bandTotal === 0) return "0%";
    return `${(n / (mode === "mix" ? bandTotal : maxTotal)) * 100}%`;
  };

  return (
    <section className="flex min-w-0 flex-1 basis-[400px] flex-col rounded-card border bg-card px-6 py-[22px]">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">{t("byTime.title")}</h2>
        <fieldset className="m-0 flex flex-none overflow-hidden rounded-[7px] border p-0">
          <legend className="sr-only">{t("byTime.title")}</legend>
          {(["volume", "mix"] as const).map((value, index) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "cursor-pointer px-[10px] py-[5px] font-mono text-[10px] tracking-[0.08em] uppercase",
                index > 0 && "border-l",
                mode === value
                  ? "bg-foreground text-background"
                  : "bg-card text-foreground/80",
              )}
            >
              {value === "volume" ? t("byTime.volume") : t("byTime.mix")}
            </button>
          ))}
        </fieldset>
      </div>
      <p className="mt-[5px] max-w-[48ch] text-[13px] text-muted-foreground">
        {t("byTime.help")}
      </p>

      <div className="mt-4 flex flex-col gap-[7px]">
        {bands.map((band) => {
          const bandTotal = dirTotal(band);
          const readout =
            bandTotal === 0
              ? "—"
              : mode === "mix"
                ? `${pct(band.toward, bandTotal)} / ${pct(band.away, bandTotal)}`
                : t("byTime.readoutVolume", {
                    total: bandTotal,
                    percent: pct(band.away, bandTotal),
                  });
          return (
            <div key={band.index} className="flex items-center gap-[10px]">
              <span className="flex-none basis-[44px] font-mono text-[11px] text-foreground/70">
                {BANDS[band.index]}
              </span>
              <span className="flex h-[14px] min-w-0 flex-1 overflow-hidden rounded bg-muted">
                {(["toward", "away", "mixed"] as const).map((dir) => (
                  <span
                    key={dir}
                    className={cn(
                      "block h-full transition-[width] duration-[180ms] ease-out",
                      SEGMENT_FILL[dir],
                    )}
                    style={{ width: width(band[dir], bandTotal) }}
                  />
                ))}
              </span>
              <span className="flex-none basis-[96px] text-right font-mono text-[11px] text-foreground/70 tabular-nums">
                {readout}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-[14px] border-t pt-[13px] text-[12px] text-foreground/80">
        <span className="flex items-center gap-[6px]">
          <span className={cn("block", LEGEND_SWATCH.toward)} />
          {t("byTime.legendToward", {
            count: toward,
            percent: pct(toward, completed),
          })}
        </span>
        <span className="flex items-center gap-[6px]">
          <span className={cn("block", LEGEND_SWATCH.away)} />
          {t("byTime.legendAway", {
            count: away,
            percent: pct(away, completed),
          })}
        </span>
        <span className="flex items-center gap-[6px]">
          <span className={cn("block", LEGEND_SWATCH.mixed)} />
          {t("byTime.legendMixed", {
            count: mixed,
            percent: pct(mixed, completed),
          })}
        </span>
      </div>
      <p className="mt-3 text-[13px] leading-[1.5] text-foreground/85">
        {peak
          ? t.rich("byTime.peak", {
              band: peak.band,
              count: peak.away,
              total: peak.total,
              percent: pct(peak.away, peak.total),
              b: (chunks) => (
                <strong className="font-semibold">{chunks}</strong>
              ),
            })
          : t("byTime.peakNone")}
      </p>
    </section>
  );
}
