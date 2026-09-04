"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";
import { NewEpisodeTrigger } from "@/components/episodes/new-episode-trigger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AXES,
  BANDS,
  SKILLS,
  type SkillId,
  STATES,
  type StateId,
  skillLabel,
  stateLabel,
} from "@/lib/act/constants";
import { formatDayLabel } from "@/lib/act/date";
import { checksTotal, filterEpisodes } from "@/lib/act/derive";
import type { Episode, EpisodeDir } from "@/lib/act/types";
import { cn } from "@/lib/utils";

type DirectionFilter = EpisodeDir | "all";

type ViewFilters = {
  dir: DirectionFilter;
  effect: StateId | "all";
  skill: SkillId | "all";
  band: (typeof BANDS)[number] | "all";
  q: string;
};

const directionValues = ["all", "toward", "away"] as const;

function isDirection(value: string | null): value is DirectionFilter {
  return directionValues.some((item) => item === value);
}

function isState(value: string | null): value is StateId {
  return STATES.some((item) => item.id === value);
}

function isSkill(value: string | null): value is SkillId {
  return SKILLS.some((item) => item.id === value);
}

function isBand(value: string | null): value is (typeof BANDS)[number] {
  return BANDS.some((item) => item === value);
}

function readFilters(params: URLSearchParams): ViewFilters {
  const dir = params.get("dir");
  const effect = params.get("effect");
  const skill = params.get("skill");
  const band = params.get("band");

  return {
    dir: isDirection(dir) ? dir : "all",
    effect: isState(effect) ? effect : "all",
    skill: isSkill(skill) ? skill : "all",
    band: isBand(band) ? band : "all",
    q: params.get("q") ?? "",
  };
}

function filtersQuery(filters: ViewFilters): string {
  const params = new URLSearchParams();
  if (filters.dir !== "all") params.set("dir", filters.dir);
  if (filters.effect !== "all") params.set("effect", filters.effect);
  if (filters.skill !== "all") params.set("skill", filters.skill);
  if (filters.band !== "all") params.set("band", filters.band);
  if (filters.q) params.set("q", filters.q);
  return params.toString();
}

function DirectionPicker({
  value,
  onChange,
}: {
  value: DirectionFilter;
  onChange: (value: DirectionFilter) => void;
}) {
  const t = useTranslations("episodes.filters");

  return (
    <fieldset className="flex gap-1 rounded-[9px] bg-muted/80 p-[3px]">
      <legend className="sr-only">{t("directionLabel")}</legend>
      {directionValues.map((direction) => (
        <button
          key={direction}
          type="button"
          aria-pressed={value === direction}
          onClick={() => onChange(direction)}
          className={cn(
            "cursor-pointer rounded-[7px] px-3 py-1.5 text-[13px] font-medium text-muted-foreground",
            value === direction &&
              "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)]",
          )}
        >
          {t(direction)}
        </button>
      ))}
    </fieldset>
  );
}

