"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import type { AxisKey } from "@/lib/act/constants";
import { cn } from "@/lib/utils";

/** Per-axis reflection summary — plain data derived from `radarComparison`. */
export type ReflectionAxis = {
  axis: AxisKey;
  recent: number | null;
  previous: number | null;
  delta: number | null;
  recentN: number;
  previousN: number;
};

/**
 * The right-hand column of "Your reflection responses": one row per axis with
 * value, change, and a bar, expanding to the question and sample sizes on
 * demand. An accordion — one axis open at a time; down is never framed as a
 * failure and never coloured red.
 */
export function ReflectionAxes({ axes }: { axes: ReflectionAxis[] }) {
  const t = useTranslations("actV2.ui.observations");
  const checks = useTranslations("actV2.checks");
  const locale = useLocale();
  const [openAxis, setOpenAxis] = useState<AxisKey | null>(null);

  const value = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    [locale],
  );
  const fmt = (n: number | null) => (n === null ? "—" : value.format(n));
  const sample = (n: number) => t("sampleSize", { count: n });

  return (
    <ul className="flex min-w-0 flex-1 basis-[340px] flex-col">
      {axes.map((axis) => {
        const open = openAxis === axis.axis;
        const panelId = `axis-panel-${axis.axis}`;
        // "±" flat, U+2212 for a decrease — a change in reading, never a grade.
        const sign =
          axis.delta === null || axis.delta === 0
            ? "±"
            : axis.delta > 0
              ? "+"
              : "−";
        const deltaText =
          axis.delta === null
            ? t("axes.deltaNone")
            : t("axes.delta", {
                delta: `${sign}${value.format(Math.abs(axis.delta))}`,
              });
        const deltaColor =
          axis.delta === null || axis.delta === 0
            ? "text-muted-foreground"
            : axis.delta > 0
              ? "text-toward"
              : "text-away";
        return (
          <li key={axis.axis} className="border-t border-border/60 py-[11px]">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() =>
                setOpenAxis((current) =>
                  current === axis.axis ? null : axis.axis,
                )
              }
              className="flex w-full cursor-pointer items-baseline gap-[10px] text-left"
            >
              <span className="min-w-0 flex-1 text-[14px]">
                {checks(`${axis.axis}.title`)}
              </span>
              <span className="flex-none font-mono text-[12px] tabular-nums">
                {fmt(axis.recent)}
              </span>
              <span
                className={cn(
                  "flex-none basis-[92px] text-right font-mono text-[11px] tabular-nums",
                  deltaColor,
                )}
              >
                {deltaText}
              </span>
              <span className="flex-none font-mono text-[10px] text-muted-foreground">
                {open ? "▴" : "▾"}
              </span>
            </button>
            {axis.recent === null ? (
              <div className="mt-[7px] rounded-input border border-dashed p-3 font-mono text-[10px] text-muted-foreground uppercase">
                {t("noResponses")}
              </div>
            ) : (
              <div className="mt-[7px] h-[5px] overflow-hidden rounded bg-muted">
                <div
                  className="h-full rounded bg-toward/55"
                  style={{ width: `${(axis.recent / 2) * 100}%` }}
                />
              </div>
            )}
            {open && (
              <div
                id={panelId}
                className="mt-[10px] flex flex-col gap-[6px] border-l-2 border-border pl-3"
              >
                <p className="text-[13px] leading-[1.55] text-foreground/85">
                  {checks(`${axis.axis}.question`)}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {t("axes.detail", {
                    recent: fmt(axis.recent),
                    recentN: sample(axis.recentN),
                    previous: fmt(axis.previous),
                    previousN: sample(axis.previousN),
                  })}
                </p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
