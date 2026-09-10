"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useNewEpisodeDialog } from "@/components/episodes/new-episode-dialog";
import { AXES } from "@/lib/act/constants";
import { isCompletedAction } from "@/lib/act/derive";
import type { Episode } from "@/lib/act/types";
import { SKILL_CARD_IDS, STATE_CARD_IDS } from "@/lib/reference/library";
import { cn } from "@/lib/utils";

export function EpisodeBadge({ episode }: { episode: Episode }) {
  const t = useTranslations("actV2.ui");
  return (
    <span
      className={cn(
        "rounded-chip border px-2 py-1 font-mono text-[10px] uppercase",
        !isCompletedAction(episode) && "border-dashed",
        isCompletedAction(episode) &&
          episode.dir === "toward" &&
          "bg-toward-tint text-toward",
        isCompletedAction(episode) &&
          episode.dir === "away" &&
          "bg-away-tint text-away",
      )}
    >
      {t(`behaviorStatus.${episode.behaviorStatus}`)} ·{" "}
      {t(`direction.${episode.dir}.label`)}
    </span>
  );
}

export function LegacyNotice({ episode }: { episode: Episode }) {
  const t = useTranslations("actV2.ui.legacy");
  const { clarifyEpisode } = useNewEpisodeDialog();
  if (episode.schemaVersion !== 1) return null;
  return (
    <div className="my-3 space-y-2 rounded-input border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
      <p>{t("notice")}</p>
      <p>{t("excluded")}</p>
      <button
        type="button"
        onClick={() => clarifyEpisode(episode)}
        className="font-mono text-xs underline underline-offset-4"
      >
        {t("clarify")}
      </button>
    </div>
  );
}

export function EpisodeDetails({ episode }: { episode: Episode }) {
  const t = useTranslations("actV2");
  const act = useTranslations("act");
  const original = episode.legacySnapshot;
  const historicalChecks =
    original?.checks && typeof original.checks === "object"
      ? (original.checks as Record<string, unknown>)
      : episode.checks;
  return (
    <div className="space-y-3">
      <EpisodeBadge episode={episode} />
      <LegacyNotice episode={episode} />
      {episode.hook && <p className="font-serif text-[19px]">{episode.hook}</p>}
      {episode.situation && (
        <p className="text-sm text-muted-foreground">{episode.situation}</p>
      )}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {episode.hookType && (
          <span className="rounded-chip border p-2">
            {t(`ui.experienceTypes.${episode.hookType}`)}
          </span>
        )}
        {episode.states
          .filter((id) => id !== "none")
          .map((id) => (
            <span key={id} className="rounded-chip border border-dashed p-2">
              {id === "unknown"
                ? t("ui.selection.unknown")
                : id === "none-noticed"
                  ? t("ui.selection.noneNoticed")
                  : t(
                      `cards.${STATE_CARD_IDS[id as keyof typeof STATE_CARD_IDS]}.title`,
                    )}
            </span>
          ))}
        {episode.skills
          .filter((id) => id !== "none")
          .map((id) => (
            <span key={id} className="rounded-chip border border-dashed p-2">
              {id === "unknown"
                ? t("ui.selection.unknown")
                : id === "no-skill"
                  ? t("ui.selection.noSkill")
                  : t(
                      `cards.${SKILL_CARD_IDS[id as keyof typeof SKILL_CARD_IDS]}.title`,
                    )}
            </span>
          ))}
      </div>
      {episode.move ? (
        <p className="text-sm">
          <span className="mr-2 text-muted-foreground">
            {t("ui.episode.action")}
          </span>
          {episode.move}
        </p>
      ) : (
        <p className="rounded-input border border-dashed p-3 text-xs text-muted-foreground">
          {t("ui.episode.noAction")}
        </p>
      )}
      {episode.value && episode.value !== episode.valueSnapshot?.title && (
        <p className="text-sm">{episode.value}</p>
      )}
      {episode.valueSnapshot && (
        <p className="rounded-input border p-2 text-sm">
          {episode.valueSnapshot.title}
        </p>
      )}
      {episode.workable && (
        <p className="text-sm text-muted-foreground">
          {t("ui.legacy.reflection")}: {episode.workable}
        </p>
      )}
      {(
        [
          ["intendedFunction", "ui.episode.intendedFunction"],
          ["immediateOutcome", "ui.episode.immediate"],
          ["laterConsequences", "ui.episode.later"],
          ["interpretation", "ui.episode.direction"],
          ["nextExperiment", "ui.episode.next"],
        ] as const
      ).map(([key, label]) =>
        episode[key] ? (
          <p key={key} className="text-sm">
            <span className="mr-2 text-muted-foreground">{t(label)}</span>
            {episode[key]}
            {key === "laterConsequences" && (
              <span className="ml-2 rounded-chip border px-2 py-0.5 font-mono text-[10px] uppercase">
                {t(`ui.consequenceStatus.${episode.consequenceStatus}`)}
              </span>
            )}
          </p>
        ) : null,
      )}
      <div className="flex flex-wrap gap-2">
        {AXES.map(({ id }) => {
          const value = episode.schemaVersion === 1 ? null : episode.checks[id];
          return (
            <div
              key={id}
              className={cn(
                "min-w-0 grow basis-[130px] rounded-input border p-2 text-xs",
                value == null && "border-dashed",
              )}
            >
              <p className="font-mono uppercase">{t(`checks.${id}.title`)}</p>
              <p>
                {value == null
                  ? `— · ${t("ui.reflection.unrated")}`
                  : t(`ui.reflection.score${value}`)}
              </p>
            </div>
          );
        })}
      </div>
      {(episode.schemaVersion === 1 || original) && (
        <details className="rounded-input border border-dashed p-3 text-xs text-muted-foreground">
          <summary>{t("ui.legacy.reflection")}</summary>
          <p className="my-2">{t("ui.legacy.notice")}</p>
          {(original?.state ?? episode.state) === "none" && (
            <p>
              {t("ui.rpg.statusEffects.label")}: {act("states.none.label")}
            </p>
          )}
          {(original?.skill ?? episode.skill) === "none" && (
            <p>
              {t("ui.observations.skills")}: {act("skills.none.label")}
            </p>
          )}
          {original && (
            <>
              {(original.dir === "toward" || original.dir === "away") && (
                <p>{t(`ui.direction.${original.dir}.label`)}</p>
              )}
              {typeof original.move === "string" && <p>{original.move}</p>}
            </>
          )}
          {AXES.map(({ id }) => {
            const value = historicalChecks[id];
            return (
              <p key={id}>
                {t(`checks.${id}.title`)}:{" "}
                {value === 0 || value === 1 || value === 2 ? value : "—"}
              </p>
            );
          })}
        </details>
      )}
      {episode.schemaVersion === 2 && (
        <Link
          href={`/episodes/${episode.id}/explore`}
          className="inline-block font-mono text-xs underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          {t("ui.common.edit")}
        </Link>
      )}
    </div>
  );
}
