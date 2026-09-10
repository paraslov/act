/**
 * Pure derivations over a list of episodes. Everything shown in Journal and
 * Progress is computed here at read time — there are no stored aggregates or
 * counters. All functions are side-effect free and order-independent unless noted.
 */
import {
  AXES,
  type AxisKey,
  BANDS,
  HOOK_TYPES,
  type HookType,
  SKILLS,
  type SkillId,
  STATES,
  type StateId,
} from "@/lib/act/constants";
import { daysBetween, todayId } from "@/lib/act/date";
import type {
  DayMorning,
  Episode,
  EpisodeActivity,
  EpisodeFilters,
  EpisodePeriod,
} from "@/lib/act/types";

/**
 * True when a morning half holds anything at all. A linked value counts on its
 * own, and its snapshot is an object — the text check skips non-strings rather
 * than calling `.trim()` on them.
 */
export function hasMorningEntry(morning: DayMorning | undefined): boolean {
  if (!morning) return false;
  if (morning.valueId || morning.valueSnapshot) return true;
  return Object.values(morning).some(
    (field) => typeof field === "string" && Boolean(field.trim()),
  );
}

/** Lowercases and strips diacritics for case/diacritic-insensitive matching. */
export function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Only explicitly completed, clarified entries contribute to action counts. */
export function isCompletedAction(
  episode: Pick<EpisodeActivity, "behaviorStatus" | "schemaVersion">,
): boolean {
  return episode.schemaVersion === 2 && episode.behaviorStatus === "acted";
}

export type DirCounts = {
  toward: number;
  away: number;
  mixed: number;
  unknown: number;
  planned: number;
  notDescribed: number;
  completed: number;
  total: number;
};
export function dayCounts(episodes: Episode[], day: string): DirCounts {
  return splitCounts(episodes.filter((e) => e.day === day));
}
export function towardAwaySplit(episodes: Episode[]): DirCounts {
  return splitCounts(episodes);
}
export function splitCounts(list: Episode[]): DirCounts {
  const counts: DirCounts = {
    toward: 0,
    away: 0,
    mixed: 0,
    unknown: 0,
    planned: 0,
    notDescribed: 0,
    completed: 0,
    total: list.length,
  };
  for (const episode of list) {
    if (isCompletedAction(episode)) {
      counts[episode.dir]++;
      counts.completed++;
    } else if (
      episode.schemaVersion === 2 &&
      episode.behaviorStatus === "planned"
    )
      counts.planned++;
    else counts.notDescribed++;
  }
  return counts;
}

export function inPeriod(
  episode: Pick<EpisodeActivity, "day">,
  period: EpisodePeriod,
): boolean {
  return (
    (!period.start || episode.day >= period.start) &&
    (!period.end || episode.day <= period.end)
  );
}
export function returningToPractice(
  episodes: readonly EpisodeActivity[],
  period: EpisodePeriod,
): number {
  return new Set(episodes.filter((e) => inPeriod(e, period)).map((e) => e.day))
    .size;
}

export function bossTestCells(episodes: Episode[], period: EpisodePeriod) {
  return episodes
    .filter((e) => inPeriod(e, period))
    .sort((a, b) => -byNewest(a, b))
    .map(({ id, day, behaviorStatus, dir, schemaVersion }) => ({
      id,
      day,
      behaviorStatus,
      dir,
      isLegacy: schemaVersion === 1,
    }));
}

// --- Filtering (Episodes view) --------------------------------------------

/** Whether an episode passes the given filters. */
export function matchesFilters(
  episode: Episode,
  filters: EpisodeFilters,
): boolean {
  if (filters.dir && filters.dir !== "all" && episode.dir !== filters.dir) {
    return false;
  }
  if (
    filters.hookType &&
    filters.hookType !== "all" &&
    episode.hookType !== filters.hookType
  ) {
    return false;
  }
  if (
    filters.state &&
    filters.state !== "all" &&
    !episode.states.includes(filters.state)
  ) {
    return false;
  }
  if (
    filters.skill &&
    filters.skill !== "all" &&
    !episode.skills.includes(filters.skill)
  ) {
    return false;
  }
  if (
    filters.band !== undefined &&
    filters.band !== "all" &&
    episode.band !== filters.band
  ) {
    return false;
  }
  if (filters.domain && filters.domain !== "all") {
    // Domains come from the snapshot taken when the value was linked, so an
    // edited or archived value never moves an old episode between areas. An
    // episode with no linked value belongs to no area and drops out here.
    if (!episode.valueSnapshot?.domains.includes(filters.domain)) return false;
  }
  const query = normalizeText(filters.text).trim();
  if (query) {
    // The snapshot title is searched too: a linked value whose episode also has
    // its own wording never reaches the `value` column.
    const haystacks = [
      episode.hook,
      episode.move,
      episode.value,
      episode.valueSnapshot?.title,
    ];
    if (!haystacks.some((field) => normalizeText(field).includes(query))) {
      return false;
    }
  }
  return true;
}

export function filterEpisodes(
  episodes: Episode[],
  filters: EpisodeFilters,
): Episode[] {
  return episodes.filter((e) => matchesFilters(e, filters));
}

// --- Band shape / breakdown -----------------------------------------------

export type BandShapeCell = { index: number; count: number; hasAway: boolean };

/** Per-band presence for a set of episodes (the day-strip / week-row shape). */
export function bandShape(episodes: Episode[]): BandShapeCell[] {
  return BANDS.map((_, index) => {
    const inBand = episodes.filter((e) => e.band === index);
    return {
      index,
      count: inBand.length,
      hasAway: inBand.some((e) => isCompletedAction(e) && e.dir === "away"),
    };
  });
}

