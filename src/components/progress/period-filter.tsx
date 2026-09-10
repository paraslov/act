"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { PERIOD_VALUES, type PeriodValue } from "@/lib/act/period";
import { cn } from "@/lib/utils";

/** One explicit window that scopes every Observations block to the same range. */
export function PeriodFilter({ value }: { value: PeriodValue }) {
  const t = useTranslations("actV2.ui.observations.periods");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function select(next: PeriodValue) {
    const params = new URLSearchParams(searchParams);
    if (next === "all") params.delete("period");
    else params.set("period", next);
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }

  return (
    <fieldset
      aria-busy={pending}
      className="mb-4 flex flex-wrap items-center gap-1 rounded-[9px] bg-muted/80 p-[3px]"
    >
      <legend className="sr-only">{t("label")}</legend>
      {PERIOD_VALUES.map((period) => (
        <button
          key={period}
          type="button"
          aria-pressed={value === period}
          onClick={() => select(period)}
          className={cn(
            "cursor-pointer rounded-[7px] px-3 py-1.5 text-[13px] font-medium text-muted-foreground",
            value === period &&
              "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)]",
          )}
        >
          {t(period)}
        </button>
      ))}
    </fieldset>
  );
}
