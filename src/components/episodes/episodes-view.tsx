"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { EpisodeDetails } from "@/components/episodes/episode-details";
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
  BANDS,
  DOMAINS,
  type DomainId,
  HOOK_TYPES,
  type HookType,
  SKILLS,
  type SkillId,
  STATES,
  type StateId,
} from "@/lib/act/constants";
import { formatDayLabel } from "@/lib/act/date";
import { filterEpisodes } from "@/lib/act/derive";
import type { Episode, EpisodeDir } from "@/lib/act/types";
import { cn } from "@/lib/utils";

type DirectionFilter = EpisodeDir | "all";

type ViewFilters = {
  dir: DirectionFilter;
  hookType: HookType | "all";
  effect: StateId | "all";
  skill: SkillId | "all";
  band: (typeof BANDS)[number] | "all";
  domain: DomainId | "all";
  q: string;
};

const directionValues = ["all", "toward", "away", "mixed", "unknown"] as const;

/**
 * How long typing rests before the search term is written to the URL. The list
 * itself filters on every keystroke — this only paces the navigation behind it.
 */
const searchWriteDelay = 300;

function isDirection(value: string | null): value is DirectionFilter {
  return directionValues.some((item) => item === value);
}

function isState(value: string | null): value is StateId {
  return value === "none" || STATES.some((item) => item.id === value);
}

function isSkill(value: string | null): value is SkillId {
  return value === "none" || SKILLS.some((item) => item.id === value);
}

function isBand(value: string | null): value is (typeof BANDS)[number] {
  return BANDS.some((item) => item === value);
}

function isHookType(value: string | null): value is HookType {
  return HOOK_TYPES.some((item) => item.id === value);
}

function isDomain(value: string | null): value is DomainId {
  return DOMAINS.some((item) => item.id === value);
}

function readFilters(params: URLSearchParams): ViewFilters {
  const dir = params.get("dir");
  const hookType = params.get("hookType");
  const effect = params.get("effect");
  const skill = params.get("skill");
  const band = params.get("band");
  const domain = params.get("domain");

  return {
    dir: isDirection(dir) ? dir : "all",
    hookType: isHookType(hookType) ? hookType : "all",
    effect: isState(effect) ? effect : "all",
    skill: isSkill(skill) ? skill : "all",
    band: isBand(band) ? band : "all",
    domain: isDomain(domain) ? domain : "all",
    q: params.get("q") ?? "",
  };
}

function filtersQuery(filters: ViewFilters): string {
  const params = new URLSearchParams();
  if (filters.dir !== "all") params.set("dir", filters.dir);
  if (filters.hookType !== "all") params.set("hookType", filters.hookType);
  if (filters.effect !== "all") params.set("effect", filters.effect);
  if (filters.skill !== "all") params.set("skill", filters.skill);
  if (filters.band !== "all") params.set("band", filters.band);
  if (filters.domain !== "all") params.set("domain", filters.domain);
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
  const directionCopy = useTranslations("actV2.ui.direction");

  return (
    <fieldset className="flex flex-wrap gap-1 rounded-[9px] bg-muted/80 p-[3px]">
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
          {direction === "all" ? t("all") : directionCopy(`${direction}.label`)}
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
  /** `defer` asks for a paced URL write — typing sets it, every other control does not. */
  onChange: (next: ViewFilters, defer?: boolean) => void;
  pending: boolean;
}) {
  const t = useTranslations("episodes.filters");
  const act = useTranslations("act");

  function patch(next: Partial<ViewFilters>, defer?: boolean) {
    onChange({ ...filters, ...next }, defer);
  }

  return (
    <section
      aria-label={t("label")}
      aria-busy={pending}
      className="mb-4 flex flex-wrap items-center gap-3.5 rounded-card border bg-card px-4 py-3.5"
    >
      <DirectionPicker value={filters.dir} onChange={(dir) => patch({ dir })} />

      <Select
        value={filters.hookType}
        onValueChange={(hookType) =>
          patch({ hookType: hookType as ViewFilters["hookType"] })
        }
      >
        <SelectTrigger
          size="sm"
          aria-label={t("hookTypeLabel")}
          className="rounded-button bg-card text-[13px] shadow-none dark:bg-card"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("anyHookType")}</SelectItem>
          {HOOK_TYPES.map((type) => (
            <SelectItem key={type.id} value={type.id}>
              {act(`hookTypes.${type.id}.label`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
          <SelectItem value="none">{act("states.none.label")}</SelectItem>
          {STATES.map((state) => (
            <SelectItem key={state.id} value={state.id}>
              {act(`states.${state.id}.label`)}
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
          <SelectItem value="none">{act("skills.none.label")}</SelectItem>
          {SKILLS.map((skill) => (
            <SelectItem key={skill.id} value={skill.id}>
              {act(`skills.${skill.id}.label`)}
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

      <Select
        value={filters.domain}
        onValueChange={(domain) =>
          patch({ domain: domain as ViewFilters["domain"] })
        }
      >
        <SelectTrigger
          size="sm"
          aria-label={t("domainLabel")}
          className="rounded-button bg-card text-[13px] shadow-none dark:bg-card"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("anyDomain")}</SelectItem>
          {DOMAINS.map((domain) => (
            <SelectItem key={domain.id} value={domain.id}>
              {act(`domains.${domain.id}.label`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        value={filters.q}
        onChange={(event) => patch({ q: event.target.value }, true)}
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
            hookType: "all",
            effect: "all",
            skill: "all",
            band: "all",
            domain: "all",
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
  const locale = useLocale();
  return (
    <article
      id={`episode-${episode.id}`}
      className="rounded-card border bg-card px-5 py-[18px] text-card-foreground"
    >
      <p className="mb-3 font-mono text-xs text-muted-foreground">
        {formatDayLabel(episode.day, locale)} · {BANDS[episode.band]}
      </p>
      <EpisodeDetails episode={episode} />
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
  const deferredWrite = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // A queued keystroke is newer than the URL it has not been written to yet,
    // so only adopt the query string when nothing of ours is in flight.
    if (deferredWrite.current) return;
    setFilters(readFilters(new URLSearchParams(queryString)));
  }, [queryString]);

  useEffect(
    () => () => {
      if (deferredWrite.current) clearTimeout(deferredWrite.current);
    },
    [],
  );

  const filtered = useMemo(() => {
    const band = filters.band === "all" ? "all" : BANDS.indexOf(filters.band);
    return filterEpisodes(episodes, {
      dir: filters.dir,
      hookType: filters.hookType,
      state: filters.effect,
      skill: filters.skill,
      band,
      domain: filters.domain,
      text: filters.q,
    });
  }, [episodes, filters]);

  const writeFilters = useCallback(
    (next: ViewFilters) => {
      const query = filtersQuery(next);
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router],
  );

  function changeFilters(next: ViewFilters, defer?: boolean) {
    setFilters(next);
    // The list re-filters from `next` immediately either way. Only the URL
    // write waits, so a typed word costs one navigation instead of one a key.
    if (deferredWrite.current) clearTimeout(deferredWrite.current);
    if (!defer) {
      deferredWrite.current = null;
      writeFilters(next);
      return;
    }
    deferredWrite.current = setTimeout(() => {
      deferredWrite.current = null;
      writeFilters(next);
    }, searchWriteDelay);
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
