"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useTransition } from "react";
import {
  EpisodeBadge,
  EpisodeDetails,
} from "@/components/episodes/episode-details";
import { NewEpisodeTrigger } from "@/components/episodes/new-episode-trigger";
import { BANDS, DOMAINS } from "@/lib/act/constants";
import {
  daysBetween,
  formatDayLabel,
  formatDayTitle,
  shiftId,
} from "@/lib/act/date";
import {
  bandShape,
  dayCounts,
  hasMorningEntry,
  isCompletedAction,
  topStatusEffect,
  towardAwaySplit,
} from "@/lib/act/derive";
import type {
  DayEntry,
  DayEvening,
  DayMorning,
  Episode,
  PersonalValueSnapshot,
} from "@/lib/act/types";
import { cn } from "@/lib/utils";

type JournalRange = "7" | "30" | "all";

type JournalViewProps = {
  today: string;
  selectedDay: string;
  selectedEpisodeId: string | null;
  range: JournalRange;
  episodes: Episode[];
  dayEntries: DayEntry[];
};

function hasText(value: unknown): boolean {
  return typeof value === "string" && Boolean(value.trim());
}

function hasMorning(entry: DayEntry | undefined): boolean {
  return hasMorningEntry(entry?.morning);
}

function hasEvening(entry: DayEntry | undefined): boolean {
  return Boolean(entry && Object.values(entry.evening).some(hasText));
}

function Marker({
  episode,
  selected,
  onSelect,
  title,
}: {
  episode: Episode;
  selected: boolean;
  onSelect: () => void;
  title: string;
}) {
  const size = 12;

  return (
    <button
      type="button"
      title={title}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "block shrink-0 cursor-pointer border-[1.5px] p-0 transition-[transform,background-color] hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        episode.dir === "toward" ? "rounded-[3px]" : "rounded-full",
        isCompletedAction(episode) && episode.dir === "toward"
          ? "bg-toward"
          : isCompletedAction(episode) && episode.dir === "away"
            ? "bg-away"
            : "border-dashed bg-muted",
        selected ? "border-foreground" : "border-transparent",
      )}
      style={{ width: size, height: size }}
    />
  );
}

