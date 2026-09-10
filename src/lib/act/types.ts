import type {
  AxisKey,
  DomainId,
  HookType,
  SkillId,
  StateId,
} from "@/lib/act/constants";

export type EpisodeDir = "toward" | "away" | "mixed" | "unknown";
export type BehaviorStatus = "acted" | "planned" | "not-described";
export type ConsequenceStatus = "observed" | "expected" | "unknown";
export type PatternSelection = StateId | "unknown" | "none-noticed";
export type SkillSelection = SkillId | "unknown" | "no-skill";
export type EpisodePeriod = { start?: string; end?: string };

/**
 * One personal value, shaped like a row of `personal_values` with camelCase keys.
 * `archivedAt` is null while the value is active. Values are never scored.
 */
export type PersonalValue = {
  id: string;
  userId: string;
  title: string;
  domains: DomainId[];
  meaning: string;
  examples: string[];
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * A value frozen at the moment it was attached to a morning entry or an episode.
 * Historical surfaces render from this, so editing or archiving the underlying
 * value never rewrites what a past day recorded.
 */
export type PersonalValueSnapshot = {
  valueId: string;
  title: string;
  meaning: string;
  domains: DomainId[];
};

/** The five flexibility-check axes, each optionally answered 0, 1 or 2; null means unrated. */
export type Checks = Partial<Record<AxisKey, 0 | 1 | 2 | null>>;

/**
 * One logged episode, shaped like a row of the `episodes` table with camelCase
 * keys. `band` is the smallint index 0–7; the display string lives in `BANDS`.
 */
export type Episode = {
  id: string;
  userId: string;
  day: string; // YYYY-MM-DD
  band: number; // 0..7 index into BANDS
  dir: EpisodeDir;
  behaviorStatus: BehaviorStatus;
  consequenceStatus: ConsequenceStatus;
  immediateOutcome: string;
  laterConsequences: string;
  intendedFunction: string;
  nextExperiment: string;
  interpretation: string;
  schemaVersion: 1 | 2;
  states: PatternSelection[];
  skills: SkillSelection[];
  eventTimezone: string | null;
  /** Original row frozen on explicit clarification, never rewritten afterward. */
  legacySnapshot: Record<string, unknown> | null;
  weight: number; // 1..3
  hook: string;
  hookType: HookType | null;
  situation: string;
  state: StateId | null;
  skill: SkillId | null;
  value: string;
  move: string;
  workable: string;
  checks: Checks;
  /** Live link to the value, kept alongside the snapshot for suggestions. */
  valueId?: string | null;
  valueSnapshot?: PersonalValueSnapshot | null;
  createdAt: string;
  updatedAt: string;
};

/** Minimal episode projection used by shell-level recording summaries. */
export type EpisodeActivity = Pick<
  Episode,
  "day" | "dir" | "behaviorStatus" | "schemaVersion"
>;

export type DayMorning = {
  open?: string;
  aware?: string;
  engaged?: string;
  toward?: string;
  /** Live link to the value, kept alongside the snapshot for suggestions. */
  valueId?: string | null;
  valueSnapshot?: PersonalValueSnapshot | null;
};

export type DayEvening = {
  hook?: string;
  away?: string;
  flex?: string;
  next?: string;
};

/** One row of `day_entries` with camelCase keys. */
export type DayEntry = {
  userId: string;
  day: string; // YYYY-MM-DD
  morning: DayMorning;
  evening: DayEvening;
};

/** Episode-list filters (Episodes view). `"all"` means the facet is unfiltered. */
export type EpisodeFilters = {
  dir?: EpisodeDir | "all";
  hookType?: HookType | "all";
  state?: StateId | "all";
  skill?: SkillId | "all";
  band?: number | "all";
  /** Matches against the linked value's stored domains, never a live record. */
  domain?: DomainId | "all";
  text?: string;
};
