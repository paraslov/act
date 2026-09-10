"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { formatDayLabel } from "@/lib/act/date";
import type { bossTestCells } from "@/lib/act/derive";
import { cn } from "@/lib/utils";

const kinds = [
  "toward",
  "away",
  "mixed",
  "unknown",
  "planned",
  "note",
] as const;
const glyphs = {
  toward: "■",
  away: "●",
  mixed: "╱",
  unknown: "○",
  planned: "·",
  note: "—",
};
function cellClass(kind: (typeof kinds)[number]) {
  return cn(
    "inline-flex size-[26px] shrink-0 items-center justify-center rounded-[5px] border text-sm",
    kind === "toward"
      ? "border-toward bg-toward text-white"
      : kind === "away"
        ? "border-away bg-away text-black"
        : "border-white/40 bg-white/5",
    (kind === "planned" || kind === "note") && "border-dashed",
  );
}
export function BossTestGrid({
  cells,
}: {
  cells: ReturnType<typeof bossTestCells>;
}) {
  const t = useTranslations("actV2.ui");
  const locale = useLocale();
  const router = useRouter();
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function label(kind: (typeof kinds)[number]) {
    return kind === "planned"
      ? t("behaviorStatus.planned")
      : kind === "note"
        ? t("behaviorStatus.not-described")
        : `${t("behaviorStatus.acted")} · ${t(`direction.${kind}.label`)}`;
  }
  return (
    <>
      <div className="my-4 flex flex-wrap gap-1.5">
        {cells.map((cell, index) => {
          const kind = cell.isLegacy
            ? "note"
            : cell.behaviorStatus === "acted"
              ? cell.dir
              : cell.behaviorStatus === "planned"
                ? "planned"
                : "note";
          const description = `${formatDayLabel(cell.day, locale)} · ${label(kind)}${cell.isLegacy ? ` · ${t("legacy.notice")}` : ""}`;
          return (
            <button
              key={cell.id}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              title={description}
              aria-label={description}
              tabIndex={index === Math.min(active, cells.length - 1) ? 0 : -1}
              onFocus={() => setActive(index)}
              className={cn(
                cellClass(kind),
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
              )}
              onClick={() =>
                router.push(
                  `/journal?${new URLSearchParams({ day: cell.day, ep: cell.id })}`,
                )
              }
              onKeyDown={(event) => {
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? cells.length - 1
                      : ["ArrowRight", "ArrowDown"].includes(event.key)
                        ? (index + 1) % cells.length
                        : ["ArrowLeft", "ArrowUp"].includes(event.key)
                          ? (index + cells.length - 1) % cells.length
                          : null;
                if (next !== null) {
                  event.preventDefault();
                  refs.current[next]?.focus();
                }
              }}
            >
              <span aria-hidden="true">{glyphs[kind]}</span>
            </button>
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-3 border-t border-white/15 pt-3 text-xs">
        {kinds.map((kind) => (
          <li key={kind} className="flex items-center gap-2">
            <span aria-hidden="true" className={cellClass(kind)}>
              {glyphs[kind]}
            </span>
            {label(kind)}
          </li>
        ))}
      </ul>
    </>
  );
}