function FilterBar({
  filters,
  onChange,
  pending,
}: {
  filters: ViewFilters;
  onChange: (next: ViewFilters) => void;
  pending: boolean;
}) {
  const t = useTranslations("episodes.filters");

  function patch(next: Partial<ViewFilters>) {
    onChange({ ...filters, ...next });
  }

  return (
    <section
      aria-label={t("label")}
      aria-busy={pending}
      className="mb-4 flex flex-wrap items-center gap-3.5 rounded-card border bg-card px-4 py-3.5"
    >
      <DirectionPicker value={filters.dir} onChange={(dir) => patch({ dir })} />

      <Select
        value={filters.effect}
        onValueChange={(effect) =>
          patch({ effect: effect as ViewFilters["effect"] })
        }
      >
        <SelectTrigger
          size="sm"
          aria-label={t("statusLabel")}
          className="rounded-button bg-card text-[13px] shadow-none dark:bg-card"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("anyStatus")}</SelectItem>
          {STATES.map((state) => (
            <SelectItem key={state.id} value={state.id}>
              {state.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.skill}
        onValueChange={(skill) =>
          patch({ skill: skill as ViewFilters["skill"] })
        }
      >
        <SelectTrigger
          size="sm"
          aria-label={t("skillLabel")}
          className="rounded-button bg-card text-[13px] shadow-none dark:bg-card"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("anySkill")}</SelectItem>
          {SKILLS.map((skill) => (
            <SelectItem key={skill.id} value={skill.id}>
              {skill.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.band}
        onValueChange={(band) => patch({ band: band as ViewFilters["band"] })}
      >
        <SelectTrigger
          size="sm"
          aria-label={t("timeLabel")}
          className="rounded-button bg-card text-[13px] shadow-none dark:bg-card"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("anyTime")}</SelectItem>
          {BANDS.map((band) => (
            <SelectItem key={band} value={band}>
              {band}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        value={filters.q}
        onChange={(event) => patch({ q: event.target.value })}
        aria-label={t("searchLabel")}
        placeholder={t("searchPlaceholder")}
        className="h-[34px] min-w-[180px] flex-1 rounded-button bg-card text-[13px] shadow-none focus-visible:border-toward focus-visible:ring-toward/20 dark:bg-card"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange({
            dir: "all",
            effect: "all",
            skill: "all",
            band: "all",
            q: "",
          })
        }
        className="rounded-button bg-card text-[13px] font-normal text-muted-foreground shadow-none dark:bg-card"
      >
        {t("clear")}
      </Button>
    </section>
  );
}

function EpisodeCard({ episode }: { episode: Episode }) {
  const t = useTranslations("episodes.card");
  const directionLabel = episode.dir === "toward" ? t("toward") : t("away");
  const moveLabel = episode.dir === "toward" ? t("towardMove") : t("awayMove");

  return (
    <article className="rounded-card border bg-card px-5 py-[18px] text-card-foreground">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-[9px]">
          <span className="font-mono text-[11px] text-muted-foreground">
            {formatDayLabel(episode.day)}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground/75">
            {BANDS[episode.band]}
          </span>
          <span
            className={cn(
              "rounded-[5px] px-[7px] py-[3px] font-mono text-[10px] tracking-[0.12em] uppercase",
              episode.dir === "toward"
                ? "bg-toward-tint text-toward"
                : "bg-away-tint text-away",
            )}
          >
            {directionLabel}
          </span>
        </div>
        <span className="font-mono text-[11.5px] text-muted-foreground">
          {t("score", { score: checksTotal(episode.checks) })}
        </span>
      </div>

      <p className="font-serif text-[19px] leading-[1.35] tracking-[-0.01em]">
        {episode.hook}
      </p>
      {episode.situation ? (
        <p className="mt-[3px] mb-3 text-[13px] text-muted-foreground">
          {episode.situation}
        </p>
      ) : (
        <div className="mb-3" />
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        <span className="rounded-chip border border-away-border bg-away-tint px-[9px] py-1 text-xs text-away">
          {stateLabel(episode.state)}
        </span>
        <span className="rounded-chip border border-toward-border bg-toward-tint px-[9px] py-1 text-xs text-toward">
          {skillLabel(episode.skill)}
        </span>
        <span className="rounded-chip border bg-muted/70 px-[9px] py-1 text-xs text-foreground/75">
          {episode.value}
        </span>
      </div>

      <div className="mb-2.5 flex items-center gap-[5px]">
        {AXES.map((axis) => {
          const value = episode.checks[axis.id] ?? 0;
          return (
            <span
              key={axis.id}
              title={axis.label}
              className="block h-[5px] flex-1 overflow-hidden rounded-full bg-muted"
            >
              <span
                className={cn(
                  "block h-full rounded-full",
                  episode.dir === "toward" ? "bg-toward" : "bg-away",
                )}
                style={{ width: `${(value / 2) * 100}%` }}
              />
            </span>
          );
        })}
      </div>

      <p className="text-[13.5px] leading-[1.55] text-foreground/85">
        <span
          className={cn(
            "mr-2 font-mono text-[10px] tracking-[0.14em] uppercase",
            episode.dir === "toward" ? "text-toward" : "text-away",
          )}
        >
          {moveLabel}
        </span>
        {episode.move}
      </p>
      <p className="mt-1.5 text-[13px] leading-[1.55] text-muted-foreground">
        <span className="mr-2 font-mono text-[10px] tracking-[0.14em] uppercase">
          {t("workable")}
        </span>
        {episode.workable}
      </p>
    </article>
  );
}

export function EpisodesView({ episodes }: { episodes: Episode[] }) {
  const t = useTranslations("episodes");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [filters, setFilters] = useState(() =>
    readFilters(new URLSearchParams(queryString)),
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setFilters(readFilters(new URLSearchParams(queryString)));
  }, [queryString]);

  const filtered = useMemo(() => {
    const band = filters.band === "all" ? "all" : BANDS.indexOf(filters.band);
    return filterEpisodes(episodes, {
      dir: filters.dir,
      state: filters.effect,
      skill: filters.skill,
      band,
      text: filters.q,
    });
  }, [episodes, filters]);

  function changeFilters(next: ViewFilters) {
    setFilters(next);
    const query = filtersQuery(next);
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }

  return (
    <div className="max-w-[860px]">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-serif text-[34px] leading-[1.1] tracking-[-0.02em]">
          {t("title")}
        </h1>
        <div className="flex items-center gap-3.5">
          <span className="font-mono text-[11.5px] tracking-[0.08em] text-muted-foreground uppercase">
            {t("shown", { shown: filtered.length, total: episodes.length })}
          </span>
          <NewEpisodeTrigger className="h-9 rounded-[9px] px-[15px] text-[13.5px]">
            {t("newEpisode")}
          </NewEpisodeTrigger>
        </div>
      </header>
      <p className="mt-2 mb-5 max-w-[66ch] text-[14.5px] text-foreground/70">
        {t("intro")}
      </p>

      <FilterBar
        filters={filters}
        onChange={changeFilters}
        pending={isPending}
      />

      <div className="flex flex-col gap-3">
        {filtered.length ? (
          filtered.map((episode) => (
            <EpisodeCard key={episode.id} episode={episode} />
          ))
        ) : (
          <div className="rounded-card border border-dashed bg-card px-6 py-[34px] text-center">
            <p className="mb-1 font-serif text-xl">{t("emptyTitle")}</p>
            <p className="text-[13.5px] text-muted-foreground">
              {t("emptyDescription")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
