"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState, useTransition } from "react";
import { setTimezoneAction } from "@/actions/settings";

/** The IANA zones this runtime knows, with a stable fallback list. */
function supportedZones(): string[] {
  const supported = (
    Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf;
  try {
    if (supported) return supported("timeZone");
  } catch {
    // Fall through to a minimal set below.
  }
  return ["UTC"];
}

export function TimezoneSwitcher({ timeZone }: { timeZone: string }) {
  const t = useTranslations("timezone");
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  // The full zone list is browser-provided, so populate it only after mount:
  // Node's and Chrome's `supportedValuesOf` can differ, which would desync
  // hydration. Until then the control shows just the current zone.
  const [zones, setZones] = useState<string[]>([timeZone]);
  useEffect(() => {
    // Some runtimes omit UTC from the list, so it is always offered as the
    // default; the stored zone is added too when the list does not carry it.
    let list = supportedZones();
    if (!list.includes("UTC")) list = ["UTC", ...list];
    setZones(list.includes(timeZone) ? list : [timeZone, ...list]);
  }, [timeZone]);

  function changeZone(next: string) {
    setFailed(false);
    startTransition(async () => {
      try {
        await setTimezoneAction(next);
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
        value={timeZone}
        disabled={pending}
        onChange={(event) => changeZone(event.target.value)}
        aria-describedby={failed ? `${id}-error` : undefined}
        className="h-9 max-w-[150px] cursor-pointer rounded-button border bg-background px-2 font-mono text-[10px] uppercase outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
      >
        {zones.map((zone) => (
          <option key={zone} value={zone}>
            {zone}
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
