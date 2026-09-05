/**
 * Pure derivations over a list of episodes. Everything shown in Journal and
 * Progress is computed here at read time — there are no stored aggregates or
 * counters. All functions are side-effect free and order-independent unless noted.
 */
import {
  AXES,
  type AxisKey,
  BANDS,
  HOOK_GROUPS,
  SKILLS,
  type SkillId,
  STATES,
  type StateId,
} from "@/lib/act/constants";
import { daysBetween, shiftId, todayId } from "@/lib/act/date";
import type {
  Checks,
  Episode,
  EpisodeActivity,
  EpisodeFilters,
} from "@/lib/act/types";

/** Lowercases and strips diacritics for case/diacritic-insensitive matching. */
export function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Sum of the five flexibility-check axes, 0–10. */
export function checksTotal(checks: Checks | null | undefined): number {
  if (!checks) return 0;
  return AXES.reduce((sum, axis) => sum + (checks[axis.id] ?? 0), 0);
}

export type DirCounts = { toward: number; away: number; total: number };

/** Toward/away/total counts for a single day. */
export function dayCounts(episodes: Episode[], day: string): DirCounts {
  return splitCounts(episodes.filter((e) => e.day === day));
}

/** Toward/away/total counts over the whole list. */
export function towardAwaySplit(episodes: Episode[]): DirCounts {
  return splitCounts(episodes);
}

function splitCounts(list: Episode[]): DirCounts {
  const toward = list.filter((e) => e.dir === "toward").length;
  return { toward, away: list.length - toward, total: list.length };
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
    filters.state &&
    filters.state !== "all" &&
    episode.state !== filters.state
  ) {
    return false;
  }
  if (
    filters.skill &&
    filters.skill !== "all" &&
    episode.skill !== filters.skill
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
  const query = normalizeText(filters.text).trim();
  if (query) {
    const haystacks = [episode.hook, episode.move, episode.value];
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
      hasAway: inBand.some((e) => e.dir === "away"),
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
    const count = episodes.filter((e) => e.state === state.id).length;
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
    const count = episodes.filter((e) => e.state === state.id).length;
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
    const count = episodes.filter((e) => e.skill === skill.id).length;
    return {
      id: skill.id,
      label: skill.label,
      count,
      share: share(count, total),
    };
  });
}

/** Labels of skills not used at all in the set. */
export function unusedSkills(episodes: Episode[]): string[] {
  return skillTallies(episodes)
    .filter((s) => s.count === 0)
    .map((s) => s.label);
}

export type HookTally = {
  label: string;
  type: string;
  count: number;
  share: number;
};

/** Recurring-hook groups with at least one match, sorted most-frequent first. */
export function hookGroupTallies(episodes: Episode[]): HookTally[] {
  const total = episodes.length;
  return HOOK_GROUPS.map((group) => {
    const count = episodes.filter((e) =>
      group.match.some((needle) =>
        normalizeText(e.hook).includes(normalizeText(needle)),
      ),
    ).length;
    return {
      label: group.label,
      type: group.type,
      count,
      share: share(count, total),
    };
  })
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count);
}

// --- Radar (recent 5 vs previous 5) ---------------------------------------

/** Average score (0–2) per axis across a set of episodes. */
export function axisAverages(episodes: Episode[]): Record<AxisKey, number> {
  const result = {} as Record<AxisKey, number>;
  for (const axis of AXES) {
    const sum = episodes.reduce((acc, e) => acc + (e.checks[axis.id] ?? 0), 0);
    result[axis.id] = episodes.length ? sum / episodes.length : 0;
  }
  return result;
}

/** Newest-first order by day then creation time. */
function byNewest(a: Episode, b: Episode): number {
  if (a.day !== b.day) return a.day < b.day ? 1 : -1;
  return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
}

export type RadarAxis = {
  axis: AxisKey;
  label: string;
  recent: number; // 0–2
  previous: number; // 0–2
  delta: number; // recent − previous
};

/**
 * Compares the average axis scores of the most recent five episodes against the
 * five before them.
 */
export function radarComparison(episodes: Episode[]): RadarAxis[] {
  const sorted = [...episodes].sort(byNewest);
  const recent = axisAverages(sorted.slice(0, 5));
  const previous = axisAverages(sorted.slice(5, 10));
  return AXES.map((axis) => ({
    axis: axis.id,
    label: axis.label,
    recent: recent[axis.id],
    previous: previous[axis.id],
    delta: recent[axis.id] - previous[axis.id],
  }));
}

// --- Streak & day number ---------------------------------------------------

/**
 * Consecutive days ending at `today` that each hold at least one toward move.
 * The current day gets grace: if `today` has no toward move yet, counting starts
 * from the day before, so an unfinished today does not zero an existing streak.
 */
export function towardStreak(
  episodes: readonly EpisodeActivity[],
  today: string = todayId(),
): number {
  const towardDays = new Set(
    episodes.filter((e) => e.dir === "toward").map((e) => e.day),
  );
  let cursor = towardDays.has(today) ? today : shiftId(today, -1);
  let streak = 0;
  while (towardDays.has(cursor)) {
    streak += 1;
    cursor = shiftId(cursor, -1);
  }
  return streak;
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
