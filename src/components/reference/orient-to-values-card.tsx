"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { DOMAINS } from "@/lib/act/constants";
import type { VaultLayer } from "@/lib/reference/vault";

/** Terms of the distinctions strip, in the order the skill teaches them. */
const DISTINCTIONS = ["domain", "value", "goal", "action"] as const;

const rowClass =
  "flex flex-wrap border-t border-border px-[13px] py-[11px] first:border-t-0";
const microLabelClass =
  "mb-0.5 block font-mono text-[9px] tracking-[0.1em] text-muted-foreground uppercase";
const noteClass =
  "mt-[9px] max-w-[72ch] text-[12.5px] leading-[1.55] text-muted-foreground";

/**
 * The structured blocks that only the "Orient to values" Vault card carries:
 * the domain/value/goal/action distinctions, the four-domain map, and the
 * worked example. Every block is self-labelling wrapping cells rather than a
 * table, so it reflows to phone width without horizontal scroll.
 */
export function OrientToValuesBlocks({
  layer,
  slot,
}: {
  layer: VaultLayer;
  slot: "before" | "after";
}) {
  const t = useTranslations("reference.vault.orientToValues");
  const act = useTranslations("act.domains");

  if (layer === "practice" && slot === "after") {
    return (
      <>
        <div className="mt-3 overflow-hidden rounded-[10px] border">
          {DISTINCTIONS.map((term) => (
            <div key={term} className={`${rowClass} gap-x-4 gap-y-1`}>
              <span className="basis-[118px] font-mono text-[10px] tracking-[0.12em] uppercase">
                {t(`distinctions.${term}.term`)}
              </span>
              <span className="min-w-0 grow basis-[240px] text-[13px] leading-[1.55] text-foreground/80">
                {t(`distinctions.${term}.text`)}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-3.5 mb-2 font-mono text-[9.5px] tracking-[0.14em] text-muted-foreground uppercase">
          {t("mapLabel")}
        </p>
        <div className="overflow-hidden rounded-[10px] border">
          {DOMAINS.map((domain) => (
            <div key={domain.id} className={`${rowClass} gap-2.5`}>
              <span className="min-w-0 grow basis-[150px] font-mono text-[10px] tracking-[0.1em] uppercase">
                {act(`${domain.id}.label`)}
              </span>
              <span className="min-w-0 grow basis-[200px]">
                <span className={microLabelClass}>{t("valueSoundsLike")}</span>
                <span className="block text-[13px] leading-[1.5] text-foreground/80">
                  {t(`map.${domain.id}.value`)}
                </span>
              </span>
              <span className="min-w-0 grow basis-[200px]">
                <span className={microLabelClass}>{t("goalSoundsLike")}</span>
                <span className="block text-[13px] leading-[1.5] text-muted-foreground">
                  {t(`map.${domain.id}.goal`)}
                </span>
              </span>
            </div>
          ))}
        </div>
        <p className={noteClass}>{t("mapNote")}</p>
      </>
    );
  }

  if (layer === "example" && slot === "before") {
    return (
      <div className="mb-[9px] flex flex-col gap-2 rounded-[10px] border bg-muted/40 px-3.5 py-[13px]">
        {DISTINCTIONS.map((term) => (
          <div key={term} className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="basis-[74px] pt-0.5 font-mono text-[9.5px] tracking-[0.12em] text-muted-foreground uppercase">
              {t(`distinctions.${term}.term`)}
            </span>
            <span className="min-w-0 grow basis-[220px] text-[13.5px] leading-[1.5] text-foreground/80">
              {t(`example.${term}`)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (layer === "deep" && slot === "after") {
    return (
      <p className="mt-2.5 max-w-[72ch] text-[12.5px] leading-[1.6] text-muted-foreground">
        {t.rich("source", {
          a: (chunks) => (
            <a
              className="underline underline-offset-2 hover:text-foreground"
              href="https://contextualscience.org/act"
              rel="noopener noreferrer"
              target="_blank"
            >
              {chunks}
            </a>
          ),
          em: (chunks) => <em>{chunks}</em>,
        })}
      </p>
    );
  }

  return null;
}

/** Closing line of the card: where values actually live in the app. */
export function OrientToValuesFooter() {
  const t = useTranslations("reference.vault.orientToValues");

  return (
    <p className="max-w-[72ch] border-t border-border/60 pt-3.5 text-[12.5px] leading-[1.6] text-muted-foreground">
      {t.rich("footer", {
        values: (chunks) => (
          <Link
            className="underline underline-offset-2 hover:text-foreground"
            href="/values"
          >
            {chunks}
          </Link>
        ),
      })}
    </p>
  );
}
