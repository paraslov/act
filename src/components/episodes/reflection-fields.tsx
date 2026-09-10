"use client";

import { useTranslations } from "next-intl";
import { AXES } from "@/lib/act/constants";
import type { BehaviorStatus, Checks, EpisodeDir } from "@/lib/act/types";
import { cn } from "@/lib/utils";

export function ReflectionFields({
  checks,
  onChange,
}: {
  checks: Checks;
  onChange: (checks: Checks) => void;
}) {
  const t = useTranslations("actV2");
  return (
    <section className="space-y-4 border-t pt-4">
      <p className="text-sm text-muted-foreground">
        {t("ui.reflection.intro")}
      </p>
      {AXES.map(({ id }) => (
        <fieldset key={id} className="space-y-2">
          <legend className="font-mono text-xs uppercase">
            {t(`checks.${id}.title`)}
          </legend>
          <p className="text-sm">{t(`checks.${id}.question`)}</p>
          <div className="flex flex-wrap gap-2">
            {([0, 1, 2, null] as const).map((score) => (
              <label
                key={String(score)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-button border p-2 text-xs",
                  score === null && "border-dashed text-muted-foreground",
                  (checks[id] ?? null) === score &&
                    "bg-muted border-foreground/50",
                )}
              >
                <input
                  type="radio"
                  name={`check-${id}`}
                  checked={(checks[id] ?? null) === score}
                  onChange={() => onChange({ ...checks, [id]: score })}
                />
                {t(
                  score === null
                    ? "ui.reflection.unrated"
                    : `ui.reflection.score${score}`,
                )}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {t(`checks.${id}.help`)}
          </p>
        </fieldset>
      ))}
      <p className="text-xs text-muted-foreground">
        {t("ui.reflection.notValidated")}
      </p>
    </section>
  );
}

export function ActionInterpretation({
  dir,
  behaviorStatus,
  onDirection,
  onBehavior,
}: {
  dir: EpisodeDir;
  behaviorStatus: BehaviorStatus;
  onDirection: (dir: EpisodeDir) => void;
  onBehavior: (status: BehaviorStatus) => void;
}) {
  const t = useTranslations("actV2.ui");
  return (
    <>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">
          {t("episode.action")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {(["acted", "planned", "not-described"] as const).map((status) => (
            <label
              key={status}
              className={cn(
                "flex items-center gap-2 rounded-button border p-2 text-xs",
                status === "not-described" && "border-dashed",
                behaviorStatus === status && "bg-muted",
              )}
            >
              <input
                type="radio"
                name="behavior-status"
                checked={behaviorStatus === status}
                onChange={() => onBehavior(status)}
              />
              {t(`behaviorStatus.${status}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          {t("episode.direction")}
        </legend>
        <p className="text-xs text-muted-foreground">
          {t("episode.directionHelp")}
        </p>
        {(["toward", "away", "mixed", "unknown"] as const).map((direction) => (
          <label
            key={direction}
            className={cn(
              "flex items-center gap-3 rounded-input border p-3",
              dir === direction && "border-foreground/50 bg-muted",
              direction === "unknown" && "border-dashed",
            )}
          >
            <input
              type="radio"
              name="episode-direction"
              checked={dir === direction}
              onChange={() => onDirection(direction)}
            />
            <span className="min-w-0 flex-1 text-sm">
              <strong>{t(`direction.${direction}.label`)}</strong>
              <span className="mt-1 block text-xs text-muted-foreground">
                {t(`direction.${direction}.description`)}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
    </>
  );
}
