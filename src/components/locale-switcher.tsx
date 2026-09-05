"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { setLocaleAction } from "@/actions/settings";
import { type Locale, locales } from "@/i18n/config";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("locale");
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function changeLocale(nextLocale: Locale) {
    setFailed(false);
    startTransition(async () => {
      try {
        await setLocaleAction(nextLocale);
        router.refresh();
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <div className="relative shrink-0">
      <label className="sr-only" htmlFor={id}>
        {t("label")}
      </label>
      <select
        id={id}
        value={locale}
        disabled={pending}
        onChange={(event) => changeLocale(event.target.value as Locale)}
        aria-describedby={failed ? `${id}-error` : undefined}
        className="h-9 cursor-pointer rounded-button border bg-background px-2 font-mono text-[10px] uppercase outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
      >
        {locales.map((item) => (
          <option key={item} value={item}>
            {t(item)}
          </option>
        ))}
      </select>
      {failed ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="absolute right-0 bottom-full z-10 mb-2 w-52 rounded-button border bg-background p-2 text-xs text-destructive shadow-sm"
        >
          {t("saveError")}
        </p>
      ) : null}
    </div>
  );
}