function DayStrip({
  episodes,
  selectedEpisodeId,
  onSelect,
}: {
  episodes: Episode[];
  selectedEpisodeId: string | null;
  onSelect: (episode: Episode) => void;
}) {
  const t = useTranslations("journal");
  const v2 = useTranslations("actV2.ui");

  return (
    <div className="relative">
      <div className="absolute top-[47px] right-0 left-0 h-px bg-border" />
      <div className="relative flex h-24 items-stretch">
        {BANDS.map((band, bandIndex) => {
          const inBand = episodes.filter(
            (episode) => episode.band === bandIndex,
          );
          const holdsSelection = inBand.some(
            (episode) => episode.id === selectedEpisodeId,
          );
          const marker = (episode: Episode) => (
            <Marker
              key={episode.id}
              episode={episode}
              selected={episode.id === selectedEpisodeId}
              onSelect={() => onSelect(episode)}
              title={t("markerTitle", {
                band,
                direction: `${v2(`behaviorStatus.${episode.behaviorStatus}`)} · ${v2(`direction.${episode.dir}.label`)}`,
                hook: episode.hook,
              })}
            />
          );

          return (
            <div
              key={band}
              className="flex min-w-0 flex-1 flex-col items-center"
            >
              <div className="flex h-10 shrink-0 items-end justify-center gap-0.5">
                {inBand
                  .filter(
                    (episode) =>
                      isCompletedAction(episode) && episode.dir === "toward",
                  )
                  .map(marker)}
              </div>
              <div className="flex h-[15px] shrink-0 items-center">
                <span
                  className={cn(
                    "block size-[9px] rounded-full border-2 bg-card",
                    holdsSelection ? "border-foreground/75" : "border-border",
                  )}
                />
              </div>
              <div className="flex h-[41px] shrink-0 items-start justify-center gap-0.5 pt-px">
                {inBand
                  .filter(
                    (episode) =>
                      !isCompletedAction(episode) || episode.dir !== "toward",
                  )
                  .map(marker)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-0.5 flex">
        {BANDS.map((band, bandIndex) => {
          const count = episodes.filter(
            (episode) => episode.band === bandIndex,
          ).length;
          return (
            <span
              key={band}
              className={cn(
                "min-w-0 flex-1 text-center font-mono text-[9.5px] tracking-[0.06em]",
                count ? "text-foreground/70" : "text-muted-foreground/55",
              )}
            >
              {band}
              <span className="block text-[9px] text-muted-foreground">
                {count > 1 ? `×${count}` : "\u00a0"}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function SelectedEpisodeCard({ episode }: { episode: Episode }) {
  return (
    <div className="mt-4 rounded-input border p-4">
      <EpisodeDetails episode={episode} />
    </div>
  );
}

function NotesCard({
  title,
  value,
  rows,
}: {
  title: string;
  /** The value as it was saved that day — the snapshot, never the live record. */
  value?: PersonalValueSnapshot | null;
  rows: { key: string; text: string | undefined; accent?: string }[];
}) {
  const t = useTranslations("journal");
  const domainLabels = useTranslations("act.domains");

  return (
    <section className="rounded-card border bg-card px-[22px] py-5">
      <h3 className="mb-3 text-sm font-semibold tracking-[-0.01em]">{title}</h3>
      <div className="flex flex-col gap-3">
        {value ? (
          <div>
            <p className="mb-[3px] font-mono text-[9.5px] tracking-[0.16em] text-muted-foreground uppercase">
              {t("morning.value")}
            </p>
            <p className="font-serif text-[16px] leading-[1.35] tracking-[-0.01em] text-pretty">
              {value.title}
            </p>
            <div className="mt-[5px] flex flex-wrap gap-[5px]">
              {DOMAINS.filter((domain) =>
                value.domains.includes(domain.id),
              ).map((domain) => (
                <span
                  key={domain.id}
                  className="rounded-chip border px-[7px] py-px font-mono text-[9px] tracking-[0.06em] text-muted-foreground uppercase"
                >
                  {domainLabels(`${domain.id}.label`)}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {rows.map((row) => {
          const written = hasText(row.text);
          return (
            <div key={row.key}>
              <p
                className={cn(
                  "mb-[3px] font-mono text-[9.5px] tracking-[0.16em] uppercase",
                  row.accent ?? "text-muted-foreground",
                )}
              >
                {row.key}
              </p>
              <p
                className={cn(
                  "text-[13.5px] leading-[1.55]",
                  written ? "text-foreground/85" : "text-muted-foreground/60",
                )}
              >
                {written ? row.text : t("notWritten")}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function JournalView({
  today,
  selectedDay,
  selectedEpisodeId,
  range,
  episodes,
  dayEntries,
}: JournalViewProps) {
  const t = useTranslations("journal");
  const act = useTranslations("act");
  const v2 = useTranslations("actV2.ui");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const entriesByDay = useMemo(
    () => new Map(dayEntries.map((entry) => [entry.day, entry])),
    [dayEntries],
  );
  const episodesByDay = useMemo(() => {
    const result = new Map<string, Episode[]>();
    for (const episode of episodes) {
      const dayEpisodes = result.get(episode.day) ?? [];
      dayEpisodes.push(episode);
      result.set(episode.day, dayEpisodes);
    }
    return result;
  }, [episodes]);

  const oldestDay = useMemo(() => {
    const days = [
      ...episodes.map((episode) => episode.day),
      ...dayEntries.map((entry) => entry.day),
    ];
    return days.reduce((oldest, day) => (day < oldest ? day : oldest), today);
  }, [dayEntries, episodes, today]);
  const rangeLength =
    range === "all"
      ? Math.max(1, daysBetween(today, oldestDay) + 1)
      : Number(range);
  const dayIds = Array.from({ length: rangeLength }, (_, index) =>
    shiftId(today, -index),
  );
  if (selectedDay < dayIds[dayIds.length - 1]) dayIds.push(selectedDay);

  const weekDays = Array.from({ length: 7 }, (_, index) =>
    shiftId(today, -index),
  );
  const weekEpisodes = episodes.filter((episode) =>
    weekDays.includes(episode.day),
  );
  const weekToward = weekEpisodes.filter(
    (episode) => isCompletedAction(episode) && episode.dir === "toward",
  ).length;
  const dayEpisodes = episodesByDay.get(selectedDay) ?? [];
  const selectedEpisode =
    dayEpisodes.find((episode) => episode.id === selectedEpisodeId) ?? null;
  const selectedEntry = entriesByDay.get(selectedDay);
  const selectedCounts = dayCounts(episodes, selectedDay);

  function navigate(next: {
    day?: string;
    ep?: string | null;
    range?: JournalRange;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("day", next.day ?? selectedDay);
    if (next.ep === null) params.delete("ep");
    else if (next.ep) params.set("ep", next.ep);
    else if (selectedEpisodeId) params.set("ep", selectedEpisodeId);
    if (next.range) {
      if (next.range === "7") params.delete("range");
      else params.set("range", next.range);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function selectDay(day: string) {
    navigate({ day, ep: episodesByDay.get(day)?.[0]?.id ?? null });
  }

  const morning: DayMorning = selectedEntry?.morning ?? {};
  const evening: DayEvening = selectedEntry?.evening ?? {};

  return (
    <div aria-busy={isPending}>
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-serif text-[34px] leading-[1.1] tracking-[-0.02em]">
          {t("title")}
        </h1>
        <span className="font-mono text-[11.5px] tracking-[0.08em] text-muted-foreground uppercase">
          {t("eyebrow")}
        </span>
      </header>
      <p className="mt-2 mb-[22px] max-w-[66ch] text-[14.5px] text-foreground/70">
        {t("intro")}
      </p>

      <div className="grid items-start gap-5 min-[1041px]:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-2.5">
          <section className="rounded-card border bg-card p-3">
            <fieldset className="mb-[9px] flex gap-[3px] rounded-[9px] bg-muted/80 p-[3px]">
              <legend className="sr-only">{t("rangeLabel")}</legend>
              {(["7", "30", "all"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={range === value}
                  onClick={() => navigate({ range: value })}
                  className={cn(
                    "flex-1 cursor-pointer rounded-[7px] py-1.5 text-[12.5px] font-medium text-muted-foreground",
                    range === value &&
                      "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)]",
                  )}
                >
                  {t(`range${value === "all" ? "All" : value}`)}
                </button>
              ))}
            </fieldset>
            <label className="block">
              <span className="mb-1.5 block font-mono text-[9.5px] tracking-[0.14em] text-muted-foreground uppercase">
                {t("jump")}
              </span>
              <input
                type="date"
                value={selectedDay}
                max={today}
                onChange={(event) => selectDay(event.target.value)}
                className="w-full rounded-button border bg-page px-[9px] py-[7px] font-mono text-[13px] text-foreground outline-none focus:border-toward focus:bg-card"
              />
            </label>
          </section>

          <nav
            aria-label={t("dayListLabel")}
            className="flex max-h-[560px] flex-col gap-[3px] overflow-auto rounded-card border bg-card p-3"
          >
            {dayIds.map((day) => {
              const dayEpisodes = episodesByDay.get(day) ?? [];
              const entry = entriesByDay.get(day);
              const toward = dayEpisodes.filter(
                (episode) =>
                  isCompletedAction(episode) && episode.dir === "toward",
              ).length;
              const away = towardAwaySplit(dayEpisodes).away;
              const hasNotes = hasMorning(entry) || hasEvening(entry);
              const empty = dayEpisodes.length === 0 && !hasNotes;
              return (
                <button
                  key={day}
                  type="button"
                  aria-current={day === selectedDay ? "date" : undefined}
                  onClick={() => selectDay(day)}
                  className={cn(
                    "block w-full cursor-pointer rounded-[9px] px-[11px] py-2.5 text-left hover:bg-muted/70",
                    day === selectedDay && "bg-muted",
                    empty && "text-muted-foreground/60",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[13.5px] font-medium">
                      {formatDayLabel(day, locale)}
                    </span>
                    <span className="flex gap-[3px]" aria-hidden="true">
                      {dayEpisodes.slice(0, 6).map((episode) => (
                        <span
                          key={episode.id}
                          className={cn(
                            "size-1.5 rounded-[2px]",
                            isCompletedAction(episode) &&
                              episode.dir === "toward"
                              ? "bg-toward"
                              : isCompletedAction(episode) &&
                                  episode.dir === "away"
                                ? "bg-away"
                                : "border border-dashed bg-muted",
                          )}
                        />
                      ))}
                    </span>
                  </span>
                  <span className="mt-[3px] block font-mono text-[10px] tracking-[0.08em] text-muted-foreground">
                    {dayEpisodes.length
                      ? t("dayMeta", { toward, away })
                      : hasNotes
                        ? t("notesOnly")
                        : t("empty")}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <section className="overflow-hidden rounded-card border bg-card px-6 pt-5 pb-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
                {t("lastSeven")}
              </h2>
              <span className="font-mono text-[10.5px] tracking-[0.08em] text-muted-foreground uppercase">
                {weekEpisodes.length
                  ? t("weekSummary", {
                      toward: weekToward,
                      away: towardAwaySplit(weekEpisodes).away,
                    })
                  : t("nothingLogged")}
              </span>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[620px]">
                <div className="grid grid-cols-[96px_68px_1fr_120px_64px] items-center gap-x-3 border-b pb-[7px] font-mono text-[9.5px] tracking-[0.14em] text-muted-foreground uppercase">
                  <span>{t("columns.day")}</span>
                  <span>{t("columns.direction")}</span>
                  <span>{t("columns.shape")}</span>
                  <span>{t("columns.effect")}</span>
                  <span className="text-right">{t("columns.logged")}</span>
                </div>
                {weekDays.map((day) => {
                  const dayEpisodes = episodesByDay.get(day) ?? [];
                  const entry = entriesByDay.get(day);
                  const toward = dayEpisodes.filter(
                    (episode) =>
                      isCompletedAction(episode) && episode.dir === "toward",
                  ).length;
                  const away = towardAwaySplit(dayEpisodes).away;
                  const morningLogged = hasMorning(entry);
                  const eveningLogged = hasEvening(entry);
                  const hasData =
                    dayEpisodes.length > 0 || morningLogged || eveningLogged;
                  const topEffect = topStatusEffect(dayEpisodes);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => selectDay(day)}
                      className={cn(
                        "grid w-full cursor-pointer grid-cols-[96px_68px_1fr_120px_64px] items-center gap-x-3 rounded-md border-b border-border/45 px-1 py-2 text-left hover:bg-muted/70",
                        day === selectedDay && "bg-muted/80",
                        !hasData && "text-muted-foreground/55",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[13px]",
                          day === today && "font-semibold",
                        )}
                      >
                        {formatDayLabel(day, locale)}
                      </span>
                      <span className="font-mono text-xs">
                        {dayEpisodes.length
                          ? t("counts", { toward, away })
                          : "—"}
                      </span>
                      <span className="flex h-3.5 items-center gap-[3px]">
                        {bandShape(dayEpisodes).map((cell) => (
                          <span
                            key={cell.index}
                            className={cn(
                              "flex-1 rounded-sm",
                              cell.count === 0
                                ? "bg-muted"
                                : cell.hasAway
                                  ? "bg-away"
                                  : cell.hasToward
                                    ? "bg-toward"
                                    : "bg-muted-foreground/40",
                            )}
                            style={{
                              height: cell.count
                                ? Math.min(14, 6 + cell.count * 4)
                                : 2,
                            }}
                          />
                        ))}
                      </span>
                      <span className="truncate text-[11.5px] text-foreground/65">
                        {topEffect ? act(`states.${topEffect}.label`) : "—"}
                      </span>
                      <span className="text-right font-mono text-[10.5px] tracking-[0.1em] text-muted-foreground">
                        {morningLogged ? "M" : "·"} {eveningLogged ? "E" : "·"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-card border bg-card px-6 py-[22px]">
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-serif text-[26px] tracking-[-0.015em]">
                {formatDayTitle(selectedDay, locale)}
              </h2>
              <span className="font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                {t("daySummary", {
                  toward: selectedCounts.toward,
                  away: selectedCounts.away,
                })}
              </span>
            </div>
            <p className="mb-[18px] text-[13px] text-muted-foreground">
              {t("stripHint")} {v2("journal.markersHelp")}
            </p>
            <DayStrip
              episodes={dayEpisodes}
              selectedEpisodeId={selectedEpisodeId}
              onSelect={(episode) =>
                navigate({ day: selectedDay, ep: episode.id })
              }
            />
            {selectedEpisode ? (
              <SelectedEpisodeCard episode={selectedEpisode} />
            ) : null}
          </section>

          <div className="grid items-start gap-4 min-[700px]:grid-cols-2">
            <NotesCard
              title={t("morning.title")}
              value={morning.valueSnapshot}
              rows={[
                {
                  key: t("morning.open"),
                  text: morning.open,
                  accent: "text-toward",
                },
                {
                  key: t("morning.aware"),
                  text: morning.aware,
                  accent: "text-aware",
                },
                {
                  key: t("morning.engaged"),
                  text: morning.engaged,
                  accent: "text-away",
                },
                { key: t("morning.toward"), text: morning.toward },
              ]}
            />
            <NotesCard
              title={t("evening.title")}
              rows={[
                { key: t("evening.hook"), text: evening.hook },
                { key: t("evening.away"), text: evening.away },
                { key: t("evening.flex"), text: evening.flex },
                { key: t("evening.next"), text: evening.next },
              ]}
            />
          </div>

          <section className="rounded-card border bg-card px-6 py-5">
            <div className="mb-3.5 flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold tracking-[-0.01em]">
                {t("episodesTitle")}
              </h3>
              <span className="font-mono text-[10.5px] text-muted-foreground">
                {t("episodeCount", { count: dayEpisodes.length })}
              </span>
            </div>
            {dayEpisodes.length ? (
              <div className="flex flex-col gap-2.5">
                {dayEpisodes.map((episode) => (
                  <button
                    key={episode.id}
                    type="button"
                    onClick={() =>
                      navigate({ day: selectedDay, ep: episode.id })
                    }
                    className={cn(
                      "block w-full cursor-pointer rounded-[11px] border px-[15px] py-[13px] text-left hover:border-foreground/25",
                      episode.id === selectedEpisodeId
                        ? "border-foreground/50 bg-muted"
                        : "bg-card",
                    )}
                  >
                    <span className="mb-1 flex flex-wrap items-center gap-[9px]">
                      <span className="font-mono text-[10.5px] text-muted-foreground">
                        {BANDS[episode.band]}
                      </span>
                      <EpisodeBadge episode={episode} />
                    </span>
                    <span className="block font-serif text-[17px] leading-[1.35]">
                      {episode.hook}
                    </span>
                    <span className="mt-[3px] block text-[13px] leading-[1.5] text-foreground/70">
                      {episode.move || t("notWritten")}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[13.5px] text-muted-foreground">
                {v2("journal.emptyDay")}
              </p>
            )}
            <NewEpisodeTrigger
              day={selectedDay}
              variant="outline"
              className="mt-3.5 h-[34px] rounded-button px-3.5 text-[13.5px]"
            >
              {t("addEpisode")}
            </NewEpisodeTrigger>
          </section>
        </div>
      </div>
    </div>
  );
}