export type BandBreakdownCell = { index: number } & DirCounts;

/** Per-band toward/away/total for all eight bands (Progress by-band chart). */
export function bandBreakdown(episodes: Episode[]): BandBreakdownCell[] {
  return BANDS.map((_, index) => ({
    index,
    ...splitCounts(episodes.filter((e) => e.band === index)),
  }));
}

// --- Tallies ---------------------------------------------------------------

function share(count: number, total: number): number {
  return total > 0 ? count / total : 0;
}

/** The most frequent status-effect id in a set, or null if empty. */
export function topStatusEffect(episodes: Episode[]): StateId | null {
  let best: StateId | null = null;
  let bestCount = 0;
  for (const state of STATES) {
    const count = episodes.filter((e) => e.states.includes(state.id)).length;
    if (count > bestCount) {
      best = state.id;
      bestCount = count;
    }
  }
  return best;
}

export type StatusTally = {
  id: StateId;
  label: string;
  description: string;
  count: number;
  share: number;
};

/** All six status effects with counts, sorted most-frequent first. */
export function statusEffectTallies(episodes: Episode[]): StatusTally[] {
  const total = episodes.length;
  return STATES.map((state) => {
    const count = episodes.filter((e) => e.states.includes(state.id)).length;
    return {
      id: state.id,
      label: state.label,
      description: state.description,
      count,
      share: share(count, total),
    };
  }).sort((a, b) => b.count - a.count);
}

export type SkillTally = {
  id: SkillId;
  label: string;
  count: number;
  share: number;
};

/** All six skills with counts, kept in canonical order (fixed bar order). */
export function skillTallies(episodes: Episode[]): SkillTally[] {
  const total = episodes.length;
  return SKILLS.map((skill) => {
    const count = episodes.filter((e) => e.skills.includes(skill.id)).length;
    return {
      id: skill.id,
      label: skill.label,
      count,
      share: share(count, total),
    };
  });
}

/** Named skills only; absence is descriptive, never a recommendation. */
export function skillsNamed(episodes: Episode[]): SkillTally[] {
  return skillTallies(episodes).filter((skill) => skill.count > 0);
}

export type HookTypeTally = {
  id: HookType;
  count: number;
  share: number;
};

/** All four recorded hook types, including unused types, most-frequent first. */
export function hookTypeTallies(episodes: Episode[]): HookTypeTally[] {
  return HOOK_TYPES.map((type) => {
    const count = episodes.filter(
      (episode) => episode.hookType === type.id,
    ).length;
    return { id: type.id, count, share: share(count, episodes.length) };
  }).sort((a, b) => b.count - a.count);
}

export type AxisAverage = { mean: number | null; n: number };
/** Explicit answers only; legacy zeroes cannot be distinguished from defaults. */
export function axisAverages(
  episodes: Episode[],
): Record<AxisKey, AxisAverage> {
  const result = {} as Record<AxisKey, AxisAverage>;
  for (const { id } of AXES) {
    const answers = episodes
      .filter((e) => e.schemaVersion === 2)
      .map((e) => e.checks[id])
      .filter((value): value is 0 | 1 | 2 => value != null);
    result[id] = {
      mean: answers.length
        ? answers.reduce<number>((a, b) => a + b, 0) / answers.length
        : null,
      n: answers.length,
    };
  }
  return result;
}

/** Newest-first order by day then creation time. */
function byNewest(a: Episode, b: Episode): number {
  if (a.day !== b.day) return a.day < b.day ? 1 : -1;
  return a.createdAt < b.createdAt
    ? 1
    : a.createdAt > b.createdAt
      ? -1
      : b.id.localeCompare(a.id);
}

export type RadarAxis = {
  axis: AxisKey;
  label: string;
  recent: number | null;
  previous: number | null;
  delta: number | null;
  recentN: number;
  previousN: number;
  recentRange: EpisodePeriod | null;
  previousRange: EpisodePeriod | null;
};
function dateRange(episodes: Episode[]): EpisodePeriod | null {
  return episodes.length
    ? { start: episodes[episodes.length - 1].day, end: episodes[0].day }
    : null;
}
export function radarComparison(episodes: Episode[]): RadarAxis[] {
  const sorted = episodes.filter((e) => e.schemaVersion === 2).sort(byNewest);
  const latest = sorted.slice(0, 5);
  const preceding = sorted.slice(5, 10);
  const recent = axisAverages(latest);
  const previous = axisAverages(preceding);
  return AXES.map(({ id, label }) => {
    // Conservative product rule, not a significance test: two full groups of
    // five entries, with at least three explicit answers per axis in each group.
    const comparable =
      sorted.length >= 10 && recent[id].n >= 3 && previous[id].n >= 3;
    const mean = recent[id].mean;
    const baseline = comparable ? previous[id].mean : null;
    return {
      axis: id,
      label,
      recent: mean,
      previous: baseline,
      delta: mean !== null && baseline !== null ? mean - baseline : null,
      recentN: recent[id].n,
      previousN: previous[id].n,
      recentRange: dateRange(latest),
      previousRange: comparable ? dateRange(preceding) : null,
    };
  });
}

/**
 * Which day of practice `today` is: 1 on the first logged day, counting inclusive
 * calendar days from the earliest logged episode. Returns 1 when nothing is logged.
 */
export function dayNumber(
  episodes: readonly Pick<EpisodeActivity, "day">[],
  today: string = todayId(),
): number {
  if (episodes.length === 0) return 1;
  let earliest = episodes[0].day;
  for (const e of episodes) {
    if (e.day < earliest) earliest = e.day;
  }
  return Math.max(1, daysBetween(today, earliest) + 1);
}
