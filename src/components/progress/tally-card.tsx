"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** One tally row — label already translated, share as a 0–1 fraction. */
export type TallyRow = {
  id: string;
  label: string;
  count: number;
  percent: string;
  fraction: number;
};

type Tab = "states" | "skills" | "hooks";

/**
 * Status effects, Skills and Experience share one card and one segmented
 * switch — they were three near-identical bar cards. All three datasets are
 * already on the client, so switching tabs never refetches. Bars are
 * intentionally achromatic: toward/away colour is reserved for direction.
 */
export function TallyCard({
  states,
  skills,
  hooks,
}: {
  states: TallyRow[];
  skills: TallyRow[];
  hooks: TallyRow[];
}) {
  const t = useTranslations("actV2.ui");
  const [tab, setTab] = useState<Tab>("hooks");

  const config: Record<
    Tab,
    { rows: TallyRow[]; title: string; help: string; footnote: string }
  > = {
    states: {
      rows: states,
      title: t("rpg.statusEffects.label"),
      help: t("rpg.statusEffects.help"),
      footnote: t("observations.multipleSelectionHelp"),
    },
    skills: {
      rows: skills,
      title: t("observations.skills"),
      help: t("observations.multipleSelectionHelp"),
      footnote: t("observations.unrecordedSkills"),
    },
    hooks: {
      rows: hooks,
      title: t("observations.tally.hooksTitle"),
      help: t("observations.tally.hooksHelp"),
      footnote: t("observations.tally.hooksFootnote"),
    },
  };
  const active = config[tab];

  return (
    <section className="rounded-card border bg-card px-6 py-[22px]">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">{active.title}</h2>
        <fieldset className="m-0 flex flex-none overflow-hidden rounded-[7px] border p-0">
          <legend className="sr-only">{active.title}</legend>
          {(["hooks", "states", "skills"] as const).map((value, index) => (
            <button
              key={value}
              type="button"
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                "cursor-pointer px-[11px] py-[6px] text-[12px]",
                index > 0 && "border-l",
                tab === value
                  ? "bg-foreground text-background"
                  : "bg-card text-foreground/80",
              )}
            >
              {t(`observations.tally.${value}`)}
            </button>
          ))}
        </fieldset>
      </div>
      <p className="mt-[5px] max-w-[70ch] text-[13px] text-muted-foreground">
        {active.help}
      </p>

      <ul className="mt-4 flex flex-col gap-[9px]">
        {active.rows.map((row) => {
          const empty = row.count === 0;
          return (
            <li
              key={row.id}
              className="flex items-center gap-[10px] text-[13px]"
            >
              <span
                className={cn(
                  "flex-none basis-[176px] truncate",
                  empty && "text-muted-foreground",
                )}
                title={row.label}
              >
                {row.label}
              </span>
              <span className="h-[7px] min-w-0 flex-1 overflow-hidden rounded bg-muted">
                {!empty && (
                  <span
                    className="block h-full rounded bg-foreground/60"
                    style={{ width: `${Math.max(row.fraction * 100, 3)}%` }}
                  />
                )}
              </span>
              <span className="flex-none basis-[78px] text-right font-mono text-[11px] text-foreground/70 tabular-nums">
                {empty ? "—" : `${row.count} · ${row.percent}`}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-[14px] text-[12px] leading-[1.5] text-muted-foreground">
        {active.footnote}
      </p>
    </section>
  );
}
